import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AdminInvitesService } from './admin-invite.service';
import { AdminInvitesRepository } from './admin-invite.repository';
import { AdminInvitesController } from './admin-invite.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MailModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController, AdminInvitesController],
  providers: [AuthService, AuthRepository, JwtStrategy, AdminInvitesService, AdminInvitesRepository],
  exports: [AuthService, AuthRepository, JwtModule, AdminInvitesService, AdminInvitesRepository],
})
export class AuthModule {}
