import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import jwtConfig from './config/jwt.config';
import databaseConfig from './config/database.config';
import gatewayConfig from './config/gateway.config';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { RegistrationsModule } from './modules/registrations/registrations.module';
import { VolunteerServicesModule } from './modules/volunteer-services/volunteer-services.module';
import { AdminDashboardModule } from './modules/admin-dashboard/admin-dashboard.module';
import { DeveloperPortalModule } from './modules/developer-portal/developer-portal.module';
import { MailModule } from './modules/mail/mail.module';
import { SeedModule } from './modules/seed/seed.module';

@Module({
  imports: [
    // Global Config (.env)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [jwtConfig, databaseConfig, gatewayConfig],
    }),

    // Database (PostgreSQL via Prisma)
    PrismaModule,

    // Serve Static Files (For Uploaded Images)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
    }),

    // Rate limiting bucket for the external developer API (see ApiKeyThrottlerGuard)
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),

    // Feature Modules
    AuthModule,
    UsersModule,
    ActivitiesModule,
    RegistrationsModule,
    VolunteerServicesModule,
    AdminDashboardModule,
    DeveloperPortalModule,
    MailModule,
    SeedModule,
  ],
})
export class AppModule {}
