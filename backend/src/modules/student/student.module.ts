import { Module } from '@nestjs/common';
import { RegistrationsModule } from '../shared/registrations/registrations.module';
import { VolunteerServicesModule } from '../shared/volunteer-services/volunteer-services.module';
import { RegistrationsStudentController } from './registrations-student.controller';
import { AssessmentsStudentController } from './assessments-student.controller';
import { EvaluationsStudentController } from './evaluations-student.controller';
import { CertificatesStudentController } from './certificates-student.controller';
import { SkillTranscriptsModule } from '../shared/skill-transcripts/skill-transcripts.module';
import { SkillTranscriptsStudentController } from './skill-transcripts-student.controller';

@Module({
  imports: [RegistrationsModule, VolunteerServicesModule, SkillTranscriptsModule],
  controllers: [
    RegistrationsStudentController,
    EvaluationsStudentController,
    CertificatesStudentController,
    AssessmentsStudentController,
    SkillTranscriptsStudentController,
  ],
})
export class StudentModule {}
