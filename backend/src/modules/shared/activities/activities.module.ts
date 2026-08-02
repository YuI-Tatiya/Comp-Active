import { Module } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ActivitiesRepository } from './activities.repository';

// Logic-only module (no controllers) — safe to import from admin/organizer/student
// for DI without dragging in route registration order concerns. The public-facing
// routes (including the bare GET /:id) live in ActivitiesPublicModule instead — see
// that file for why the split exists.
@Module({
  providers: [ActivitiesService, ActivitiesRepository],
  exports: [ActivitiesService, ActivitiesRepository],
})
export class ActivitiesModule {}
