import { Module } from '@nestjs/common';
import { EventsModule } from './events.module';
import { EventsPublicController } from './events-public.controller';

// Mirrors activities-public.module.ts: kept separate from EventsModule (which stays
// controller-free, see its own comment) and imported directly by AppModule so this
// controller's routes register alongside the other shared public controllers.
// Unlike ActivitiesPublicController, neither of this controller's routes is a bare
// `:id` (they are `/api/events` and `/api/events/:id/public`), so — unlike the
// Activities case — there is no route-order collision risk with
// EventsOrganizerController's `/api/events/my` and `/api/events/:id`. Still grouped
// here for consistency with the established shared-public-module pattern.
@Module({
  imports: [EventsModule],
  controllers: [EventsPublicController],
})
export class EventsPublicModule {}
