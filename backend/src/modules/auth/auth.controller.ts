import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { RegisterDto } from './dto/register.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminIpGuard } from '../../common/guards/admin-ip.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/register - สมัครสมาชิก (นักศึกษาเท่านั้น)
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'สมัครสมาชิก (นักศึกษาเท่านั้น)' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * POST /api/auth/login - เข้าสู่ระบบ (นักศึกษา/ผู้จัดกิจกรรม)
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'เข้าสู่ระบบ (นักศึกษา ด้วยอีเมล หรือ ผู้จัดกิจกรรม ด้วย Username)' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * POST /api/auth/admin/login - เข้าสู่ระบบสำหรับ Admin
   */
  @Post('admin/login')
  @UseGuards(AdminIpGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'เข้าสู่ระบบ (Admin)' })
  async adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto);
  }

  /**
   * GET /api/auth/admin/invite/:token - ตรวจสอบคำเชิญ Admin (สาธารณะ)
   */
  @Get('admin/invite/:token')
  @ApiOperation({ summary: 'ตรวจสอบคำเชิญ Admin ก่อนตั้งรหัสผ่าน' })
  async getAdminInvite(@Param('token') token: string) {
    return this.authService.getAdminInviteInfo(token);
  }

  /**
   * POST /api/auth/admin/invite/accept - ยอมรับคำเชิญและตั้งรหัสผ่าน (สาธารณะ)
   */
  @Post('admin/invite/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ยอมรับคำเชิญ Admin และตั้งรหัสผ่าน' })
  async acceptAdminInvite(@Body() dto: AcceptInviteDto) {
    return this.authService.acceptAdminInvite(dto.token, dto.password);
  }

  /**
   * GET /api/auth/profile - ดูข้อมูลผู้ใช้ปัจจุบัน
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูข้อมูล Profile ปัจจุบัน' })
  async getProfile(@CurrentUser('id') userId: number) {
    return this.authService.getProfile(userId);
  }

  /**
   * POST /api/auth/send-otp - ส่งอีเมล OTP ให้ผู้ใช้งานปัจจุบัน
   */
  @Post('send-otp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ส่ง OTP ยืนยันตัวตนไปยังอีเมลของบัญชีปัจจุบัน' })
  async sendOtp(@CurrentUser('id') userId: number) {
    return this.authService.sendVerificationOtp(userId);
  }

  /**
   * POST /api/auth/verify-otp - ตรวจสอบ OTP ที่กรอก
   */
  @Post('verify-otp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ตรวจสอบรหัส OTP ที่ได้รับทางอีเมล' })
  async verifyOtp(
    @CurrentUser('id') userId: number,
    @Body('otp') otp: string,
  ) {
    return this.authService.verifyOtp(userId, otp);
  }
}
