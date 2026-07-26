import { Module } from '@nestjs/common';
import { AdminStatsService } from './admin-stats.service';
import { AdminStatsController } from './admin-stats.controller';
import { OrganizerRequestsService } from './organizer-request.service';
import { OrganizerRequestsRepository } from './organizer-request.repository';
import { OrganizerRequestsController } from './organizer-request.controller';
import { SiteContentService } from './site-content.service';
import { SiteContentRepository } from './site-content.repository';
import { SiteContentPublicController } from './site-content.controller';
import { AdminSiteContentController } from './admin-site-content.controller';
import { UsersModule } from '../users/users.module';
import { ActivitiesModule } from '../activities/activities.module';
import { RegistrationsModule } from '../registrations/registrations.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [UsersModule, ActivitiesModule, RegistrationsModule, MailModule],
  controllers: [
    AdminStatsController,
    OrganizerRequestsController,
    SiteContentPublicController,
    AdminSiteContentController,
  ],
  providers: [
    AdminStatsService,
    OrganizerRequestsService,
    OrganizerRequestsRepository,
    SiteContentService,
    SiteContentRepository,
  ],
  exports: [AdminStatsService, OrganizerRequestsService, OrganizerRequestsRepository],
})
export class AdminDashboardModule {}
