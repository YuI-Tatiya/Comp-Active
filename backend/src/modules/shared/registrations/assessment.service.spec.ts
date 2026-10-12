import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AssessmentsService } from './assessment.service';
import { AssessmentsRepository } from './assessment.repository';
import { UserRole } from '../../../common/enums/role.enum';

const OWNER_ID = 10;
const ACTIVITY_ID = 1;
const STUDENT_ID = 50;
const REGISTRATION_ID = 100;

function activity(overrides: Record<string, unknown> = {}) {
  return {
    id: ACTIVITY_ID,
    organizerId: OWNER_ID,
    status: 'completed',
    peerAssessmentEnabled: true,
    registrationType: 'staff_volunteer',
    // 96 ชม. (>72) → ปลดล็อกระดับ 5 โดยไม่ต้องเป็นโครงการ = Tier 3
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

function attended(id: number, dutyRole: string | null = 'ฝ่ายA') {
  return { id, dutyRole, student: { name: `Student ${id}` } };
}

function assignment(assessor: number, target: number, submitted = false) {
  return {
    id: assessor * 1000 + target,
    assessorRegistrationId: assessor,
    targetRegistrationId: target,
    source: assessor === target ? 'self' : 'peer',
    submittedAt: submitted ? new Date() : null,
  };
}

describe('AssessmentsService', () => {
  let service: AssessmentsService;
  let repo: {
    findActivityForAssessment: jest.Mock;
    setEnabled: jest.Mock;
    findAttendedRegistrations: jest.Mock;
    findAssignmentsByActivity: jest.Mock;
    createAssignments: jest.Mock;
    findRegistrationForStudent: jest.Mock;
    findAssignmentsByAssessor: jest.Mock;
    findAssignmentForSubmit: jest.Mock;
    submitAssignment: jest.Mock;
  };

  beforeEach(() => {
    repo = {
      findActivityForAssessment: jest.fn().mockResolvedValue(activity()),
      setEnabled: jest.fn().mockResolvedValue(undefined),
      findAttendedRegistrations: jest.fn().mockResolvedValue([1, 2, 3, 4].map((id) => attended(id))),
      findAssignmentsByActivity: jest.fn().mockResolvedValue([]),
      createAssignments: jest.fn().mockResolvedValue({ count: 0 }),
      findRegistrationForStudent: jest.fn().mockResolvedValue({
        id: REGISTRATION_ID,
        studentId: STUDENT_ID,
        attendance: 'attended',
        activity: {
          id: ACTIVITY_ID,
          status: 'completed',
          peerAssessmentEnabled: true,
          softSkills: [{ skillType: 'leadership' }, { skillType: 'communication' }],
        },
      }),
      findAssignmentsByAssessor: jest.fn().mockResolvedValue([]),
      findAssignmentForSubmit: jest.fn().mockResolvedValue({
        id: 7,
        submittedAt: null,
        assessor: { studentId: STUDENT_ID },
        activity: {
          status: 'completed',
          peerAssessmentEnabled: true,
          softSkills: [{ skillType: 'leadership' }, { skillType: 'communication' }],
        },
      }),
      submitAssignment: jest.fn().mockResolvedValue(true),
    };
    service = new AssessmentsService(repo as unknown as AssessmentsRepository);
  });

  describe('ensurePairings', () => {
    it('สร้างใบประเมินตนเองให้ทุกคนที่เช็คอิน และจับคู่เพื่อนให้ทุกคนให้/รับ 2 พอดี', async () => {
      await service.ensurePairings(ACTIVITY_ID);

      const rows = repo.createAssignments.mock.calls[0][0];
      const self = rows.filter((r: any) => r.source === 'self');
      const peer = rows.filter((r: any) => r.source === 'peer');

      expect(self.map((r: any) => r.assessorRegistrationId).sort()).toEqual([1, 2, 3, 4]);
      expect(self.every((r: any) => r.assessorRegistrationId === r.targetRegistrationId)).toBe(true);
      expect(peer).toHaveLength(8);
      expect(peer.every((r: any) => r.assessorRegistrationId !== r.targetRegistrationId)).toBe(true);
      expect(rows.every((r: any) => r.activityId === ACTIVITY_ID)).toBe(true);
    });

    it('เรียกซ้ำเมื่อสร้างครบแล้วไม่เขียนอะไรเพิ่ม (idempotent)', async () => {
      const done = [
        ...[1, 2, 3, 4].map((id) => assignment(id, id)),
        assignment(1, 2), assignment(2, 3), assignment(3, 4), assignment(4, 1),
        assignment(1, 3), assignment(2, 4), assignment(3, 1), assignment(4, 2),
      ];
      repo.findAssignmentsByActivity.mockResolvedValue(done);

      await service.ensurePairings(ACTIVITY_ID);

      expect(repo.createAssignments).not.toHaveBeenCalled();
    });

    it('คนเช็คอินทีหลังได้ใบประเมินตนเอง แต่ไม่ถูกจับคู่เพื่อนถ้าคนใหม่มีไม่ถึง 3 คน (ไม่แตะคู่เดิม)', async () => {
      repo.findAttendedRegistrations.mockResolvedValue([1, 2, 3, 4, 5].map((id) => attended(id)));
      repo.findAssignmentsByActivity.mockResolvedValue([
        ...[1, 2, 3, 4].map((id) => assignment(id, id)),
        assignment(1, 2), assignment(2, 3), assignment(3, 4), assignment(4, 1),
        assignment(1, 3), assignment(2, 4), assignment(3, 1), assignment(4, 2),
      ]);

      await service.ensurePairings(ACTIVITY_ID);

      const rows = repo.createAssignments.mock.calls[0][0];
      expect(rows).toEqual([{ activityId: ACTIVITY_ID, assessorRegistrationId: 5, targetRegistrationId: 5, source: 'self' }]);
    });

    it('ไม่มีใครเช็คอินก็ไม่สร้างอะไร', async () => {
      repo.findAttendedRegistrations.mockResolvedValue([]);
      await service.ensurePairings(ACTIVITY_ID);
      expect(repo.createAssignments).not.toHaveBeenCalled();
    });
  });

  describe('setEnabled', () => {
    it('เจ้าของกิจกรรมเปิดโหมดได้ และถ้ากิจกรรมจบแล้วจะสร้างใบงานทันที', async () => {
      const state = await service.setEnabled(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID, true);

      expect(repo.setEnabled).toHaveBeenCalledWith(ACTIVITY_ID, true);
      expect(repo.createAssignments).toHaveBeenCalled();
      expect(state.eligible).toBe(true);
    });

    it('ผู้จัดคนอื่นได้ ForbiddenException และไม่เขียนอะไร', async () => {
      await expect(service.setEnabled(999, UserRole.ORGANIZER, ACTIVITY_ID, true)).rejects.toThrow(ForbiddenException);
      expect(repo.setEnabled).not.toHaveBeenCalled();
    });

    it('admin ที่ไม่ใช่เจ้าของทำได้', async () => {
      await expect(service.setEnabled(999, UserRole.ADMIN, ACTIVITY_ID, true)).resolves.toBeDefined();
    });

    it('ไม่พบกิจกรรม → NotFoundException', async () => {
      repo.findActivityForAssessment.mockResolvedValue(null);
      await expect(service.setEnabled(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID, true)).rejects.toThrow(NotFoundException);
    });

    it('กิจกรรมที่ไม่ใช่ Tier 3 เปิดไม่ได้ (BadRequest พร้อมเหตุผล)', async () => {
      repo.findActivityForAssessment.mockResolvedValue(activity({ registrationType: 'participant' }));
      await expect(service.setEnabled(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID, true)).rejects.toThrow(BadRequestException);
      expect(repo.setEnabled).not.toHaveBeenCalled();
    });

    it('ปิดโหมดได้เสมอแม้กิจกรรมไม่เข้าเงื่อนไขแล้ว (เช่น ผู้จัดแก้ระยะเวลาภายหลัง)', async () => {
      repo.findActivityForAssessment.mockResolvedValue(activity({ registrationType: 'participant', peerAssessmentEnabled: true }));
      await service.setEnabled(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID, false);
      expect(repo.setEnabled).toHaveBeenCalledWith(ACTIVITY_ID, false);
    });

    it('เปิดโหมดก่อนกิจกรรมจบ: ยังไม่สร้างใบงาน', async () => {
      repo.findActivityForAssessment.mockResolvedValue(activity({ status: 'open', peerAssessmentEnabled: false }));
      await service.setEnabled(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID, true);
      expect(repo.createAssignments).not.toHaveBeenCalled();
    });
  });

  describe('getOrganizerState', () => {
    it('ผู้จัดคนอื่น → ForbiddenException', async () => {
      await expect(service.getOrganizerState(999, UserRole.ORGANIZER, ACTIVITY_ID)).rejects.toThrow(ForbiddenException);
    });

    it('กิจกรรมไม่เข้าเงื่อนไข → eligible:false พร้อมเหตุผล และไม่แตะใบงาน', async () => {
      repo.findActivityForAssessment.mockResolvedValue(activity({ registrationType: 'participant' }));
      const state = await service.getOrganizerState(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID);

      expect(state.eligible).toBe(false);
      expect(state.reason).toBeTruthy();
      expect(state.enabled).toBe(false);
      expect(repo.createAssignments).not.toHaveBeenCalled();
    });

    it('ยังไม่เปิดโหมด → ไม่มี progress และไม่สร้างใบงาน', async () => {
      repo.findActivityForAssessment.mockResolvedValue(activity({ peerAssessmentEnabled: false }));
      const state = await service.getOrganizerState(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID);

      expect(state).toEqual(expect.objectContaining({ eligible: true, enabled: false, progress: null, pending: [] }));
      expect(repo.createAssignments).not.toHaveBeenCalled();
    });

    it('เปิดโหมดแต่กิจกรรมยังไม่จบ → completed:false ไม่มี progress ยังไม่สร้างใบงาน', async () => {
      repo.findActivityForAssessment.mockResolvedValue(activity({ status: 'open' }));
      const state = await service.getOrganizerState(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID);

      expect(state).toEqual(expect.objectContaining({ enabled: true, completed: false, progress: null }));
      expect(repo.createAssignments).not.toHaveBeenCalled();
    });

    it('นับความคืบหน้าและรายชื่อคนค้างส่งจากใบงานที่มีอยู่ (ไม่คืนคะแนน/ตัวตนผู้ให้)', async () => {
      repo.findAttendedRegistrations.mockResolvedValue([1, 2, 3].map((id) => attended(id)));
      repo.findAssignmentsByActivity.mockResolvedValue([
        assignment(1, 1, true), assignment(2, 2, true), assignment(3, 3, false),
        assignment(1, 2, true), assignment(1, 3, true),
        assignment(2, 1, true), assignment(2, 3, false),
        assignment(3, 1, false), assignment(3, 2, false),
      ]);

      const state = await service.getOrganizerState(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID);

      expect(state.progress).toEqual({ self: { submitted: 2, total: 3 }, peer: { submitted: 3, total: 6 } });
      expect(state.pending).toEqual([
        { registrationId: 2, name: 'Student 2', selfDone: true, peerGiven: 1, peerTotal: 2 },
        { registrationId: 3, name: 'Student 3', selfDone: false, peerGiven: 0, peerTotal: 2 },
      ]);
      expect(JSON.stringify(state)).not.toMatch(/score/i);
    });
  });

  describe('getMyTasks', () => {
    it('ใบลงทะเบียนของคนอื่น → NotFoundException (ไม่บอกว่ามีอยู่จริง)', async () => {
      await expect(service.getMyTasks(999, REGISTRATION_ID)).rejects.toThrow(NotFoundException);
    });

    it('ยังไม่เช็คอิน → BadRequestException', async () => {
      repo.findRegistrationForStudent.mockResolvedValue({
        id: REGISTRATION_ID, studentId: STUDENT_ID, attendance: 'absent',
        activity: { id: ACTIVITY_ID, status: 'completed', peerAssessmentEnabled: true, softSkills: [] },
      });
      await expect(service.getMyTasks(STUDENT_ID, REGISTRATION_ID)).rejects.toThrow(BadRequestException);
    });

    it('กิจกรรมไม่ได้เปิดโหมด → enabled:false ไม่มีใบงาน', async () => {
      repo.findRegistrationForStudent.mockResolvedValue({
        id: REGISTRATION_ID, studentId: STUDENT_ID, attendance: 'attended',
        activity: { id: ACTIVITY_ID, status: 'completed', peerAssessmentEnabled: false, softSkills: [] },
      });
      await expect(service.getMyTasks(STUDENT_ID, REGISTRATION_ID)).resolves.toEqual({
        enabled: false, open: false, skills: [], tasks: [],
      });
    });

    it('เปิดโหมดแต่กิจกรรมยังไม่จบ → open:false และยังไม่สร้างใบงาน', async () => {
      repo.findRegistrationForStudent.mockResolvedValue({
        id: REGISTRATION_ID, studentId: STUDENT_ID, attendance: 'attended',
        activity: { id: ACTIVITY_ID, status: 'open', peerAssessmentEnabled: true, softSkills: [{ skillType: 'leadership' }] },
      });
      const result = await service.getMyTasks(STUDENT_ID, REGISTRATION_ID);

      expect(result).toEqual({ enabled: true, open: false, skills: ['leadership'], tasks: [] });
      expect(repo.createAssignments).not.toHaveBeenCalled();
    });

    it('คืนใบงานโดยตนเองมาก่อน แล้วเพื่อน เฉพาะชื่อผู้ถูกประเมิน (ไม่มีรหัสนักศึกษา/อีเมล) และระดับที่ส่งไปแล้ว', async () => {
      repo.findAssignmentsByAssessor.mockResolvedValue([
        { id: 2, source: 'peer', submittedAt: null, scores: [], target: { dutyRole: 'ฝ่ายA', student: { name: 'เพื่อน ก' } } },
        {
          id: 1, source: 'self', submittedAt: new Date(),
          scores: [{ skillType: 'leadership', score: 3 }, { skillType: 'communication', score: 5 }],
          target: { dutyRole: 'ฝ่ายA', student: { name: 'ตัวเอง' } },
        },
      ]);

      const result = await service.getMyTasks(STUDENT_ID, REGISTRATION_ID);

      expect(result.open).toBe(true);
      expect(result.tasks).toEqual([
        { assignmentId: 1, source: 'self', targetName: null, targetDutyRole: null, submitted: true, myScores: { leadership: 3, communication: 5 } },
        { assignmentId: 2, source: 'peer', targetName: 'เพื่อน ก', targetDutyRole: 'ฝ่ายA', submitted: false, myScores: null },
      ]);
      expect(repo.createAssignments).toHaveBeenCalled();
    });
  });

  describe('submit', () => {
    const scores = (...pairs: [string, number][]) => ({ scores: pairs.map(([skillType, score]) => ({ skillType, score })) }) as any;
    const full = scores(['leadership', 3], ['communication', 5]);

    it('ส่งครบทุกทักษะ ระดับ 2/3/5 → บันทึกสำเร็จ', async () => {
      await expect(service.submit(STUDENT_ID, 7, full)).resolves.toEqual({ message: 'ส่งแบบประเมินสำเร็จ' });
      expect(repo.submitAssignment).toHaveBeenCalledWith(7, full.scores);
    });

    it('ใบงานของคนอื่น → NotFoundException และไม่บันทึก', async () => {
      await expect(service.submit(999, 7, full)).rejects.toThrow(NotFoundException);
      expect(repo.submitAssignment).not.toHaveBeenCalled();
    });

    it('ไม่พบใบงาน → NotFoundException', async () => {
      repo.findAssignmentForSubmit.mockResolvedValue(null);
      await expect(service.submit(STUDENT_ID, 7, full)).rejects.toThrow(NotFoundException);
    });

    it('กิจกรรมปิดโหมดแล้ว → BadRequestException', async () => {
      repo.findAssignmentForSubmit.mockResolvedValue({
        id: 7, submittedAt: null, assessor: { studentId: STUDENT_ID },
        activity: { status: 'completed', peerAssessmentEnabled: false, softSkills: [{ skillType: 'leadership' }] },
      });
      await expect(service.submit(STUDENT_ID, 7, scores(['leadership', 3]))).rejects.toThrow(BadRequestException);
    });

    it('กิจกรรมยังไม่จบ → BadRequestException', async () => {
      repo.findAssignmentForSubmit.mockResolvedValue({
        id: 7, submittedAt: null, assessor: { studentId: STUDENT_ID },
        activity: { status: 'open', peerAssessmentEnabled: true, softSkills: [{ skillType: 'leadership' }] },
      });
      await expect(service.submit(STUDENT_ID, 7, scores(['leadership', 3]))).rejects.toThrow(BadRequestException);
    });

    it('ส่งไปแล้ว → BadRequestException', async () => {
      repo.findAssignmentForSubmit.mockResolvedValue({
        id: 7, submittedAt: new Date(), assessor: { studentId: STUDENT_ID },
        activity: { status: 'completed', peerAssessmentEnabled: true, softSkills: [{ skillType: 'leadership' }] },
      });
      await expect(service.submit(STUDENT_ID, 7, scores(['leadership', 3]))).rejects.toThrow(BadRequestException);
      expect(repo.submitAssignment).not.toHaveBeenCalled();
    });

    it('ส่งพร้อมกันแล้วอีกคำขอปิดใบงานไปก่อน (repo คืน false) → BadRequestException', async () => {
      repo.submitAssignment.mockResolvedValue(false);
      await expect(service.submit(STUDENT_ID, 7, full)).rejects.toThrow(BadRequestException);
    });

    it('ให้ระดับไม่ครบทุกทักษะ → BadRequestException', async () => {
      await expect(service.submit(STUDENT_ID, 7, scores(['leadership', 3]))).rejects.toThrow(BadRequestException);
      expect(repo.submitAssignment).not.toHaveBeenCalled();
    });

    it('ทักษะที่กิจกรรมไม่ได้ประเมิน → BadRequestException', async () => {
      await expect(
        service.submit(STUDENT_ID, 7, scores(['leadership', 3], ['communication', 3], ['creativity', 3])),
      ).rejects.toThrow(BadRequestException);
    });

    it('ทักษะซ้ำในใบเดียว → BadRequestException', async () => {
      await expect(
        service.submit(STUDENT_ID, 7, scores(['leadership', 3], ['leadership', 5])),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
