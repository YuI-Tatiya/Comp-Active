import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesService } from './activities.service';
import { ActivitiesController } from './activities.controller';
import { Activity } from './entities/activity.entity';
import { ActivityTag } from './entities/activity-tag.entity';
import { ActivityCondition } from './entities/activity-condition.entity';
import { ActivityBenefit } from './entities/activity-benefit.entity';
import { ActivitySoftSkill } from './entities/activity-soft-skill.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Activity,
      ActivityTag,
      ActivityCondition,
      ActivityBenefit,
      ActivitySoftSkill,
    ]),
  ],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
