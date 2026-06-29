import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async sendVerificationOtp(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('ไม่พบผู้ใช้งาน');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.prisma.user.update({
      where: { id: userId },
      data: { verificationOtp: otp, verificationOtpExpiresAt: expiresAt },
    });

    await this.mailService.sendVerificationOtp(user.email, otp);
    this.logger.log(`Verification OTP requested for: ${user.email}`);

    return { message: 'ส่งรหัส OTP ไปยังอีเมลแล้ว' };
  }

  async verifyOtp(userId: number, otp: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('ไม่พบผู้ใช้งาน');

    if (!user.verificationOtp || user.verificationOtp !== otp) {
      throw new UnauthorizedException('รหัส OTP ไม่ถูกต้อง');
    }

    if (!user.verificationOtpExpiresAt || user.verificationOtpExpiresAt < new Date()) {
      throw new UnauthorizedException('รหัส OTP หมดอายุแล้ว โปรดขอรหัสใหม่');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { verificationOtp: null, verificationOtpExpiresAt: null },
    });

    this.logger.log(`User ${user.email} successfully verified OTP`);
    return { message: 'ยืนยันรหัส OTP สำเร็จ' };
  }

  async register(registerDto: RegisterDto) {
    const { email, password, name, studentId, role, googleId } = registerDto;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        studentId: studentId || null,
        role: role as any,
        googleId: googleId || null,
      },
    });

    this.logger.log(`New user registered: ${user.email} (${user.role})`);
    return this.generateAuthResponse(user);
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'บัญชีนี้ลงทะเบียนด้วย Google กรุณาเข้าสู่ระบบด้วย Google',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    this.logger.log(`User logged in: ${user.email}`);
    return this.generateAuthResponse(user);
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studentId: true,
        googleId: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('ไม่พบผู้ใช้งาน');
    }

    return user;
  }

  private generateAuthResponse(user: { id: number; email: string; role: string; name: string; studentId: string | null }) {
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
      },
    };
  }
}
