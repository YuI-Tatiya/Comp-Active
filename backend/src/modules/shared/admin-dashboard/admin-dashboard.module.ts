import { Module } from '@nestjs/common';
import { SiteContentService } from './site-content.service';
import { SiteContentRepository } from './site-content.repository';
import { SiteContentPublicController } from './site-content.controller';
import { OrganizerRequestsService } from './organizer-request.service';
import { OrganizerRequestsRepository } from './organizer-request.repository';
import { OrganizerRequestPublicController } from './organizer-request-public.controller';
import { MailModule } from '../mail/mail.module';

// No bare `:id` route exists in either sub-domain here (admin's own routes are all
// suffixed or literal), so — unlike activities/certificates — it's safe to keep the
// public controllers directly on this module.
@Module({
  imports: [MailModule],
  controllers: [SiteContentPublicController, OrganizerRequestPublicController],
  providers: [SiteContentService, SiteContentRepository, OrganizerRequestsService, OrganizerRequestsRepository],
  exports: [SiteContentService, SiteContentRepository, OrganizerRequestsService, OrganizerRequestsRepository],
})
export class AdminDashboardModule {}
