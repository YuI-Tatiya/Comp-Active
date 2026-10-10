import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { ConfigService } from "@nestjs/config";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { RegisterDto } from "./dto/register.dto";
import { AcceptInviteDto } from "./dto/accept-invite.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { VerifyRegistrationOtpDto } from "./dto/verify-registration-otp.dto";
import { ResendRegistrationOtpDto } from "./dto/resend-registration-otp.dto";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { AdminIpGuard } from "../../../common/guards/admin-ip.guard";
import { AuthThrottlerGuard } from "../../../common/guards/auth-throttler.guard";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import {
  clearAuthCookie,
  resolveSameSite,
  setAuthCookie,
} from "../../../common/utils";

@ApiTags("Authentication")
@Controller("api/auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  /**
   * ออก httpOnly cookie ให้เบราว์เซอร์ถือ token แทน localStorage
   * ยังคืน accessToken ใน body ไว้ด้วยเพื่อให้ client ที่ไม่ใช่เบราว์เซอร์
   * (Swagger / Postman / สคริปต์ทดสอบ) ใช้งานต่อได้ตามเดิม — ฝั่งเว็บไม่เก็บค่านี้แล้ว
   */
  private issueSession(res: Response, result: { accessToken: string }) {
    setAuthCookie(res, result.accessToken, {
      expiresIn: this.config.get<string>("jwt.expiresIn") ?? "7d",
      isProduction: this.config.get<string>("NODE_ENV") === "production",
      sameSite: resolveSameSite(
        this.config.get<string>("AUTH_COOKIE_SAMESITE"),
      ),
    });
    return result;
  }

  /**
   * POST /api/auth/register - สมัครสมาชิก (นักศึกษาเท่านั้น)
   *
   * ยังไม่ออก session — ต้องยืนยัน OTP ที่ส่งไปอีเมลผ่าน /register/verify-otp ก่อน
   * ถึงจะนับว่าสมัครสำเร็จและเข้าสู่ระบบได้จริง
   */
  @Post("register")
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 600_000 } }) // 5 ครั้ง / 10 นาที ต่อ IP — กันสร้างบัญชีถล่ม
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "สมัครสมาชิก (นักศึกษาเท่านั้น) — ส่ง OTP ไปอีเมล ยังไม่เข้าสู่ระบบ",
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * POST /api/auth/register/verify-otp - ยืนยัน OTP เพื่อเปิดใช้งานบัญชีที่เพิ่งสมัคร (สาธารณะ — ยังไม่มี session)
   */
  @Post("register/verify-otp")
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 300_000 } }) // ชั้นนอกของการจำกัดการเดา OTP
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "ยืนยัน OTP เพื่อเปิดใช้งานบัญชีที่เพิ่งสมัคร" })
  async verifyRegistrationOtp(
    @Body() dto: VerifyRegistrationOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.issueSession(
      res,
      await this.authService.verifyRegistrationOtp(dto.email, dto.otp),
    );
  }

  /**
   * POST /api/auth/register/resend-otp - ขอรหัส OTP สมัครสมาชิกใหม่ (สาธารณะ — ยังไม่มี session)
   */
  @Post("register/resend-otp")
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 300_000 } }) // 3 ครั้ง / 5 นาที — กัน mail bombing
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "ขอรหัส OTP สมัครสมาชิกใหม่ (สำหรับบัญชีที่ยังไม่ยืนยัน)",
  })
  async resendRegistrationOtp(@Body() dto: ResendRegistrationOtpDto) {
    return this.authService.resendRegistrationOtp(dto.email);
  }

  /**
   * POST /api/auth/login - เข้าสู่ระบบ (นักศึกษา/ผู้จัดกิจกรรม)
   */
  @Post("login")
  @UseGuards(AuthThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 300_000 } }) // 10 ครั้ง / 5 นาที ต่อ "บัญชี" — กัน brute force
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "เข้าสู่ระบบ (นักศึกษา ด้วยอีเมล หรือ ผู้จัดกิจกรรม ด้วย Username)",
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.issueSession(res, await this.authService.login(loginDto));
  }

  /**
   * POST /api/auth/admin/login - เข้าสู่ระบบสำหรับ Admin
   */
  @Post("admin/login")
  @UseGuards(AdminIpGuard, AuthThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 900_000 } }) // 5 ครั้ง / 15 นาที — บัญชีสิทธิ์สูงสุด เข้มกว่าปกติ
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "เข้าสู่ระบบ (Admin)" })
  async adminLogin(
    @Body() dto: AdminLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.issueSession(res, await this.authService.adminLogin(dto));
  }

  /**
   * GET /api/auth/admin/invite/:token - ตรวจสอบคำเชิญ Admin (สาธารณะ)
   */
  @Get("admin/invite/:token")
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 600_000 } }) // กันไล่สุ่ม token คำเชิญ
  @ApiOperation({ summary: "ตรวจสอบคำเชิญ Admin ก่อนตั้งรหัสผ่าน" })
  async getAdminInvite(@Param("token") token: string) {
    return this.authService.getAdminInviteInfo(token);
  }

  /**
   * POST /api/auth/admin/invite/accept - ยอมรับคำเชิญและตั้งรหัสผ่าน (สาธารณะ)
   */
  @Post("admin/invite/accept")
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "ยอมรับคำเชิญ Admin และตั้งรหัสผ่าน" })
  async acceptAdminInvite(@Body() dto: AcceptInviteDto) {
    return this.authService.acceptAdminInvite(dto.token, dto.password);
  }

  /**
   * POST /api/auth/logout - ออกจากระบบ (ลบ cookie ฝั่งเซิร์ฟเวอร์)
   *
   * จำเป็นต้องมี endpoint นี้เพราะ httpOnly cookie ลบจาก JavaScript ไม่ได้
   * ไม่ผูก JwtAuthGuard ไว้ เพื่อให้กดออกจากระบบได้เสมอแม้ token หมดอายุไปแล้ว
   */
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "ออกจากระบบ" })
  logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookie(res, {
      isProduction: this.config.get<string>("NODE_ENV") === "production",
      sameSite: resolveSameSite(
        this.config.get<string>("AUTH_COOKIE_SAMESITE"),
      ),
    });
    return { message: "ออกจากระบบเรียบร้อย" };
  }

  /**
   * GET /api/auth/profile - ดูข้อมูลผู้ใช้ปัจจุบัน
   */
  @Get("profile")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "ดูข้อมูล Profile ปัจจุบัน" })
  async getProfile(@CurrentUser("id") userId: number) {
    return this.authService.getProfile(userId);
  }

  /**
   * POST /api/auth/send-otp - ส่งอีเมล OTP ให้ผู้ใช้งานปัจจุบัน
   */
  @Post("send-otp")
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 300_000 } }) // 3 ครั้ง / 5 นาที — กัน mail bombing
  @ApiBearerAuth()
  @ApiOperation({ summary: "ส่ง OTP ยืนยันตัวตนไปยังอีเมลของบัญชีปัจจุบัน" })
  async sendOtp(@CurrentUser("id") userId: number) {
    return this.authService.sendVerificationOtp(userId);
  }

  /**
   * POST /api/auth/verify-otp - ตรวจสอบ OTP ที่กรอก
   */
  @Post("verify-otp")
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 300_000 } }) // ชั้นนอกของการจำกัดการเดา OTP
  @ApiBearerAuth()
  @ApiOperation({ summary: "ตรวจสอบรหัส OTP ที่ได้รับทางอีเมล" })
  async verifyOtp(
    @CurrentUser("id") userId: number,
    @Body() dto: VerifyOtpDto,
  ) {
    return this.authService.verifyOtp(userId, dto.otp);
  }
}
