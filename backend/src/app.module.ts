import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';

// Feature Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ActivitiesModule } from './activities/activities.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { CertificatesModule } from './certificates/certificates.module';
import { AdminModule } from './admin/admin.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { MailModule } from './mail/mail.module';
import { SeedModule } from './seed/seed.module';
import { OrganizerRequestsModule } from './organizer-requests/organizer-requests.module';

@Module({
  imports: [
    // Global Config (.env)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database (PostgreSQL via Prisma)
    PrismaModule,

    // Serve Static Files (For Uploaded Images)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
    }),

    // Feature Modules
    AuthModule,
    UsersModule,
    ActivitiesModule,
    RegistrationsModule,
    CertificatesModule,
    AdminModule,
    EvaluationsModule,
    MailModule,
    SeedModule,
    OrganizerRequestsModule,
  ],
})
export class AppModule {}
