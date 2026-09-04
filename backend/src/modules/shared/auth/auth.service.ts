import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { randomInt, timingSafeEqual } from "crypto";
import { AuthRepository } from "./auth.repository";
import { LoginDto } from "./dto/login.dto";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { RegisterDto } from "./dto/register.dto";
import { MailService } from "../mail/mail.service";
import { AUTH_ERRORS, EducationLevelCode } from "../../../common/constants";
import { hashToken, validateAcademicInfo } from "../../../common/utils";

type SafeUser = {
  id: number;
  email: string;
  role: string;
  name: string;
  studentId: string | null;
  username: string | null;
  validUntil: Date | null;
  phone?: string | null;
  educationLevel?: EducationLevelCode | null;
  program?: string | null;
};

/** จำนวนครั้งที่ยอมให้กรอก OTP ผิดก่อนเผารหัสทิ้ง */
const MAX_OTP_ATTEMPTS = 5;

/**
 * bcrypt hash ของค่าที่ไม่มีใครรู้ ใช้เผาเวลาให้เท่ากันตอนไม่พบบัญชี
 * (A07: กัน user enumeration จากการจับเวลา response)
 */
const DUMMY_HASH =
  "$2a$12$C6UzMDM.H6dfI/f/IKcEe.iBqNOxdN4hMBFQZBBhqLGGWOSXqbPCu";

/** เทียบสตริงแบบไม่รั่วเวลา — ป้องกันการไล่เดา OTP ทีละหลักจากเวลาที่ใช้เปรียบเทียบ */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

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
    if (!user) throw new UnauthorizedException("ไม่พบผู้ใช้งาน");

    // A04 Cryptographic Failures: Math.random() ไม่ใช่ตัวสุ่มเชิงรหัสลับ
    // ค่าที่ออกมาคาดเดาได้จากสถานะภายในของ engine — OTP ที่เดาได้ = ยืนยันตัวตนแทนคนอื่นได้
    // randomInt ของ node ใช้ CSPRNG จริง
    const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.authRepository.updateUser(userId, {
      verificationOtp: otp,
      verificationOtpExpiresAt: expiresAt,
      verificationOtpAttempts: 0,
    });

    await this.mailService.sendVerificationOtp(user.email, otp);
    this.logger.log(`Verification OTP requested for: ${user.email}`);

    return { message: "ส่งรหัส OTP ไปยังอีเมลแล้ว" };
  }

  async verifyOtp(userId: number, otp: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user) throw new UnauthorizedException("ไม่พบผู้ใช้งาน");

    if (!user.verificationOtp) {
      throw new UnauthorizedException("รหัส OTP ไม่ถูกต้อง");
    }

    // เช็ควันหมดอายุก่อนนับ attempt — OTP ที่หมดอายุแล้วไม่ควรกินโควตาการลอง
    if (
      !user.verificationOtpExpiresAt ||
      user.verificationOtpExpiresAt < new Date()
    ) {
      throw new UnauthorizedException("รหัส OTP หมดอายุแล้ว โปรดขอรหัสใหม่");
    }

    if (!safeEqual(user.verificationOtp, otp)) {
      const attempts = (user.verificationOtpAttempts ?? 0) + 1;

      if (attempts >= MAX_OTP_ATTEMPTS) {
        // เผา OTP ทิ้งเมื่อผิดครบเพดาน — ผู้โจมตีต้องเริ่มใหม่ทุกรอบ
        // ทำให้การไล่เดารหัส 6 หลักไม่คุ้มค่าอีกต่อไป
        await this.authRepository.updateUser(userId, {
          verificationOtp: null,
          verificationOtpExpiresAt: null,
          verificationOtpAttempts: 0,
        });
        this.logger.warn(
          `OTP attempts exceeded for user id=${userId} — รหัสถูกยกเลิก`,
        );
        throw new UnauthorizedException(
          "กรอกรหัส OTP ผิดเกินกำหนด รหัสถูกยกเลิกแล้ว โปรดขอรหัสใหม่",
        );
      }

      await this.authRepository.updateUser(userId, {
        verificationOtpAttempts: attempts,
      });
      throw new UnauthorizedException("รหัส OTP ไม่ถูกต้อง");
    }

    await this.authRepository.updateUser(userId, {
      verificationOtp: null,
      verificationOtpExpiresAt: null,
      verificationOtpAttempts: 0,
    });

    this.logger.log(`User ${user.email} successfully verified OTP`);
    return { message: "ยืนยันรหัส OTP สำเร็จ" };
  }

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.trim().toLowerCase();

    const existingUser = await this.authRepository.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictException("อีเมลนี้ถูกใช้งานแล้ว");
    }

    // program ต้องอยู่ในระดับการศึกษาที่เลือก — ตรวจข้ามฟิลด์ที่นี่
    validateAcademicInfo(registerDto);

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    const user = await this.authRepository.createUser({
      name: registerDto.name,
      email,
      password: hashedPassword,
      studentId: registerDto.studentId || null,
      phone: registerDto.phone,
      educationLevel: registerDto.educationLevel,
      program: registerDto.program,
      role: "student",
    });

    this.logger.log(`New user registered: ${user.email} (${user.role})`);
    return this.generateAuthResponse(user);
  }

  async login(loginDto: LoginDto) {
    const identifier = loginDto.identifier.trim();
    const isEmailFormat = identifier.includes("@");

    const user = isEmailFormat
      ? await this.authRepository.findUserByEmail(identifier.toLowerCase())
      : await this.authRepository.findUserByUsername(identifier);

    const expectedRole = isEmailFormat ? "student" : "organizer";
    const invalidMessage = isEmailFormat
      ? AUTH_ERRORS.STUDENT_INVALID
      : AUTH_ERRORS.ORGANIZER_INVALID;

    if (!user || user.role !== expectedRole) {
      // เทียบกับ hash หลอกให้เสียเวลาเท่ากับเคสที่มีบัญชีจริง ไม่งั้นผู้โจมตีจับเวลา
      // response แล้วแยกออกว่า "อีเมลนี้มีในระบบ" — ได้รายชื่อนักศึกษาไปฟรี ๆ
      await bcrypt.compare(loginDto.password, DUMMY_HASH);
      this.logger.warn(
        `Failed login attempt for unknown identifier (${isEmailFormat ? "email" : "username"})`,
      );
      throw new UnauthorizedException(invalidMessage);
    }

    if (
      user.role === "organizer" &&
      user.validUntil &&
      user.validUntil < new Date()
    ) {
      throw new UnauthorizedException(AUTH_ERRORS.ORGANIZER_EXPIRED);
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      // A09 Security Logging — บันทึกความพยายามที่ล้มเหลวไว้ให้ตรวจย้อนหลังได้
      // ใช้ id ไม่ใช่อีเมล เพื่อไม่ให้ log กลายเป็นแหล่งข้อมูลส่วนบุคคล
      this.logger.warn(
        `Failed login attempt for user id=${user.id} (${user.role})`,
      );
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

    if (!user || user.role !== "admin") {
      await bcrypt.compare(dto.password, DUMMY_HASH);
      this.logger.warn(
        "Failed admin login attempt for unknown or non-admin account",
      );
      throw new UnauthorizedException(AUTH_ERRORS.ADMIN_INVALID);
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Failed admin login attempt for user id=${user.id}`);
      throw new UnauthorizedException(AUTH_ERRORS.ADMIN_INVALID);
    }

    if (user.isBlocked) {
      throw new UnauthorizedException(AUTH_ERRORS.ADMIN_INVALID);
    }

    this.logger.log(`Admin logged in: ${user.email}`);
    return this.generateAuthResponse(user);
  }

  async getAdminInviteInfo(token: string) {
    const invite = await this.authRepository.findAdminInviteByTokenHash(
      hashToken(token),
    );

    if (
      !invite ||
      invite.status !== "pending" ||
      invite.expiresAt < new Date()
    ) {
      throw new NotFoundException("ลิงก์คำเชิญไม่ถูกต้องหรือหมดอายุแล้ว");
    }

    return { email: invite.email, expiresAt: invite.expiresAt };
  }

  async acceptAdminInvite(token: string, password: string) {
    const tokenHash = hashToken(token);
    const invite =
      await this.authRepository.findAdminInviteByTokenHash(tokenHash);

    if (
      !invite ||
      invite.status !== "pending" ||
      invite.expiresAt < new Date()
    ) {
      throw new NotFoundException("ลิงก์คำเชิญไม่ถูกต้องหรือหมดอายุแล้ว");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    try {
      await this.authRepository.acceptAdminInvite(
        invite.id,
        invite.email,
        hashedPassword,
      );
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new ConflictException("คำเชิญนี้ถูกใช้งานไปแล้ว");
      }
      throw error;
    }

    this.logger.log(`Admin invite accepted: ${invite.email}`);
    return { message: "ตั้งรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบ" };
  }

  async getProfile(userId: number) {
    const user = await this.authRepository.findProfileById(userId);

    if (!user) {
      throw new UnauthorizedException("ไม่พบผู้ใช้งาน");
    }

    return user;
  }

  private generateAuthResponse(user: SafeUser) {
    const payload = { sub: user.id, email: user.email, role: user.role };

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
        phone: user.phone ?? null,
        educationLevel: user.educationLevel ?? null,
        program: user.program ?? null,
      },
    };
  }
}
