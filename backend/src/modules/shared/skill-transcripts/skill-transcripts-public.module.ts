// skill-transcripts-public.module.ts
import { Module } from '@nestjs/common';
import { SkillTranscriptsModule } from './skill-transcripts.module';
import { SkillTranscriptsPublicController } from './skill-transcripts-public.controller';

// Imported ONLY by AppModule หลัง StudentModule/OrganizerModule — แบบเดียวกับ VolunteerServicesPublicModule
@Module({ imports: [SkillTranscriptsModule], controllers: [SkillTranscriptsPublicController] })
export class SkillTranscriptsPublicModule {}
