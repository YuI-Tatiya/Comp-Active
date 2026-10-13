import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AUTH_ERRORS } from '../../../../common/constants';
import { AUTH_COOKIE_NAME } from '../../../../common/utils';

/**
 * ดึง JWT จาก httpOnly cookie — เป็นทางหลักสำหรับผู้ใช้ผ่านเบราว์เซอร์
 * ตัว cookie อ่านด้วย JavaScript ไม่ได้ XSS จึงขโมย token ไปใช้ต่อไม่ได้
 */
function cookieExtractor(req: Request): string | null {
  const token: unknown = (req as Request & { cookies?: Record<string, unknown> }).cookies?.[AUTH_COOKIE_NAME];
  return typeof token === 'string' && token.length > 0 ? token : null;
}

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      // cookie มาก่อน ส่วน Bearer header เก็บไว้สำหรับ client ที่ไม่ใช่เบราว์เซอร์
      // (Swagger, Postman, สคริปต์ทดสอบ) ซึ่งไม่มีปัญหาเรื่อง XSS ตั้งแต่แรก
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret')!,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        studentId: true,
        username: true,
        validUntil: true,
        isBlocked: true,
        program: true,
        educationLevel: true,
      },
    });

    if (!user) throw new UnauthorizedException('ไม่พบผู้ใช้งาน');
    if (user.isBlocked) throw new UnauthorizedException(AUTH_ERRORS.ACCOUNT_BLOCKED);
    if (user.role === 'organizer' && user.validUntil && user.validUntil < new Date()) {
      throw new UnauthorizedException(AUTH_ERRORS.ORGANIZER_EXPIRED);
    }

    return user;
  }
}
