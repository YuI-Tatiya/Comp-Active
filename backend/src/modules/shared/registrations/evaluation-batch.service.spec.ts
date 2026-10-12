import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EvaluationBatchService } from './evaluation-batch.service';
import { EvaluationsRepository } from './evaluation.repository';
import { UserRole } from '../../../common/enums/role.enum';

const OWNER_ID = 10;
const ACTIVITY_ID = 1;

function activity(overrides: Record<string, unknown> = {}) {
  return {
    id: ACTIVITY_ID,
    organizerId: OWNER_ID,
    registrationType: 'staff_volunteer',
    // 96 ชม. (>72) → ปลดล็อกระดับ 5 โดยไม่ต้องเป็นโครงการ
    startAt: new Date('2027-01-01T09:00:00.000Z'),
    endAt: new Date('2027-01-05T09:00:00.000Z'),
    dutyRoleOptions: ['ฝ่ายA', 'ฝ่ายB'],
    softSkills: [
      { skillType: 'leadership', rate: 3 },
      { skillType: 'communication', rate: 2 },
    ],
    event: null,
    ...overrides,
  };
}

function registration(id: number, dutyRole: string | null, overrides: Record<string, unknown> = {}) {
  return {
    id,
    dutyRole,
    student: { name: `Student ${id}`, studentId: `65338000${id}-1` },
    evaluation: { leadership: 3, communication: 2 },
    evaluationExceptions: [],
    ...overrides,
  };
}

describe('EvaluationBatchService', () => {
  let service: EvaluationBatchService;
  let repo: {
    findActivityForBatch: jest.Mock;
    findAttendedForBatch: jest.Mock;
    findBaselinesByActivity: jest.Mock;
    replaceBatchState: jest.Mock;
  };

  beforeEach(() => {
    repo = {
      findActivityForBatch: jest.fn().mockResolvedValue(activity()),
      findAttendedForBatch: jest
        .fn()
        .mockResolvedValue([registration(1, 'ฝ่ายA'), registration(2, 'ฝ่ายA'), registration(3, 'ฝ่ายB')]),
      findBaselinesByActivity: jest.fn().mockResolvedValue([]),
      replaceBatchState: jest.fn().mockResolvedValue(undefined),
    };
    service = new EvaluationBatchService(repo as unknown as EvaluationsRepository);
  });

  describe('ownership', () => {
    it('throws NotFoundException when the activity does not exist', async () => {
      repo.findActivityForBatch.mockResolvedValue(null);
      await expect(service.getBatch(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for an organizer who does not own the activity', async () => {
      await expect(service.getBatch(999, UserRole.ORGANIZER, ACTIVITY_ID)).rejects.toThrow(ForbiddenException);
      await expect(
        service.saveBatch(999, UserRole.ORGANIZER, ACTIVITY_ID, { groups: [], exceptions: [] }),
      ).rejects.toThrow(ForbiddenException);
      expect(repo.replaceBatchState).not.toHaveBeenCalled();
    });

    it('allows an admin who does not own the activity', async () => {
      await expect(service.getBatch(999, UserRole.ADMIN, ACTIVITY_ID)).resolves.toEqual(
        expect.objectContaining({ eligible: true }),
      );
    });
  });

  describe('eligibility (Tier 3 staff only)', () => {
    it('is not eligible for a non-staff activity', async () => {
      repo.findActivityForBatch.mockResolvedValue(activity({ registrationType: 'participant' }));
      const result = await service.getBatch(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID);
      expect(result.eligible).toBe(false);
      expect(result.groups).toEqual([]);
    });

    it('is not eligible for a short standalone staff activity (auto-graded instead)', async () => {
      repo.findActivityForBatch.mockResolvedValue(
        activity({ startAt: new Date('2027-01-01T09:00:00.000Z'), endAt: new Date('2027-01-02T09:00:00.000Z') }),
      );
      const result = await service.getBatch(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID);
      expect(result.eligible).toBe(false);
    });

    it('is eligible for a short staff sub-activity inside a multi-activity project', async () => {
      repo.findActivityForBatch.mockResolvedValue(
        activity({
          startAt: new Date('2027-01-01T09:00:00.000Z'),
          endAt: new Date('2027-01-01T12:00:00.000Z'),
          event: { _count: { activities: 2 } },
        }),
      );
      const result = await service.getBatch(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID);
      expect(result.eligible).toBe(true);
    });

    it('is not eligible when the activity has no exact start/end (legacy activity)', async () => {
      repo.findActivityForBatch.mockResolvedValue(activity({ startAt: null, endAt: null }));
      const result = await service.getBatch(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID);
      expect(result.eligible).toBe(false);
    });

    it('is not eligible when no soft skill was selected', async () => {
      repo.findActivityForBatch.mockResolvedValue(activity({ softSkills: [] }));
      const result = await service.getBatch(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID);
      expect(result.eligible).toBe(false);
    });

    it('rejects saving for an ineligible activity', async () => {
      repo.findActivityForBatch.mockResolvedValue(activity({ registrationType: 'participant' }));
      await expect(
        service.saveBatch(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID, { groups: [], exceptions: [] }),
      ).rejects.toThrow(BadRequestException);
      expect(repo.replaceBatchState).not.toHaveBeenCalled();
    });
  });

  describe('getBatch', () => {
    it('groups attended registrations by dutyRole in dutyRoleOptions order, falling back to activity defaults', async () => {
      repo.findAttendedForBatch.mockResolvedValue([registration(3, 'ฝ่ายB'), registration(1, 'ฝ่ายA')]);

      const result: any = await service.getBatch(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID);

      expect(result.groups.map((g: any) => g.dutyRole)).toEqual(['ฝ่ายA', 'ฝ่ายB']);
      expect(result.groups[0].baseline).toEqual({ leadership: 3, communication: 2 });
    });

    it('prefers a persisted baseline and reports exceptions with their reason', async () => {
      repo.findBaselinesByActivity.mockResolvedValue([{ dutyRole: 'ฝ่ายA', skillType: 'leadership', score: 5 }]);
      repo.findAttendedForBatch.mockResolvedValue([
        registration(1, 'ฝ่ายA', {
          evaluationExceptions: [{ skillType: 'leadership', score: 2, reason: 'ขาดงาน' }],
        }),
      ]);

      const result: any = await service.getBatch(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID);

      expect(result.groups[0].baseline.leadership).toBe(5);
      expect(result.groups[0].members[0].exceptions.leadership).toEqual({ score: 2, reason: 'ขาดงาน' });
    });

    it('counts checked-in registrations that have no dutyRole instead of silently dropping them', async () => {
      repo.findAttendedForBatch.mockResolvedValue([registration(1, 'ฝ่ายA'), registration(2, null)]);
      const result: any = await service.getBatch(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID);
      expect(result.withoutDutyRole).toBe(1);
      expect(result.groups).toHaveLength(1);
    });
  });

  describe('saveBatch — score precedence: exception > group baseline > activity default', () => {
    it('writes computed scores for every checked-in registration in one repository call', async () => {
      await service.saveBatch(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID, {
        groups: [{ dutyRole: 'ฝ่ายA', scores: [{ skillType: 'leadership', score: 5 }] }],
        exceptions: [
          { registrationId: 2, scores: [{ skillType: 'leadership', score: 2 }], reason: '  ขาดงาน 1 จาก 4 วัน ' },
        ],
      } as any);

      expect(repo.replaceBatchState).toHaveBeenCalledTimes(1);
      const [activityId, updatedById, baselines, exceptions, updates] = repo.replaceBatchState.mock.calls[0];
      expect(activityId).toBe(ACTIVITY_ID);
      expect(updatedById).toBe(OWNER_ID);
      expect(baselines).toEqual([{ dutyRole: 'ฝ่ายA', skillType: 'leadership', score: 5 }]);
      // เหตุผลถูก trim ก่อนเก็บ
      expect(exceptions).toEqual([
        { registrationId: 2, skillType: 'leadership', score: 2, reason: 'ขาดงาน 1 จาก 4 วัน' },
      ]);

      const byId = Object.fromEntries(updates.map((u: any) => [u.registrationId, u.scores]));
      expect(byId[1]).toEqual({ leadership: 5, communication: 2 }); // ฐานของฝ่าย + ค่าเริ่มต้นของทักษะที่ไม่ได้ตั้งฐาน
      expect(byId[2]).toEqual({ leadership: 2, communication: 2 }); // ข้อยกเว้นชนะฐานของฝ่าย
      expect(byId[3]).toEqual({ leadership: 3, communication: 2 }); // ฝ่าย B ไม่มีฐาน → ค่าเริ่มต้นของกิจกรรม
    });

    it('skips a checked-in registration that somehow has no Evaluation row', async () => {
      repo.findAttendedForBatch.mockResolvedValue([registration(1, 'ฝ่ายA', { evaluation: null })]);
      await service.saveBatch(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID, { groups: [], exceptions: [] });
      expect(repo.replaceBatchState.mock.calls[0][4]).toEqual([]);
    });
  });

  describe('saveBatch — validation', () => {
    const save = (dto: any) => service.saveBatch(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID, dto);

    it('rejects a skill the activity does not evaluate', async () => {
      await expect(
        save({ groups: [{ dutyRole: 'ฝ่ายA', scores: [{ skillType: 'creativity', score: 3 }] }], exceptions: [] }),
      ).rejects.toThrow(BadRequestException);
      expect(repo.replaceBatchState).not.toHaveBeenCalled();
    });

    it('rejects an unknown dutyRole', async () => {
      await expect(
        save({ groups: [{ dutyRole: 'ฝ่ายไม่มีจริง', scores: [{ skillType: 'leadership', score: 3 }] }], exceptions: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects the same group listed twice', async () => {
      const group = { dutyRole: 'ฝ่ายA', scores: [{ skillType: 'leadership', score: 3 }] };
      await expect(save({ groups: [group, group], exceptions: [] })).rejects.toThrow(BadRequestException);
    });

    it('rejects the same skill listed twice within one group', async () => {
      await expect(
        save({
          groups: [
            {
              dutyRole: 'ฝ่ายA',
              scores: [
                { skillType: 'leadership', score: 3 },
                { skillType: 'leadership', score: 5 },
              ],
            },
          ],
          exceptions: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an exception for a registration that is not checked in to this activity', async () => {
      await expect(
        save({
          groups: [],
          exceptions: [{ registrationId: 999, scores: [{ skillType: 'leadership', score: 2 }], reason: 'x' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an exception with a blank or whitespace-only reason', async () => {
      await expect(
        save({
          groups: [],
          exceptions: [{ registrationId: 1, scores: [{ skillType: 'leadership', score: 2 }], reason: '   ' }],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repo.replaceBatchState).not.toHaveBeenCalled();
    });

    it('rejects two exceptions for the same registration', async () => {
      const exception = { registrationId: 1, scores: [{ skillType: 'leadership', score: 2 }], reason: 'x' };
      await expect(save({ groups: [], exceptions: [exception, exception] })).rejects.toThrow(BadRequestException);
    });
  });

  describe('ค่าที่อนุมัติแล้ว (360°) ถูกล็อก', () => {
    const locked = (id: number) =>
      registration(id, 'ฝ่ายA', { evaluation: { leadership: 5, communication: 3, approval: { id: 9 } } });

    it('saveBatch ไม่เขียนทับคนที่ผ่านการอนุมัติแล้ว แต่ยังคำนวณให้คนอื่นตามปกติ', async () => {
      repo.findAttendedForBatch.mockResolvedValue([registration(1, 'ฝ่ายA'), locked(2)]);

      await service.saveBatch(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID, {
        groups: [{ dutyRole: 'ฝ่ายA', scores: [{ skillType: 'leadership', score: 2 }] }],
        exceptions: [],
      } as any);

      const updates = repo.replaceBatchState.mock.calls[0][4];
      expect(updates.map((u: any) => u.registrationId)).toEqual([1]);
    });

    it('getBatch รายงานจำนวนคนที่อนุมัติแล้ว เพื่อให้หน้าจอบอกผู้จัดว่าการแก้ไขไม่กระทบคนเหล่านั้น', async () => {
      repo.findAttendedForBatch.mockResolvedValue([registration(1, 'ฝ่ายA'), locked(2), locked(3)]);
      const result: any = await service.getBatch(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID);
      expect(result.approvedCount).toBe(2);
    });

    it('กิจกรรมที่ไม่เข้าเงื่อนไข: approvedCount = 0', async () => {
      repo.findActivityForBatch.mockResolvedValue(activity({ registrationType: 'participant' }));
      const result: any = await service.getBatch(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID);
      expect(result.approvedCount).toBe(0);
    });
  });
});
