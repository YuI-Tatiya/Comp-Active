import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../shared/activities/activities.module';
import { UsersModule } from '../shared/users/users.module';
import { RegistrationsModule } from '../shared/registrations/registrations.module';
import { AdminDashboardModule } from '../shared/admin-dashboard/admin-dashboard.module';
import { MailModule } from '../shared/mail/mail.module';
import { ActivitiesAdminController } from './activities-admin.controller';
import { UsersAdminController } from './users-admin.controller';
import { OrganizerRequestAdminController } from './organizer-request-admin.controller';
import { SiteContentAdminController } from './site-content-admin.controller';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from './admin-stats.service';
import { AdminInvitesController } from './admin-invite.controller';
import { AdminInvitesService } from './admin-invite.service';
import { AdminInvitesRepository } from './admin-invite.repository';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './api-key.service';
import { ApiKeyRepository } from './api-key.repository';

@Module({
  imports: [ActivitiesModule, UsersModule, RegistrationsModule, AdminDashboardModule, MailModule],
  controllers: [
    ActivitiesAdminController,
    UsersAdminController,
    OrganizerRequestAdminController,
    SiteContentAdminController,
    AdminStatsController,
    AdminInvitesController,
    ApiKeyController,
  ],
  providers: [AdminStatsService, AdminInvitesService, AdminInvitesRepository, ApiKeyService, ApiKeyRepository],
})
export class AdminModule {}
