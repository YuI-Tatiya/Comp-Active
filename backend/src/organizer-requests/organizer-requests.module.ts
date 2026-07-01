import { Module } from '@nestjs/common';
import { OrganizerRequestsController } from './organizer-requests.controller';
import { OrganizerRequestsService } from './organizer-requests.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [OrganizerRequestsController],
  providers: [OrganizerRequestsService],
  exports: [OrganizerRequestsService],
})
export class OrganizerRequestsModule {}
