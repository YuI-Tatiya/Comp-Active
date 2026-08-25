import { Module } from '@nestjs/common';
import { ActivitiesModule } from './activities.module';
import { ActivitiesPublicController } from './activities-public.controller';
import { ActivitiesPublicApiController } from './activities-public-api.controller';

// Deliberately separate from ActivitiesModule and imported ONLY by AppModule (not by
// AdminModule/OrganizerModule). Nest scans a module's `imports` before the module's
// own controllers register, so if Admin/OrganizerModule imported this module for the
// service, this module's bare `GET /:id` route would register BEFORE their own literal
// routes (`/pending`, `/my`, ...) — and Express would then match e.g. `/pending` as
// `:id="pending"` first. Keeping this module import-only-by-AppModule, and listing
// AdminModule/OrganizerModule earlier in AppModule's `imports` array, guarantees this
// controller's `:id` route registers last.
@Module({ imports: [ActivitiesModule], controllers: [ActivitiesPublicController, ActivitiesPublicApiController] })
export class ActivitiesPublicModule {}
