import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { RegisterDto } from './dto/register.dto';
import { MailService } from '../mail/mail.service';
import { AUTH_ERRORS } from '../../../common/constants';
import { hashToken } from '../../../common/utils';

type SafeUser = {
  id: number;
  email: string;
  role: string;
  name: string;
  studentId: string | null;
  username: string | null;
  validUntil: Date | null;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async sendVerificationOtp(userId: number) {
    const user = await this.authRepository.findUserById(userId);
    if (!user) throw new UnauthorizedException('ไม่พบผู้ใช้งาน');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.authRepository.updateUser(userId, { verificationOtp: otp, verificationOtpExpiresAt: expiresAt });

    await this.mailService.sendVerificationOtp(user.email, otp);
    this.logger.log(`Verification OTP requested for: ${user.email}`);

    return { message: 'ส่งรหัส OTP ไปยังอีเมลแล้ว' };
  }

  async verifyOtp(userId: number, otp: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user) throw new UnauthorizedException('ไม่พบผู้ใช้งาน');

    if (!user.verificationOtp || user.verificationOtp !== otp) {
      throw new UnauthorizedException('รหัส OTP ไม่ถูกต้อง');
    }

    if (!user.verificationOtpExpiresAt || user.verificationOtpExpiresAt < new Date()) {
      throw new UnauthorizedException('รหัส OTP หมดอายุแล้ว โปรดขอรหัสใหม่');
    }

    await this.authRepository.updateUser(userId, { verificationOtp: null, verificationOtpExpiresAt: null });

    this.logger.log(`User ${user.email} successfully verified OTP`);
    return { message: 'ยืนยันรหัส OTP สำเร็จ' };
  }

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.trim().toLowerCase();

    const existingUser = await this.authRepository.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    const user = await this.authRepository.createUser({
      name: registerDto.name,
      email,
      password: hashedPassword,
      studentId: registerDto.studentId || null,
      role: 'student',
    });

    this.logger.log(`New user registered: ${user.email} (${user.role})`);
    return this.generateAuthResponse(user);
  }

  async login(loginDto: LoginDto) {
    const identifier = loginDto.identifier.trim();
    const isEmailFormat = identifier.includes('@');

    const user = isEmailFormat
      ? await this.authRepository.findUserByEmail(identifier.toLowerCase())
      : await this.authRepository.findUserByUsername(identifier);

    const expectedRole = isEmailFormat ? 'student' : 'organizer';
    const invalidMessage = isEmailFormat ? AUTH_ERRORS.STUDENT_INVALID : AUTH_ERRORS.ORGANIZER_INVALID;

    if (!user || user.role !== expectedRole) {
      throw new UnauthorizedException(invalidMessage);
    }

    if (user.role === 'organizer' && user.validUntil && user.validUntil < new Date()) {
      throw new UnauthorizedException(AUTH_ERRORS.ORGANIZER_EXPIRED);
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(invalidMessage);
    }

    if (user.isBlocked) {
      throw new UnauthorizedException(AUTH_ERRORS.ACCOUNT_BLOCKED);
    }

    this.logger.log(`User logged in: ${user.email} (${user.role})`);
    return this.generateAuthResponse(user);
  }

  async adminLogin(dto: AdminLoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.authRepository.findUserByEmail(email);

    if (!user || user.role !== 'admin') {
      throw new UnauthorizedException(AUTH_ERRORS.ADMIN_INVALID);
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(AUTH_ERRORS.ADMIN_INVALID);
    }

    if (user.isBlocked) {
      throw new UnauthorizedException(AUTH_ERRORS.ADMIN_INVALID);
    }

    this.logger.log(`Admin logged in: ${user.email}`);
    return this.generateAuthResponse(user);
  }

  async getAdminInviteInfo(token: string) {
    const invite = await this.authRepository.findAdminInviteByTokenHash(hashToken(token));

    if (!invite || invite.status !== 'pending' || invite.expiresAt < new Date()) {
      throw new NotFoundException('ลิงก์คำเชิญไม่ถูกต้องหรือหมดอายุแล้ว');
    }

    return { email: invite.email, expiresAt: invite.expiresAt };
  }

  async acceptAdminInvite(token: string, password: string) {
    const tokenHash = hashToken(token);
    const invite = await this.authRepository.findAdminInviteByTokenHash(tokenHash);

    if (!invite || invite.status !== 'pending' || invite.expiresAt < new Date()) {
      throw new NotFoundException('ลิงก์คำเชิญไม่ถูกต้องหรือหมดอายุแล้ว');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    try {
      await this.authRepository.acceptAdminInvite(invite.id, invite.email, hashedPassword);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('คำเชิญนี้ถูกใช้งานไปแล้ว');
      }
      throw error;
    }

    this.logger.log(`Admin invite accepted: ${invite.email}`);
    return { message: 'ตั้งรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบ' };
  }

  async getProfile(userId: number) {
    const user = await this.authRepository.findProfileById(userId);

    if (!user) {
      throw new UnauthorizedException('ไม่พบผู้ใช้งาน');
    }

    return user;
  }

  private generateAuthResponse(user: SafeUser) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        username: user.username,
        validUntil: user.validUntil,
      },
    };
  }
}
