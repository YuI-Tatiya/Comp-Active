import { Module } from '@nestjs/common';
import { CertificatesService } from './certificate.service';
import { CertificatesRepository } from './certificate.repository';
import { CertificatesController } from './certificate.controller';

@Module({
  controllers: [CertificatesController],
  providers: [CertificatesService, CertificatesRepository],
  exports: [CertificatesService, CertificatesRepository],
})
export class VolunteerServicesModule {}
