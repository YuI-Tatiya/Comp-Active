import { Module } from '@nestjs/common';
import { RegistrationsModule } from '../shared/registrations/registrations.module';
import { VolunteerServicesModule } from '../shared/volunteer-services/volunteer-services.module';
import { RegistrationsStudentController } from './registrations-student.controller';
import { EvaluationsStudentController } from './evaluations-student.controller';
import { CertificatesStudentController } from './certificates-student.controller';

@Module({
  imports: [RegistrationsModule, VolunteerServicesModule],
  controllers: [RegistrationsStudentController, EvaluationsStudentController, CertificatesStudentController],
})
export class StudentModule {}
