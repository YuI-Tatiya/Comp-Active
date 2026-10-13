// skill-transcripts.module.ts
import { Module } from '@nestjs/common';
import { RegistrationsModule } from '../registrations/registrations.module';
import { SkillTranscriptsService } from './skill-transcripts.service';
import { SkillTranscriptsRepository } from './skill-transcripts.repository';

// Logic-only — controllers อยู่ที่ StudentModule (ฝั่งนักศึกษา) และ SkillTranscriptsPublicModule (verify สาธารณะ)
@Module({
  imports: [RegistrationsModule], // ใช้ EvaluationsRepository (คะแนนที่อนุมัติแล้ว)
  providers: [SkillTranscriptsService, SkillTranscriptsRepository],
  exports: [SkillTranscriptsService],
})
export class SkillTranscriptsModule {}
