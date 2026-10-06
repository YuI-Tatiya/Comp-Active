// skill-transcripts.service.spec.ts
import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { SkillTranscriptsService, TRANSCRIPT_QUOTA, TRANSCRIPT_QUOTA_WINDOW_MS } from './skill-transcripts.service';
import { SkillTranscriptsRepository } from './skill-transcripts.repository';
import { EvaluationsRepository } from '../registrations/evaluation.repository';
import { EVALUATION_SCORE_FIELDS } from '../registrations/evaluation-visibility.util';

const scores = (n: number) => Object.fromEntries(EVALUATION_SCORE_FIELDS.map((f) => [f, n]));
const evalRow = (n: number, name = 'กิจกรรม', date = '2026-03-05') => ({
  ...scores(n),
  registration: { activity: { name, date: new Date(date) } },
});
const VALID_CODE = '0123456789ABCDGG';

describe('SkillTranscriptsService', () => {
  let service: SkillTranscriptsService;
  let repo: Record<'findStudentBasic' | 'listIssuedSince' | 'create' | 'findByCode' | 'listByStudent' | 'markRevoked', jest.Mock>;
  let evaluations: { findByStudentWithActivity: jest.Mock };

  beforeEach(() => {
    repo = {
      findStudentBasic: jest.fn().mockResolvedValue({ id: 1, name: 'สมชาย ใจดี', studentId: '643380001-1' }),
      listIssuedSince: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((studentId, code, snapshot) => Promise.resolve({ id: 10, studentId, code, snapshot, issuedAt: new Date('2026-10-06T00:00:00Z'), revokedAt: null })),
      findByCode: jest.fn().mockResolvedValue(null),
      listByStudent: jest.fn().mockResolvedValue([]),
      markRevoked: jest.fn(),
    };
    evaluations = { findByStudentWithActivity: jest.fn().mockResolvedValue([evalRow(2), evalRow(4)]) };
    service = new SkillTranscriptsService(repo as unknown as SkillTranscriptsRepository, evaluations as unknown as EvaluationsRepository);
  });

  describe('issue', () => {
    it('ออกเอกสารจากคะแนนที่อนุมัติแล้ว (ใช้ method ที่กรอง APPROVED_ONLY) พร้อมรหัสถูกรูปแบบ', async () => {
      const result = await service.issue(1);

      expect(evaluations.findByStudentWithActivity).toHaveBeenCalledWith(1);
      expect(result.code).toMatch(/^[0-9A-HJKMNP-TV-Z]{16}$/);
      expect(result.snapshot.summary).toEqual({ totalScore: 72, activityCount: 2, overallAverage: 3 });
      expect(result.snapshot.holder).toEqual({ name: 'สมชาย ใจดี', studentId: '643380001-1' });
      expect(repo.create).toHaveBeenCalledWith(1, result.code, result.snapshot);
    });

    it('ไม่มีผลประเมินที่อนุมัติแล้ว (เช่น มีแต่ผลรออนุมัติของโหมด 360°) → 400 และไม่สร้างเอกสาร', async () => {
      evaluations.findByStudentWithActivity.mockResolvedValue([]);

      await expect(service.issue(1)).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('ไม่พบนักศึกษา → 404', async () => {
      repo.findStudentBasic.mockResolvedValue(null);
      await expect(service.issue(1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('ฉบับที่ 5 ออกได้ (มีอยู่แล้ว 4 ฉบับในหน้าต่าง 24 ชม.)', async () => {
      repo.listIssuedSince.mockResolvedValue(Array.from({ length: TRANSCRIPT_QUOTA - 1 }, () => ({ issuedAt: new Date() })));
      await expect(service.issue(1)).resolves.toBeDefined();
    });

    it('ฉบับที่ 6 → 429 และข้อความบอกเวลาที่ออกได้อีกครั้งจากฉบับที่หลุดหน้าต่างเป็นอันแรก', async () => {
      const t0 = new Date('2026-10-06T01:00:00Z'); // เก่าที่สุด → จะหลุดหน้าต่างเป็นอันแรก
      const issued = [t0, ...Array.from({ length: TRANSCRIPT_QUOTA - 1 }, (_, i) => new Date(t0.getTime() + (i + 1) * 3_600_000))];
      repo.listIssuedSince.mockResolvedValue(issued.map((issuedAt) => ({ issuedAt })));

      const error = await service.issue(1).catch((e) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
      const nextAllowed = new Date(t0.getTime() + TRANSCRIPT_QUOTA_WINDOW_MS);
      expect((error as HttpException).message).toContain(nextAllowed.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }));
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('รหัสชน (unique violation P2002) → สุ่มใหม่ ไม่ล้ม', async () => {
      repo.create
        .mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }))
        .mockImplementationOnce((studentId, code, snapshot) => Promise.resolve({ id: 11, studentId, code, snapshot, issuedAt: new Date(), revokedAt: null }));

      await expect(service.issue(1)).resolves.toBeDefined();
      expect(repo.create).toHaveBeenCalledTimes(2);
    });

    it('error อื่นที่ไม่ใช่ P2002 ส่งต่อทันที ไม่วนซ้ำ', async () => {
      repo.create.mockRejectedValue(new Error('db down'));
      await expect(service.issue(1)).rejects.toThrow('db down');
      expect(repo.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('verify', () => {
    const row = (overrides = {}) => ({
      id: 10, studentId: 1, code: VALID_CODE, issuedAt: new Date('2026-10-06T00:00:00Z'), revokedAt: null,
      snapshot: { version: 1 }, ...overrides,
    });

    it('เอกสารถูกต้อง → valid พร้อม snapshot', async () => {
      repo.findByCode.mockResolvedValue(row());
      await expect(service.verify('0123-4567-89ab-cdgg')).resolves.toEqual({
        status: 'valid', code: VALID_CODE, issuedAt: new Date('2026-10-06T00:00:00Z'), snapshot: { version: 1 },
      });
      expect(repo.findByCode).toHaveBeenCalledWith(VALID_CODE); // normalize แล้ว
    });

    it('เอกสารที่ยกเลิกแล้ว → revoked และ "ไม่มี" snapshot ใน response', async () => {
      const revokedAt = new Date('2026-10-07T00:00:00Z');
      repo.findByCode.mockResolvedValue(row({ revokedAt }));

      const result = await service.verify(VALID_CODE);

      expect(result).toEqual({ status: 'revoked', code: VALID_CODE, revokedAt });
      expect(result).not.toHaveProperty('snapshot');
    });

    it('ไม่พบในระบบ → not_found', async () => {
      await expect(service.verify(VALID_CODE)).resolves.toEqual({ status: 'not_found' });
    });

    it.each(["'; DROP TABLE skill_transcripts;--", '', 'สวัสดี', '0123', 'U'.repeat(16), 'A'.repeat(500)])(
      'รหัสผิดรูปแบบ (%s) → not_found โดยไม่ยิง DB',
      async (garbage) => {
        await expect(service.verify(garbage)).resolves.toEqual({ status: 'not_found' });
        expect(repo.findByCode).not.toHaveBeenCalled();
      },
    );
  });

  describe('revoke', () => {
    const row = (overrides = {}) => ({ id: 10, studentId: 1, code: VALID_CODE, issuedAt: new Date(), revokedAt: null, snapshot: {}, ...overrides });

    it('เจ้าของยกเลิกได้', async () => {
      repo.findByCode.mockResolvedValue(row());
      const revokedAt = new Date('2026-10-07T00:00:00Z');
      repo.markRevoked.mockResolvedValue(row({ revokedAt }));

      await expect(service.revoke(1, VALID_CODE)).resolves.toEqual({ code: VALID_CODE, revokedAt });
      expect(repo.markRevoked).toHaveBeenCalledWith(10, expect.any(Date));
    });

    it('รหัสของนักศึกษาคนอื่น → 404 เหมือนไม่มีรหัสนั้น และเอกสารไม่ถูกยกเลิก', async () => {
      repo.findByCode.mockResolvedValue(row({ studentId: 999 }));
      const other = await service.revoke(1, VALID_CODE).catch((e) => e);

      repo.findByCode.mockResolvedValue(null);
      const missing = await service.revoke(1, VALID_CODE).catch((e) => e);

      expect(other).toBeInstanceOf(NotFoundException);
      expect(missing).toBeInstanceOf(NotFoundException);
      expect((other as NotFoundException).message).toBe((missing as NotFoundException).message);
      expect(repo.markRevoked).not.toHaveBeenCalled();
    });

    it('รหัสผิดรูปแบบ → 404 โดยไม่ยิง DB', async () => {
      await expect(service.revoke(1, 'xx')).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.findByCode).not.toHaveBeenCalled();
    });

    it('ยกเลิกซ้ำ → คืนค่าเดิม ไม่ error และไม่เขียน DB ซ้ำ', async () => {
      const revokedAt = new Date('2026-10-07T00:00:00Z');
      repo.findByCode.mockResolvedValue(row({ revokedAt }));

      await expect(service.revoke(1, VALID_CODE)).resolves.toEqual({ code: VALID_CODE, revokedAt });
      expect(repo.markRevoked).not.toHaveBeenCalled();
    });
  });

  describe('listMine', () => {
    it('คืนรหัส วันที่ สถานะ และตัวเลขสรุป โดยไม่ส่ง snapshot ทั้งก้อน', async () => {
      repo.listByStudent.mockResolvedValue([
        { id: 1, studentId: 1, code: VALID_CODE, issuedAt: new Date('2026-10-06T00:00:00Z'), revokedAt: null, snapshot: { summary: { activityCount: 2, totalScore: 72 }, activities: [{ name: 'x' }] } },
      ]);

      const result = await service.listMine(1);

      expect(result).toEqual([{ code: VALID_CODE, issuedAt: new Date('2026-10-06T00:00:00Z'), revokedAt: null, activityCount: 2, totalScore: 72 }]);
    });
  });
});
