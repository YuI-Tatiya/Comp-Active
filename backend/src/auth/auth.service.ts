import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  /**
   * ส่ง OTP สำหรับยืนยันตัวตนไปทางอีเมล
   */
  async sendVerificationOtp(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('ไม่พบผู้ใช้งาน');

    // สร้าง OTP 6 หลัก
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // อายุ 15 นาที

    user.verificationOtp = otp;
    user.verificationOtpExpiresAt = expiresAt;
    await this.userRepository.save(user);

    await this.mailService.sendVerificationOtp(user.email, otp);
    this.logger.log(`Verification OTP requested for: ${user.email}`);

    return { message: 'ส่งรหัส OTP ไปยังอีเมลแล้ว' };
  }

  /**
   * ตรวจสอบความถูกต้องของ OTP
   */
  async verifyOtp(userId: number, otp: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('ไม่พบผู้ใช้งาน');

    if (!user.verificationOtp || user.verificationOtp !== otp) {
      throw new UnauthorizedException('รหัส OTP ไม่ถูกต้อง');
    }

    if (!user.verificationOtpExpiresAt || user.verificationOtpExpiresAt < new Date()) {
      throw new UnauthorizedException('รหัส OTP หมดอายุแล้ว โปรดขอรหัสใหม่');
    }

    // Clear OTP หลังจากใช้เสร็จ
    user.verificationOtp = null;
    user.verificationOtpExpiresAt = null;
    await this.userRepository.save(user);

    this.logger.log(`User ${user.email} successfully verified OTP`);

    return { message: 'ยืนยันรหัส OTP สำเร็จ' };
  }

  /**
   * สมัครสมาชิก (Register)
   */
  async register(registerDto: RegisterDto) {
    const { email, password, name, studentId, role, googleId } = registerDto;

    // ตรวจสอบว่า email ซ้ำหรือไม่
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // สร้างผู้ใช้ใหม่
    const user = this.userRepository.create({
      name,
      email,
      password: hashedPassword,
      studentId: studentId || null,
      role,
      googleId: googleId || null,
    });

    const savedUser = await this.userRepository.save(user);
    this.logger.log(`New user registered: ${savedUser.email} (${savedUser.role})`);

    return this.generateAuthResponse(savedUser);
  }

  /**
   * เข้าสู่ระบบ (Login) ด้วย email/password
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email },
    });

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

  /**
   * จัดการ Google OAuth callback
   * - ถ้ามี email ในระบบแล้ว → login ได้เลย
   * - ถ้ายังไม่มี → ส่งข้อมูล Google กลับไปให้ frontend ทำ register
   */
  async handleGoogleLogin(googleUser: {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
  }) {
    // ตรวจสอบว่า email มีในระบบหรือไม่
    const existingUser = await this.userRepository.findOne({
      where: { email: googleUser.email },
    });

    if (existingUser) {
      // อัพเดท google_id ถ้ายังไม่มี
      if (!existingUser.googleId) {
        existingUser.googleId = googleUser.googleId;
        await this.userRepository.save(existingUser);
      }

      this.logger.log(`Google login: ${existingUser.email}`);
      return {
        isRegistered: true,
        ...this.generateAuthResponse(existingUser),
      };
    }

    // ยังไม่ได้สมัคร → ส่งข้อมูลกลับให้ frontend
    this.logger.log(`Google user not registered: ${googleUser.email}`);
    return {
      isRegistered: false,
      googleData: {
        googleId: googleUser.googleId,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
      },
    };
  }

  /**
   * ดึงข้อมูล profile ปัจจุบัน
   */
  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'name', 'email', 'role', 'studentId', 'googleId', 'createdAt'],
    });

    if (!user) {
      throw new UnauthorizedException('ไม่พบผู้ใช้งาน');
    }

    return user;
  }

  /**
   * สร้าง JWT token + response
   */
  private generateAuthResponse(user: User) {
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
