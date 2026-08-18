import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AUTH_ERRORS } from '../../../../common/constants';

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
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
