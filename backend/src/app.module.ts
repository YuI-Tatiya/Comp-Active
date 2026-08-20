import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import jwtConfig from './config/jwt.config';
import databaseConfig from './config/database.config';
import gatewayConfig from './config/gateway.config';

// Role modules (own the role-specific controllers)
import { AdminModule } from './modules/admin/admin.module';
import { OrganizerModule } from './modules/organizer/organizer.module';
import { StudentModule } from './modules/student/student.module';

// Shared modules with their own public/cross-role controllers
import { AuthModule } from './modules/shared/auth/auth.module';
import { SeedModule } from './modules/shared/seed/seed.module';

// Shared "public" modules — see activities-public.module.ts for why these are
// imported directly here (not via Admin/Organizer/Student) and MUST be listed
// after those three: they host a bare `GET /:id` route that would otherwise
// register before the role modules' own literal-path routes (e.g. `/pending`,
// `/my`) and swallow them.
import { ActivitiesPublicModule } from './modules/shared/activities/activities-public.module';
import { EventsPublicModule } from './modules/shared/events/events-public.module';
import { VolunteerServicesPublicModule } from './modules/shared/volunteer-services/volunteer-services-public.module';

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

    AuthModule,
    SeedModule,

    // Order matters from here down — see the import comment above.
    AdminModule,
    OrganizerModule,
    StudentModule,
    ActivitiesPublicModule,
    EventsPublicModule,
    VolunteerServicesPublicModule,
  ],
})
export class AppModule {}
