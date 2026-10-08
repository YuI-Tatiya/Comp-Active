import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from '../../../prisma/prisma.service';
import { SkillTranscriptsPublicModule } from './skill-transcripts-public.module';
import { StudentModule } from '../../student/student.module';
import { SkillTranscriptsService } from './skill-transcripts.service';

// PrismaModule เป็น global ใน AppModule — ในเทสต์ใช้ตัวแทนที่ไม่ต่อ DB จริง
@Global()
@Module({ providers: [{ provide: PrismaService, useValue: {} }], exports: [PrismaService] })
class FakePrismaModule {}

describe('SkillTranscripts DI wiring', () => {
  it('คอมไพล์ DI graph ของ StudentModule + SkillTranscriptsPublicModule ได้ (ไม่มี "Nest can\'t resolve dependencies")', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
        FakePrismaModule,
        StudentModule,
        SkillTranscriptsPublicModule,
      ],
    }).compile();

    expect(moduleRef.get(SkillTranscriptsService, { strict: false })).toBeDefined();
    await moduleRef.close();
  });
});
