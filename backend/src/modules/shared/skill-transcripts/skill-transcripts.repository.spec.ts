// skill-transcripts.repository.spec.ts
import { SkillTranscriptsRepository } from './skill-transcripts.repository';
import { STUDENT_BASIC_SELECT } from '../../../common/constants/user-select';

describe('SkillTranscriptsRepository', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    skillTranscript: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  };
  const repo = new SkillTranscriptsRepository(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('ดึงผู้ถือเอกสารด้วย STUDENT_BASIC_SELECT เท่านั้น (ไม่ให้ password hash/OTP หลุดมา)', async () => {
    await repo.findStudentBasic(7);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 7 }, select: STUDENT_BASIC_SELECT });
  });

  it('listIssuedSince กรองตามนักศึกษาและเวลา เรียงเก่า → ใหม่ และเลือกเฉพาะ issuedAt', async () => {
    const since = new Date('2026-10-05T00:00:00Z');
    await repo.listIssuedSince(7, since);
    expect(prisma.skillTranscript.findMany).toHaveBeenCalledWith({
      where: { studentId: 7, issuedAt: { gte: since } },
      orderBy: { issuedAt: 'asc' },
      select: { issuedAt: true },
    });
  });

  it('create / findByCode / listByStudent / markRevoked ส่งพารามิเตอร์ตามที่ควร', async () => {
    const snapshot = { version: 1 } as never;
    await repo.create(7, 'CODE', snapshot);
    expect(prisma.skillTranscript.create).toHaveBeenCalledWith({ data: { studentId: 7, code: 'CODE', snapshot } });

    await repo.findByCode('CODE');
    expect(prisma.skillTranscript.findUnique).toHaveBeenCalledWith({ where: { code: 'CODE' } });

    await repo.listByStudent(7);
    expect(prisma.skillTranscript.findMany).toHaveBeenCalledWith({ where: { studentId: 7 }, orderBy: { issuedAt: 'desc' } });

    const at = new Date();
    await repo.markRevoked(3, at);
    expect(prisma.skillTranscript.update).toHaveBeenCalledWith({ where: { id: 3 }, data: { revokedAt: at } });
  });
});
