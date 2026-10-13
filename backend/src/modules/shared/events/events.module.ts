import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsRepository } from './events.repository';
import { EventDraftService } from './event-draft.service';
import { EventDraftRepository } from './event-draft.repository';

// Logic-only module (no controllers) — mirrors ActivitiesModule so both
// organizer/admin/student modules can DI EventsService without route-order concerns.
@Module({
  providers: [EventsService, EventsRepository, EventDraftService, EventDraftRepository],
  exports: [EventsService, EventsRepository, EventDraftService, EventDraftRepository],
})
export class EventsModule {}
