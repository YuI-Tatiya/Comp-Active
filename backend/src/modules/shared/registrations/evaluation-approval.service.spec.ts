import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EvaluationApprovalService } from './evaluation-approval.service';
import { EvaluationsRepository } from './evaluation.repository';
import { AssessmentsRepository } from './assessment.repository';
import { EvaluationApprovalRepository } from './evaluation-approval.repository';
import { UserRole } from '../../../common/enums/role.enum';

const OWNER_ID = 10;
const ACTIVITY_ID = 1;

function activity(overrides: Record<string, unknown> = {}) {
  return {
    id: ACTIVITY_ID,
    organizerId: OWNER_ID,
    status: 'completed',
    peerAssessmentEnabled: true,
    registrationType: 'staff_volunteer',
    // 96 ชม. (>72) → ปลดล็อกระดับ 5 = Tier 3
    startAt: new Date('2027-01-01T09:00:00.000Z'),
    endAt: new Date('2027-01-05T09:00:00.000Z'),
    softSkills: [
      { skillType: 'leadership', rate: 3 },
      { skillType: 'communication', rate: 2 },
    ],
    event: null,
    ...overrides,
  };
}

function attended(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    dutyRole: 'ฝ่ายA',
    student: { name: `Student ${id}`, studentId: `65338000${id}-1` },
    evaluation: { id: id * 10, leadership: 3, communication: 2, approval: null },
    evaluationExceptions: [],
    ...overrides,
  };
}

/** ใบงานที่ส่งแล้ว: assessor ให้ target ระดับต่อทักษะ (assessor = target = ตนเอง) */
function submitted(assessor: number, target: number, leadership: number, communication: number) {
  return {
    assessorRegistrationId: assessor,
    targetRegistrationId: target,
    source: assessor === target ? 'self' : 'peer',
    scores: [
      { skillType: 'leadership', score: leadership },
      { skillType: 'communication', score: communication },
    ],
  };
}

/** ตนเอง + เพื่อน 2 คน ให้ค่าเท่าค่าเริ่มต้นของกิจกรรม (3/2) → ไม่มีข้อขัดแย้ง */
function consistentFor(target: number, assessors: [number, number]) {
  return [
    submitted(target, target, 3, 2),
    submitted(assessors[0], target, 3, 2),
    submitted(assessors[1], target, 3, 2),
  ];
}

describe('EvaluationApprovalService', () => {
  let service: EvaluationApprovalService;
  let evalRepo: { findRegistrationWithActivity: jest.Mock; findAttendedForBatch: jest.Mock; findBaselinesByActivity: jest.Mock };
  let assessRepo: { findActivityForAssessment: jest.Mock };
  let approvalRepo: { findSubmittedScoresByActivity: jest.Mock; findApprovalsByActivity: jest.Mock; approveMany: jest.Mock };

  beforeEach(() => {
    evalRepo = {
      findRegistrationWithActivity: jest.fn().mockResolvedValue({ id: 1, activityId: ACTIVITY_ID }),
      findAttendedForBatch: jest.fn().mockResolvedValue([attended(1), attended(2), attended(3), attended(4)]),
      findBaselinesByActivity: jest.fn().mockResolvedValue([]),
    };
    assessRepo = { findActivityForAssessment: jest.fn().mockResolvedValue(activity()) };
    approvalRepo = {
      findSubmittedScoresByActivity: jest.fn().mockResolvedValue([]),
      findApprovalsByActivity: jest.fn().mockResolvedValue([]),
      approveMany: jest.fn().mockResolvedValue(undefined),
    };
    service = new EvaluationApprovalService(
      evalRepo as unknown as EvaluationsRepository,
      assessRepo as unknown as AssessmentsRepository,
      approvalRepo as unknown as EvaluationApprovalRepository,
    );
  });

  /** 4 คน: 1 พร้อม, 2 ตนเองไม่ส่ง, 3 มีข้อยกเว้น, 4 อนุมัติแล้ว */
  function mixedScenario() {
    evalRepo.findAttendedForBatch.mockResolvedValue([
      attended(1),
      attended(2),
      attended(3, { evaluationExceptions: [{ skillType: 'leadership', score: 5, reason: 'ทำงานเกินหน้าที่' }] }),
      attended(4, { evaluation: { id: 40, leadership: 5, communication: 3, approval: { id: 1 } } }),
    ]);
    approvalRepo.findSubmittedScoresByActivity.mockResolvedValue([
      ...consistentFor(1, [2, 3]),
      // คน 2: เพื่อนส่งครบ 2 คน แต่ตนเองไม่ส่ง
      submitted(1, 2, 3, 2),
      submitted(3, 2, 3, 2),
      // คน 3: ตนเอง + เพื่อนครบ (แต่ผู้จัดตั้งข้อยกเว้นไว้)
      ...consistentFor(3, [1, 2]),
    ]);
    approvalRepo.findApprovalsByActivity.mockResolvedValue([
      {
        registrationId: 4,
        overrideReason: 'ทำงานเกินหน้าที่',
        breakdown: {
          leadership: { organizer: 3, self: 5, peer: 5, peerCount: 2, recommended: 5, final: 5 },
          communication: { organizer: 2, self: 3, peer: 3, peerCount: 2, recommended: 3, final: 3 },
        },
      },
    ]);
  }

  describe('สิทธิ์และเงื่อนไข', () => {
    it('ไม่พบกิจกรรม → NotFoundException', async () => {
      assessRepo.findActivityForAssessment.mockResolvedValue(null);
      await expect(service.getApproval(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID)).rejects.toThrow(NotFoundException);
    });

    it('ผู้จัดคนอื่น → ForbiddenException ทั้งดูและอนุมัติ และไม่เขียนอะไร', async () => {
      await expect(service.getApproval(999, UserRole.ORGANIZER, ACTIVITY_ID)).rejects.toThrow(ForbiddenException);
      await expect(service.approveOne(999, UserRole.ORGANIZER, 1, {})).rejects.toThrow(ForbiddenException);
      await expect(service.approveReady(999, UserRole.ORGANIZER, ACTIVITY_ID, { registrationIds: [1] })).rejects.toThrow(
        ForbiddenException,
      );
      expect(approvalRepo.approveMany).not.toHaveBeenCalled();
    });

    it('admin ที่ไม่ใช่เจ้าของทำได้', async () => {
      await expect(service.getApproval(999, UserRole.ADMIN, ACTIVITY_ID)).resolves.toEqual(
        expect.objectContaining({ available: true }),
      );
    });

    it.each([
      ['ไม่ใช่ Tier 3', { registrationType: 'participant' }],
      ['ยังไม่เปิดโหมดประเมินรอบด้าน', { peerAssessmentEnabled: false }],
      ['กิจกรรมยังไม่จบ', { status: 'open' }],
    ])('%s → available:false พร้อมเหตุผล (หน้าจอบอกทางไปต่อ) และไม่อ่านข้อมูลดิบ', async (_label, overrides) => {
      assessRepo.findActivityForAssessment.mockResolvedValue(activity(overrides));

      const result = await service.getApproval(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID);

      expect(result.available).toBe(false);
      expect(result.reason).toBeTruthy();
      expect(result.rows).toEqual([]);
      expect(evalRepo.findAttendedForBatch).not.toHaveBeenCalled();
    });

    it.each([
      ['ไม่ใช่ Tier 3', { registrationType: 'participant' }],
      ['ยังไม่เปิดโหมด', { peerAssessmentEnabled: false }],
      ['กิจกรรมยังไม่จบ', { status: 'open' }],
    ])('อนุมัติ: %s → BadRequestException และไม่เขียน', async (_label, overrides) => {
      assessRepo.findActivityForAssessment.mockResolvedValue(activity(overrides));

      await expect(service.approveOne(OWNER_ID, UserRole.ORGANIZER, 1, {})).rejects.toThrow(BadRequestException);
      await expect(
        service.approveReady(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID, { registrationIds: [1] }),
      ).rejects.toThrow(BadRequestException);
      expect(approvalRepo.approveMany).not.toHaveBeenCalled();
    });
  });

  describe('getApproval — จัดกลุ่มและนับผล', () => {
    it('ต้องตรวจสอบก่อน → พร้อมอนุมัติ → อนุมัติแล้ว พร้อมสรุปจำนวน', async () => {
      mixedScenario();
      const result = await service.getApproval(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID);

      expect(result.summary).toEqual({ total: 4, approved: 1, ready: 1, flagged: 2 });
      expect(result.rows.map((r) => r.registrationId)).toEqual([2, 3, 1, 4]);
      expect(result.cap).toBe(5);
      expect(result.skills).toEqual(['leadership', 'communication']);
    });

    it('ระบุเหตุผลของ flag ถูกต้องต่อคน', async () => {
      mixedScenario();
      const { rows } = await service.getApproval(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID);
      const flagsOf = (id: number) => rows.find((r) => r.registrationId === id)!.flags;

      expect(flagsOf(1)).toEqual([]);
      expect(flagsOf(2)).toEqual(['self_missing']);
      expect(flagsOf(3)).toEqual(['has_exception']);
      expect(flagsOf(4)).toEqual([]);
    });

    it('คำนวณค่าต่อทักษะ: ผู้จัด (ข้อยกเว้น ?? ฐานฝ่าย ?? ค่าเริ่มต้น), ตนเอง, เพื่อน(เฉลี่ย/จำนวน), ที่แนะนำ', async () => {
      mixedScenario();
      evalRepo.findBaselinesByActivity.mockResolvedValue([{ dutyRole: 'ฝ่ายA', skillType: 'communication', score: 5 }]);
      const { rows } = await service.getApproval(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID);

      const p3 = rows.find((r) => r.registrationId === 3)!;
      const leadership = p3.skills.find((s) => s.skillType === 'leadership')!;
      const communication = p3.skills.find((s) => s.skillType === 'communication')!;

      expect(leadership).toMatchObject({ organizer: 5, self: 3, peer: 3, peerCount: 2, final: null }); // ข้อยกเว้นชนะ
      expect(communication).toMatchObject({ organizer: 5, self: 2, peer: 2, peerCount: 2 }); // ฐานของฝ่ายชนะค่าเริ่มต้น
      // 0.5·5 + 0.2·3 + 0.3·3 = 4.0 → เสมอกัน ปัดขึ้น = 5
      expect(leadership.recommended).toBe(5);
    });

    it('แถวที่อนุมัติแล้วแสดงจากค่าที่ล็อกไว้ ไม่คำนวณใหม่ และไม่ติดธง', async () => {
      mixedScenario();
      const { rows } = await service.getApproval(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID);
      const approved = rows.find((r) => r.registrationId === 4)!;

      expect(approved.approved).toBe(true);
      expect(approved.overrideReason).toBe('ทำงานเกินหน้าที่');
      expect(approved.skills.find((s) => s.skillType === 'leadership')).toMatchObject({ self: 5, final: 5 });
    });

    it('ไม่คืนตัวตนผู้ให้คะแนน (ใครให้ใคร) ในผลลัพธ์', async () => {
      mixedScenario();
      const result = await service.getApproval(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID);
      expect(JSON.stringify(result)).not.toMatch(/assessor/i);
    });

    it('ผู้เข้าร่วมที่ไม่มีแถว Evaluation ถูกข้าม', async () => {
      evalRepo.findAttendedForBatch.mockResolvedValue([attended(1, { evaluation: null })]);
      const result = await service.getApproval(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID);
      expect(result.rows).toEqual([]);
    });
  });

  describe('approveOne', () => {
    beforeEach(mixedScenario);

    it('ไม่ส่ง scores = ยอมรับที่ระบบแนะนำ: เขียนค่า + breakdown + ผู้อนุมัติ โดยไม่มีเหตุผล', async () => {
      await service.approveOne(OWNER_ID, UserRole.ORGANIZER, 1, {});

      expect(approvalRepo.approveMany).toHaveBeenCalledTimes(1);
      const [writes, approvedById] = approvalRepo.approveMany.mock.calls[0];
      expect(approvedById).toBe(OWNER_ID);
      expect(writes).toHaveLength(1);
      expect(writes[0]).toMatchObject({
        evaluationId: 10,
        scores: { leadership: 3, communication: 2 },
        overrideReason: null,
      });
      expect(writes[0].breakdown.leadership).toMatchObject({ organizer: 3, self: 3, peer: 3, recommended: 3, final: 3 });
    });

    it('คืนหน้าสรุปล่าสุดหลังอนุมัติ', async () => {
      const result = await service.approveOne(OWNER_ID, UserRole.ORGANIZER, 1, {});
      expect(result).toEqual(expect.objectContaining({ available: true, summary: expect.any(Object) }));
    });

    it('อนุมัติคนที่ติดธงได้ (ผู้จัดตรวจแล้วยอมรับค่าที่แนะนำ)', async () => {
      await service.approveOne(OWNER_ID, UserRole.ORGANIZER, 2, {});
      expect(approvalRepo.approveMany).toHaveBeenCalled();
    });

    it('ส่งค่าเท่ากับที่แนะนำ: ไม่ต้องมีเหตุผล และไม่เก็บเหตุผลที่ส่งมาเกิน', async () => {
      await service.approveOne(OWNER_ID, UserRole.ORGANIZER, 1, {
        scores: [
          { skillType: 'leadership', score: 3 },
          { skillType: 'communication', score: 2 },
        ],
        reason: 'ไม่จำเป็น',
      } as any);

      expect(approvalRepo.approveMany.mock.calls[0][0][0].overrideReason).toBeNull();
    });

    it('ค่าที่เลือกต่างจากที่แนะนำ: ต้องมีเหตุผล (ว่าง/ช่องว่าง/ไม่ส่ง → BadRequest)', async () => {
      const scores = [
        { skillType: 'leadership', score: 5 },
        { skillType: 'communication', score: 2 },
      ] as any;

      await expect(service.approveOne(OWNER_ID, UserRole.ORGANIZER, 1, { scores })).rejects.toThrow(BadRequestException);
      await expect(service.approveOne(OWNER_ID, UserRole.ORGANIZER, 1, { scores, reason: '   ' })).rejects.toThrow(
        BadRequestException,
      );
      expect(approvalRepo.approveMany).not.toHaveBeenCalled();
    });

    it('ต่างจากที่แนะนำและมีเหตุผล → บันทึกค่าที่เลือกพร้อมเหตุผลที่ตัดช่องว่างแล้ว', async () => {
      await service.approveOne(OWNER_ID, UserRole.ORGANIZER, 1, {
        scores: [
          { skillType: 'leadership', score: 5 },
          { skillType: 'communication', score: 2 },
        ],
        reason: '  รับผิดชอบทั้งค่าย  ',
      } as any);

      const write = approvalRepo.approveMany.mock.calls[0][0][0];
      expect(write.scores).toEqual({ leadership: 5, communication: 2 });
      expect(write.overrideReason).toBe('รับผิดชอบทั้งค่าย');
      expect(write.breakdown.leadership).toMatchObject({ recommended: 3, final: 5 });
    });

    it.each([
      ['ให้ไม่ครบทุกทักษะ', [{ skillType: 'leadership', score: 3 }]],
      ['ทักษะที่กิจกรรมไม่ได้ประเมิน', [{ skillType: 'leadership', score: 3 }, { skillType: 'creativity', score: 3 }]],
      ['ทักษะซ้ำ', [{ skillType: 'leadership', score: 3 }, { skillType: 'leadership', score: 5 }]],
    ])('%s → BadRequestException', async (_label, scores) => {
      await expect(
        service.approveOne(OWNER_ID, UserRole.ORGANIZER, 1, { scores: scores as any, reason: 'x' }),
      ).rejects.toThrow(BadRequestException);
      expect(approvalRepo.approveMany).not.toHaveBeenCalled();
    });

    it('อนุมัติซ้ำคนที่อนุมัติแล้ว = แก้ค่าได้ (upsert ทับ) เมื่อมีเหตุผล', async () => {
      await service.approveOne(OWNER_ID, UserRole.ORGANIZER, 4, {
        scores: [
          { skillType: 'leadership', score: 2 },
          { skillType: 'communication', score: 2 },
        ],
        reason: 'ผู้จัดตรวจซ้ำ',
      } as any);

      expect(approvalRepo.approveMany).toHaveBeenCalledTimes(1);
      expect(approvalRepo.approveMany.mock.calls[0][0][0].evaluationId).toBe(40);
    });

    it('ไม่พบใบลงทะเบียน → NotFoundException', async () => {
      evalRepo.findRegistrationWithActivity.mockResolvedValue(null);
      await expect(service.approveOne(OWNER_ID, UserRole.ORGANIZER, 999, {})).rejects.toThrow(NotFoundException);
    });

    it('ใบลงทะเบียนที่ยังไม่เช็คอิน (ไม่อยู่ในรายการ) → BadRequestException', async () => {
      evalRepo.findRegistrationWithActivity.mockResolvedValue({ id: 77, activityId: ACTIVITY_ID });
      await expect(service.approveOne(OWNER_ID, UserRole.ORGANIZER, 77, {})).rejects.toThrow(BadRequestException);
    });

    it('ผู้จัดของกิจกรรมอื่นอนุมัติใบลงทะเบียนของกิจกรรมเรา → ForbiddenException (ตรวจที่กิจกรรมของใบลงทะเบียน ไม่ใช่ที่ client ส่งมา)', async () => {
      await expect(service.approveOne(999, UserRole.ORGANIZER, 1, {})).rejects.toThrow(ForbiddenException);
    });
  });

  describe('approveReady — อนุมัติทั้งหมดที่ไม่มีข้อขัดแย้ง', () => {
    beforeEach(mixedScenario);

    it('อนุมัติเฉพาะรายที่พร้อม ข้ามคนติดธง คนที่อนุมัติแล้ว และ id ที่ไม่ใช่ของกิจกรรมนี้', async () => {
      const result = await service.approveReady(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID, {
        registrationIds: [1, 2, 3, 4, 999],
      });

      expect(result.approved).toBe(1);
      expect(result.skipped).toEqual(
        expect.arrayContaining([
          { registrationId: 2, reason: 'flagged' },
          { registrationId: 3, reason: 'flagged' },
          { registrationId: 4, reason: 'already_approved' },
          { registrationId: 999, reason: 'not_found' },
        ]),
      );
      const writes = approvalRepo.approveMany.mock.calls[0][0];
      expect(writes.map((w: any) => w.evaluationId)).toEqual([10]);
      expect(writes[0].overrideReason).toBeNull();
    });

    it('server ตัดสินใหม่เอง: id ที่หน้าจอคิดว่า "พร้อม" แต่ตอนนี้ติดธงแล้ว จะไม่ถูกอนุมัติ', async () => {
      // หน้าจอเก่าเห็นคน 2 พร้อม (สมมติ) แต่ข้อมูลจริงตอนนี้ตนเองยังไม่ส่ง
      const result = await service.approveReady(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID, { registrationIds: [2] });

      expect(result).toEqual({ approved: 0, skipped: [{ registrationId: 2, reason: 'flagged' }] });
      expect(approvalRepo.approveMany).not.toHaveBeenCalled();
    });

    it('id ซ้ำในคำขอนับครั้งเดียว และทั้งชุดเขียนในการเรียก approveMany ครั้งเดียว', async () => {
      const result = await service.approveReady(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID, { registrationIds: [1, 1, 1] });

      expect(result.approved).toBe(1);
      expect(approvalRepo.approveMany).toHaveBeenCalledTimes(1);
      expect(approvalRepo.approveMany.mock.calls[0][0]).toHaveLength(1);
    });
  });
});
