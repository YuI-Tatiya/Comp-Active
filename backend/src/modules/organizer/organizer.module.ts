import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../shared/activities/activities.module';
import { RegistrationsModule } from '../shared/registrations/registrations.module';
import { VolunteerServicesModule } from '../shared/volunteer-services/volunteer-services.module';
import { ActivitiesOrganizerController } from './activities-organizer.controller';
import { RegistrationsOrganizerController } from './registrations-organizer.controller';
import { EvaluationsOrganizerController } from './evaluations-organizer.controller';
import { CertificatesOrganizerController } from './certificates-organizer.controller';

@Module({
  imports: [ActivitiesModule, RegistrationsModule, VolunteerServicesModule],
  controllers: [
    ActivitiesOrganizerController,
    RegistrationsOrganizerController,
    EvaluationsOrganizerController,
    CertificatesOrganizerController,
  ],
})
export class OrganizerModule {}
