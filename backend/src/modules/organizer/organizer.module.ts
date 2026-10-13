import { Module } from "@nestjs/common";
import { ActivitiesModule } from "../shared/activities/activities.module";
import { EventsModule } from "../shared/events/events.module";
import { RegistrationsModule } from "../shared/registrations/registrations.module";
import { VolunteerServicesModule } from "../shared/volunteer-services/volunteer-services.module";
import { StorageModule } from "../shared/storage/storage.module";
import { ActivitiesOrganizerController } from "./activities-organizer.controller";
import { EventsOrganizerController } from "./events-organizer.controller";
import { RegistrationsOrganizerController } from "./registrations-organizer.controller";
import { EvaluationsOrganizerController } from "./evaluations-organizer.controller";
import { CertificatesOrganizerController } from "./certificates-organizer.controller";

@Module({
  imports: [
    ActivitiesModule,
    EventsModule,
    RegistrationsModule,
    VolunteerServicesModule,
    StorageModule,
  ],
  controllers: [
    ActivitiesOrganizerController,
    EventsOrganizerController,
    RegistrationsOrganizerController,
    EvaluationsOrganizerController,
    CertificatesOrganizerController,
  ],
})
export class OrganizerModule {}
