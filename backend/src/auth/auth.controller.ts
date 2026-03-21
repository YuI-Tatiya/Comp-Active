import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * POST /api/auth/register - สมัครสมาชิก
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'สมัครสมาชิก' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * POST /api/auth/login - เข้าสู่ระบบด้วย email/password
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'เข้าสู่ระบบ' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * GET /api/auth/google - เริ่ม Google OAuth flow
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'เริ่มกระบวนการ Login ด้วย Google' })
  async googleAuth() {
    // Guard จะ redirect ไป Google
  }

  /**
   * GET /api/auth/google/callback - Google OAuth callback
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const googleUser = req.user as {
      googleId: string;
      email: string;
      name: string;
      picture?: string;
    };

    const result = await this.authService.handleGoogleLogin(googleUser);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    if (result.isRegistered && 'accessToken' in result) {
      // ผู้ใช้มีในระบบแล้ว → redirect กลับพร้อม token
      return res.redirect(
        `${frontendUrl}/auth/callback?token=${result.accessToken}&user=${encodeURIComponent(JSON.stringify(result.user))}`,
      );
    }

    // ยังไม่ได้สมัคร → redirect ไปหน้า register พร้อมข้อมูล Google
    const googleData = 'googleData' in result ? result.googleData : {};
    return res.redirect(
      `${frontendUrl}/auth/callback?needsRegistration=true&googleData=${encodeURIComponent(JSON.stringify(googleData))}`,
    );
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
