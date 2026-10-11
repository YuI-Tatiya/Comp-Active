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

type OtpHolder = {
  id: number;
  verificationOtp: string | null;
  verificationOtpExpiresAt: Date | null;
  verificationOtpAttempts: number;
};

/** จำนวนครั้งที่ยอมให้กรอก OTP ผิดก่อนเผารหัสทิ้ง */
const MAX_OTP_ATTEMPTS = 5;

/**
 * bcrypt hash ของค่าที่ไม่มีใครรู้ ใช้เผาเวลาให้เท่ากันตอนไม่พบบัญชี
 * (A07: กัน user enumeration จากการจับเวลา response)
 */
const DUMMY_HASH =
  "$2a$12$C6UzMDM.H6dfI/f/IKcEe.iBqNOxdN4hMBFQZBBhqLGGWOSXqbPCu";

/** ข้อความเดียวกันทั้ง "ไม่พบอีเมล" และ "ยืนยันไปแล้ว" — ไม่บอกว่าอีเมลไหนเป็นบัญชีที่ใช้งานอยู่ */
const NO_PENDING_REGISTRATION =
  "ไม่พบคำขอสมัครที่รอยืนยันของอีเมลนี้ หากยืนยันไปแล้วให้เข้าสู่ระบบได้เลย";
const REGISTRATION_PASSWORD_MISMATCH =
  "รหัสผ่านไม่ตรงกับที่ใช้สมัครครั้งล่าสุดด้วยอีเมลนี้ หากจำไม่ได้หรือไม่ได้สมัครซ้ำเอง กรุณาสมัครใหม่อีกครั้ง";
const REGISTRATION_CHANGED =
  "คำขอสมัครของอีเมลนี้เปลี่ยนไประหว่างยืนยัน กรุณาสมัครใหม่อีกครั้ง";

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

  /** สุ่ม OTP 6 หลักใหม่ + ตั้งอายุ 15 นาที + เคลียร์ตัวนับครั้งผิดทิ้ง แล้วบันทึกลง user แถวนั้น — ใช้ร่วมกันทั้ง flow สมัครสมาชิกและ flow ยืนยันตัวตนหลังล็อกอิน
   *
   * A04 Cryptographic Failures: Math.random() ไม่ใช่ตัวสุ่มเชิงรหัสลับ ค่าที่ออกมาคาดเดาได้จากสถานะภายในของ engine
   * — OTP ที่เดาได้ = ยืนยันตัวตนแทนคนอื่นได้ randomInt ของ node ใช้ CSPRNG จริง
   */
  private async issueOtp(userId: number): Promise<string> {
    const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.authRepository.updateUser(userId, {
      verificationOtp: otp,
      verificationOtpExpiresAt: expiresAt,
      verificationOtpAttempts: 0,
    });

    return otp;
  }

  /**
   * ตรวจ OTP ที่กรอกกับที่เก็บไว้บนแถว user — throw ถ้าไม่ผ่าน (ไม่ตรง/หมดอายุ/เกินโควตา) แต่ผ่านแล้วยังไม่ล้างรหัสทิ้ง
   * ผู้เรียกล้างเองเมื่อทำงานต่อสำเร็จ: consumeOtp (flow ที่ล็อกอินแล้ว) หรือ markRegistrationVerified (flow สมัคร
   * ที่ยังต้องเช็ครหัสผ่านต่อ — พิมพ์รหัสผ่านผิดไม่ควรทำให้ OTP ที่ถูกต้องใช้ไม่ได้)
   * รับ user ที่ query มาแล้วตรงๆ แทนที่จะ query ซ้ำในนี้ เพราะผู้เรียกแต่ละฝั่ง query ด้วยคนละ key (id/email)
   */
  private async assertOtp(user: OtpHolder, otp: string): Promise<void> {
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
        await this.authRepository.updateUser(user.id, {
          verificationOtp: null,
          verificationOtpExpiresAt: null,
          verificationOtpAttempts: 0,
        });
        this.logger.warn(
          `OTP attempts exceeded for user id=${user.id} — รหัสถูกยกเลิก`,
        );
        throw new UnauthorizedException(
          "กรอกรหัส OTP ผิดเกินกำหนด รหัสถูกยกเลิกแล้ว โปรดขอรหัสใหม่",
        );
      }

      await this.authRepository.updateUser(user.id, {
        verificationOtpAttempts: attempts,
      });
      throw new UnauthorizedException("รหัส OTP ไม่ถูกต้อง");
    }
  }

  /** assertOtp แล้วล้างรหัสทิ้งทันที — OTP ใช้ได้ครั้งเดียว */
  private async consumeOtp(user: OtpHolder, otp: string): Promise<void> {
    await this.assertOtp(user, otp);
    await this.authRepository.updateUser(user.id, {
      verificationOtp: null,
      verificationOtpExpiresAt: null,
      verificationOtpAttempts: 0,
    });
  }

  async sendVerificationOtp(userId: number) {
    const user = await this.authRepository.findUserById(userId);
    if (!user) throw new UnauthorizedException("ไม่พบผู้ใช้งาน");

    const otp = await this.issueOtp(userId);
    await this.mailService.sendVerificationOtp(user.email, otp);
    this.logger.log(`Verification OTP requested for: ${user.email}`);

    return { message: "ส่งรหัส OTP ไปยังอีเมลแล้ว" };
  }

  async verifyOtp(userId: number, otp: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user) throw new UnauthorizedException("ไม่พบผู้ใช้งาน");

    await this.consumeOtp(user, otp);

    this.logger.log(`User ${user.email} successfully verified OTP`);
    return { message: "ยืนยันรหัส OTP สำเร็จ" };
  }

  /**
   * สมัครสมาชิก (นักศึกษา) — ยังไม่ออก session: สร้างแถวเป็น isVerified:false แล้วส่ง OTP ไปอีเมล
   * การสมัครนับว่าสำเร็จเมื่อ verifyRegistrationOtp ผ่านเท่านั้น
   */
  async register(registerDto: RegisterDto) {
    const email = registerDto.email.trim().toLowerCase();

    const existingUser = await this.authRepository.findUserByEmail(email);
    // มีอยู่แล้วและยืนยันแล้วจริง = ชนกันแน่นอน ปฏิเสธตามเดิม
    if (existingUser && existingUser.isVerified) {
      throw new ConflictException("อีเมลนี้ถูกใช้งานแล้ว");
    }

    // program ต้องอยู่ในระดับการศึกษาที่เลือก — ตรวจข้ามฟิลด์ที่นี่
    validateAcademicInfo(registerDto);

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    const data = {
      name: registerDto.name,
      email,
      password: hashedPassword,
      studentId: registerDto.studentId || null,
      phone: registerDto.phone,
      educationLevel: registerDto.educationLevel,
      program: registerDto.program,
      role: "student",
      isVerified: false,
    };

    // อีเมลนี้เคยสมัครค้างไว้แต่ไม่เคยยืนยัน (พิมพ์อีเมลตัวเองผิด/ไม่ได้รับเมล/เปลี่ยนใจกรอกใหม่) —
    // เขียนทับแถวเดิมแทนที่จะชน unique constraint ไม่งั้นอีเมลที่ "สมัครค้างไว้" แบบนี้จะกันคนจริง
    // สมัครซ้ำไม่ได้ตลอดไป (ไม่มีใครมาล้างแถวที่ไม่เคยยืนยันทิ้งเอง) การทับนี้ไม่เป็นช่องยึดบัญชี เพราะ
    // verifyRegistrationOtp ต้องใช้รหัสผ่านของคำขอล่าสุดคู่กับ OTP เสมอ
    // ทับเฉพาะเมื่อแถวยังไม่ยืนยัน ณ ตอนเขียน — bcrypt.hash ข้างบนกินเวลา ถ้าเจ้าของยืนยันเสร็จระหว่างนั้นได้ null
    const user = existingUser
      ? await this.authRepository.overwritePendingRegistration(
          existingUser.id,
          data,
        )
      : await this.authRepository.createUser(data);
    if (!user) {
      throw new ConflictException("อีเมลนี้ถูกใช้งานแล้ว");
    }

    const otp = await this.issueOtp(user.id);
    await this.mailService.sendRegistrationOtp(user.email, user.name, otp);

    this.logger.log(`Registration pending verification: user id=${user.id}`);
    return { pendingVerification: true as const, email: user.email };
  }

  /**
   * ยืนยันการสมัคร แล้วออก session ให้ทันที — ต้องพิสูจน์ครบทั้ง 2 อย่าง:
   * OTP (เข้ากล่องเมลนั้นได้จริง) และรหัสผ่าน (เป็นคนเดียวกับที่ตั้งรหัสผ่านบนคำขอนี้)
   *
   * รหัสผ่านจำเป็นเพราะ register() เขียนทับคำขอที่ยังไม่ยืนยันได้: ถ้าเช็คแค่ OTP คนที่รู้อีเมลเหยื่อ
   * สมัครทับด้วยรหัสผ่านของตัวเองระหว่างที่เหยื่อรอเมล แล้วเหยื่อกรอก OTP ฉบับล่าสุด = บัญชีถูกยืนยัน
   * ด้วยรหัสผ่านของผู้โจมตี บัญชีที่ยืนยันแล้วไม่มีทางผ่าน endpoint นี้ — ไม่มี session นำหน้า
   * ถ้าปล่อยผ่านก็เท่ากับล็อกอินด้วยอีเมลอย่างเดียว
   */
  async verifyRegistrationOtp(email: string, otp: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.authRepository.findUserByEmail(normalizedEmail);

    if (!user || user.isVerified) {
      throw new UnauthorizedException(NO_PENDING_REGISTRATION);
    }

    await this.assertOtp(user, otp);

    // ถึงตรงนี้ OTP ถูกแล้ว (เข้ากล่องเมลได้) จึงบอกตรงๆ ว่ารหัสผ่านไม่ตรงได้โดยไม่เป็นช่องให้คนนอกไล่เดารหัสผ่าน
    // และไม่เผา OTP: คนพิมพ์ผิดลองใหม่ได้ ส่วนเคสถูกสมัครทับ เจ้าของตัวจริงต้องสมัครใหม่ (ทับคืน) อยู่แล้ว
    if (!(await bcrypt.compare(password, user.password))) {
      this.logger.warn(
        `Registration verify password mismatch for user id=${user.id}`,
      );
      throw new UnauthorizedException(REGISTRATION_PASSWORD_MISMATCH);
    }

    // compare-and-set: bcrypt ข้างบนกินเวลาหลายร้อย ms ถ้ามีคนสมัครทับระหว่างนั้น แถวจะไม่ใช่คำขอที่เพิ่งตรวจผ่านแล้ว
    const verifiedUser = await this.authRepository.markRegistrationVerified(
      user.id,
      user.password,
      otp,
    );
    if (!verifiedUser) {
      throw new UnauthorizedException(REGISTRATION_CHANGED);
    }

    this.logger.log(`Registration verified: user id=${user.id}`);
    return this.generateAuthResponse(verifiedUser);
  }

  /** ขอ OTP สมัครสมาชิกใหม่ (OTP เดิมหมดอายุ/ไม่ได้รับเมล) — ยังไม่มี session จึงรับแค่อีเมล ไม่ใช่ userId จาก JWT */
  async resendRegistrationOtp(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.authRepository.findUserByEmail(normalizedEmail);

    // ไม่พบ หรือยืนยันไปแล้ว — ตอบเหมือนสำเร็จเสมอ กันเดาว่าอีเมลไหนอยู่ในระบบ/ยังไม่ยืนยัน (เหมือน forgot-password ทั่วไป)
    if (user && !user.isVerified) {
      const otp = await this.issueOtp(user.id);
      await this.mailService.sendRegistrationOtp(user.email, user.name, otp);
      this.logger.log(`Registration OTP resent: user id=${user.id}`);
    }

    return {
      message:
        "หากอีเมลนี้มีคำขอสมัครสมาชิกที่ยังไม่ยืนยัน ระบบได้ส่งรหัส OTP ใหม่ไปแล้ว",
    };
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

    // นักศึกษาสมัครใหม่ที่ยังไม่ยืนยัน OTP — organizer/admin ไม่มีทางมาถึงจุดนี้เป็น false
    // เพราะถูกสร้างด้วยคนละ flow ที่ไม่เคยตั้งค่านี้ (default เป็น true เสมอ)
    if (!user.isVerified) {
      throw new UnauthorizedException(AUTH_ERRORS.ACCOUNT_NOT_VERIFIED);
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
