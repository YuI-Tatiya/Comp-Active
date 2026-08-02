import { Module } from '@nestjs/common';
import { CertificatesService } from './certificate.service';
import { CertificatesRepository } from './certificate.repository';

// Logic-only — see activities.module.ts for why: this domain also has a bare
// GET /:id route (in CertificatesSharedController / VolunteerServicesPublicModule)
// that must register after student/organizer's own literal-path routes.
@Module({
  providers: [CertificatesService, CertificatesRepository],
  exports: [CertificatesService, CertificatesRepository],
})
export class VolunteerServicesModule {}
