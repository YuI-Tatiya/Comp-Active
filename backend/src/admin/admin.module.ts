import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { ActivitiesModule } from '../activities/activities.module';
import { RegistrationsModule } from '../registrations/registrations.module';

@Module({
  imports: [UsersModule, ActivitiesModule, RegistrationsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
