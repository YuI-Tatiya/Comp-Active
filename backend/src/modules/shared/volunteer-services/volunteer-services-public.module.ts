import { Module } from '@nestjs/common';
import { VolunteerServicesModule } from './volunteer-services.module';
import { CertificateSharedController } from './certificate-shared.controller';

// Imported ONLY by AppModule, positioned after StudentModule/OrganizerModule — see
// activities-public.module.ts for the full explanation of this pattern.
@Module({
  imports: [VolunteerServicesModule],
  controllers: [CertificateSharedController],
})
export class VolunteerServicesPublicModule {}
