import { Module } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ActivitiesRepository } from './activities.repository';
import { ActivitiesController } from './activities.controller';
import { ActivitiesPublicApiController } from './activities-public-api.controller';

@Module({
  controllers: [ActivitiesController, ActivitiesPublicApiController],
  providers: [ActivitiesService, ActivitiesRepository],
  exports: [ActivitiesService, ActivitiesRepository],
})
export class ActivitiesModule {}
