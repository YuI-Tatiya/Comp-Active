import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsRepository } from './events.repository';

// Logic-only module (no controllers) — mirrors ActivitiesModule so both
// organizer/admin/student modules can DI EventsService without route-order concerns.
@Module({
  providers: [EventsService, EventsRepository],
  exports: [EventsService, EventsRepository],
})
export class EventsModule {}
