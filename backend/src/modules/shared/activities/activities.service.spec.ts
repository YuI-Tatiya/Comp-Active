import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ActivitiesRepository } from './activities.repository';
import { EventsRepository } from '../events/events.repository';
import { RegistrationsRepository } from '../registrations/registrations.repository';
import { MailService } from '../mail/mail.service';
import { UsersRepository } from '../users/users.repository';
import { UserRole } from '../../../common/enums/role.enum';
import { ActivityStatus, ApprovalStatus } from '../../../common/enums/status.enum';

const PAST = '2020-01-01T12:00:00.000Z';
const FUTURE = '2099-01-01T12:00:00.000Z';

function makeActivity(overrides: Partial<any> = {}) {
  return {
    id: 5,
    organizerId: 7,
    name: 'Workshop',
    status: ActivityStatus.OPEN,
    approvalStatus: ApprovalStatus.APPROVED,
    startAt: PAST,
    endAt: PAST,
    date: PAST,
    endTime: '12:00',
    // findById กรองด้วย isViewerEligibleForEvent — กิจกรรมเดี่ยวไม่มี event จึงผ่านเสมอ
    event: null,
    // service.findById() แกะ _count ออกมาเป็น registeredCount เสมอ — ต้องมีให้ destructure ได้
    _count: { registrations: 0 },
    ...overrides,
  } as any;
}

describe('ActivitiesService.markCompleted', () => {
  let service: ActivitiesService;
  let repo: { findById: jest.Mock; markCompleted: jest.Mock };

  beforeEach(async () => {
    repo = {
      findById: jest.fn().mockResolvedValue(makeActivity()),
      markCompleted: jest.fn().mockResolvedValue({ id: 5, status: ActivityStatus.COMPLETED }),
    };
    const module = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: ActivitiesRepository, useValue: repo },
        // getSurveyResults falls back to the parent event's survey questions when the
        // activity is a sub-activity — not under test here, mocked out just for DI.
        { provide: EventsRepository, useValue: { findByIdWithSurveyAnswers: jest.fn() } },
        // markCompleted/requestCancellation fire best-effort student-notification emails
        // in the background (void this.notifyX(...)) — not under test here, mocked out
        // so module compilation succeeds and no real network call is attempted.
        { provide: RegistrationsRepository, useValue: { findByActivity: jest.fn().mockResolvedValue([]) } },
        { provide: MailService, useValue: { sendActivityCompleted: jest.fn(), sendActivityCancelled: jest.fn() } },
        { provide: UsersRepository, useValue: { countActiveStudents: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => "test-secret" } },
      ],
    }).compile();
    service = module.get(ActivitiesService);
  });

  it('marks a finished activity as completed for its owner', async () => {
    await service.markCompleted(5, 7, UserRole.ORGANIZER);
    expect(repo.markCompleted).toHaveBeenCalledWith(5);
  });

  it('lets an admin complete an activity they do not own', async () => {
    await service.markCompleted(5, 999, UserRole.ADMIN);
    expect(repo.markCompleted).toHaveBeenCalledWith(5);
  });

  it('throws NotFoundException when the activity does not exist', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.markCompleted(5, 7, UserRole.ORGANIZER)).rejects.toThrow(NotFoundException);
    expect(repo.markCompleted).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when another organizer tries to complete it', async () => {
    await expect(service.markCompleted(5, 999, UserRole.ORGANIZER)).rejects.toThrow(ForbiddenException);
    expect(repo.markCompleted).not.toHaveBeenCalled();
  });

  it('rejects completing an activity that is already completed', async () => {
    repo.findById.mockResolvedValue(makeActivity({ status: ActivityStatus.COMPLETED }));
    await expect(service.markCompleted(5, 7, UserRole.ORGANIZER)).rejects.toThrow(BadRequestException);
    expect(repo.markCompleted).not.toHaveBeenCalled();
  });

  it('rejects completing an activity that was cancelled', async () => {
    repo.findById.mockResolvedValue(makeActivity({ approvalStatus: ApprovalStatus.CANCELLED }));
    await expect(service.markCompleted(5, 7, UserRole.ORGANIZER)).rejects.toThrow(BadRequestException);
    expect(repo.markCompleted).not.toHaveBeenCalled();
  });

  // ค่าเก่าก่อนแยก enum — REJECTED เคยถูกใช้แทนความหมาย "ผู้จัดยกเลิกเอง" ต้องยัง guard ไว้
  it('also rejects completing an activity carrying the legacy REJECTED value', async () => {
    repo.findById.mockResolvedValue(makeActivity({ approvalStatus: ApprovalStatus.REJECTED }));
    await expect(service.markCompleted(5, 7, UserRole.ORGANIZER)).rejects.toThrow(BadRequestException);
    expect(repo.markCompleted).not.toHaveBeenCalled();
  });

  it('rejects completing an activity that has not finished yet', async () => {
    repo.findById.mockResolvedValue(makeActivity({ endAt: FUTURE }));
    await expect(service.markCompleted(5, 7, UserRole.ORGANIZER)).rejects.toThrow(BadRequestException);
    expect(repo.markCompleted).not.toHaveBeenCalled();
  });

  // กิจกรรมรุ่นเก่าไม่มี startAt/endAt — ต้องถอยไปใช้ date + endTime แทน
  it('falls back to date + endTime when endAt is null (legacy activity, already finished)', async () => {
    repo.findById.mockResolvedValue(makeActivity({ endAt: null, date: PAST, endTime: '12:00' }));
    await service.markCompleted(5, 7, UserRole.ORGANIZER);
    expect(repo.markCompleted).toHaveBeenCalledWith(5);
  });

  it('falls back to date + endTime when endAt is null (legacy activity, still upcoming)', async () => {
    repo.findById.mockResolvedValue(makeActivity({ endAt: null, date: FUTURE, endTime: '12:00' }));
    await expect(service.markCompleted(5, 7, UserRole.ORGANIZER)).rejects.toThrow(BadRequestException);
    expect(repo.markCompleted).not.toHaveBeenCalled();
  });
});

describe('ActivitiesService.autoCompleteOverdueActivities', () => {
  let service: ActivitiesService;
  let repo: { findOpenPastEnd: jest.Mock; markCompleted: jest.Mock };
  let registrationsRepo: { findByActivity: jest.Mock };

  function makeCandidate(overrides: Partial<any> = {}) {
    return { id: 5, name: 'Workshop', endAt: PAST, date: PAST, endTime: '12:00', ...overrides } as any;
  }

  beforeEach(async () => {
    repo = {
      findOpenPastEnd: jest.fn().mockResolvedValue([]),
      markCompleted: jest.fn().mockResolvedValue({ id: 5, status: ActivityStatus.COMPLETED }),
    };
    registrationsRepo = { findByActivity: jest.fn().mockResolvedValue([]) };
    const module = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: ActivitiesRepository, useValue: repo },
        { provide: EventsRepository, useValue: { findByIdWithSurveyAnswers: jest.fn() } },
        { provide: RegistrationsRepository, useValue: registrationsRepo },
        { provide: MailService, useValue: { sendActivityCompleted: jest.fn(), sendActivityCancelled: jest.fn() } },
        { provide: UsersRepository, useValue: { countActiveStudents: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => "test-secret" } },
      ],
    }).compile();
    service = module.get(ActivitiesService);
  });

  it('completes every candidate the repository already filtered as past its end time', async () => {
    repo.findOpenPastEnd.mockResolvedValue([makeCandidate({ id: 5 }), makeCandidate({ id: 6, name: 'Camp' })]);

    const count = await service.autoCompleteOverdueActivities();

    expect(repo.markCompleted).toHaveBeenCalledWith(5);
    expect(repo.markCompleted).toHaveBeenCalledWith(6);
    expect(count).toBe(2);
  });

  it('re-checks the real end time itself — does not complete a legacy (endAt: null) candidate whose derived end time is still upcoming', async () => {
    // findOpenPastEnd คัดคร่าวๆ ระดับ DB (endAt ผ่านแล้ว หรือไม่มีค่า) — เคส endAt: null ต้องคำนวณ
    // จาก date+endTime ซ้ำที่ชั้น service เพราะ DB กรองแบบนี้ไม่ได้ตรงๆ
    repo.findOpenPastEnd.mockResolvedValue([makeCandidate({ endAt: null, date: FUTURE, endTime: '12:00' })]);

    const count = await service.autoCompleteOverdueActivities();

    expect(repo.markCompleted).not.toHaveBeenCalled();
    expect(count).toBe(0);
  });

  it('completes a legacy (endAt: null) candidate whose derived end time has actually passed', async () => {
    repo.findOpenPastEnd.mockResolvedValue([makeCandidate({ endAt: null, date: PAST, endTime: '12:00' })]);

    const count = await service.autoCompleteOverdueActivities();

    expect(repo.markCompleted).toHaveBeenCalledWith(5);
    expect(count).toBe(1);
  });

  it('reads a legacy date + endTime as Thai time even when the process runs in UTC (Docker)', async () => {
    // กิจกรรมรุ่นเก่า: วันที่ 18 ต.ค. จบ 16:00 ตามเวลาไทย = 09:00 UTC — โค้ดเดิมอ่านสตริงไม่มีเขตเวลาเป็นเวลาของ
    // process (UTC — ชุดเทสต์รันใน UTC ดู jest.global-setup.js) จึงได้ 16:00 UTC แล้วปิดกิจกรรมช้าไป 7 ชม.
    jest.useFakeTimers();
    try {
      const legacy = makeCandidate({ endAt: null, date: '2026-10-18T00:00:00.000Z', endTime: '16:00' });

      jest.setSystemTime(new Date('2026-10-18T08:59:00.000Z')); // 15:59 ตามเวลาไทย — ยังไม่จบ
      repo.findOpenPastEnd.mockResolvedValue([legacy]);
      expect(await service.autoCompleteOverdueActivities()).toBe(0);

      jest.setSystemTime(new Date('2026-10-18T09:01:00.000Z')); // 16:01 ตามเวลาไทย — จบแล้ว
      expect(await service.autoCompleteOverdueActivities()).toBe(1);
      expect(repo.markCompleted).toHaveBeenCalledWith(5);
    } finally {
      jest.useRealTimers();
    }
  });

  it('no candidates — no-op, returns 0', async () => {
    const count = await service.autoCompleteOverdueActivities();

    expect(repo.markCompleted).not.toHaveBeenCalled();
    expect(count).toBe(0);
  });

  it('one activity failing does not stop the others in the same run', async () => {
    repo.findOpenPastEnd.mockResolvedValue([makeCandidate({ id: 5 }), makeCandidate({ id: 6 })]);
    repo.markCompleted.mockImplementation((id: number) =>
      id === 5 ? Promise.reject(new Error('db hiccup')) : Promise.resolve({ id, status: ActivityStatus.COMPLETED }),
    );

    await expect(service.autoCompleteOverdueActivities()).resolves.toBe(1);
    expect(repo.markCompleted).toHaveBeenCalledWith(5);
    expect(repo.markCompleted).toHaveBeenCalledWith(6);
  });

  it('sends the same "activity completed" email as the manual flow, to attendees only', async () => {
    registrationsRepo.findByActivity.mockResolvedValue([
      { id: 1, attendance: 'attended', student: { email: 'a@kku.ac.th', name: 'A' } },
      { id: 2, attendance: 'absent', student: { email: 'b@kku.ac.th', name: 'B' } },
    ]);
    repo.findOpenPastEnd.mockResolvedValue([makeCandidate()]);
    const mailService = { sendActivityCompleted: jest.fn(), sendActivityCancelled: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: ActivitiesRepository, useValue: repo },
        { provide: EventsRepository, useValue: { findByIdWithSurveyAnswers: jest.fn() } },
        { provide: RegistrationsRepository, useValue: registrationsRepo },
        { provide: MailService, useValue: mailService },
        { provide: UsersRepository, useValue: { countActiveStudents: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => "test-secret" } },
      ],
    }).compile();
    service = module.get(ActivitiesService);

    await service.autoCompleteOverdueActivities();
    await new Promise((resolve) => setImmediate(resolve)); // flush the fire-and-forget notifyActivityCompleted

    expect(mailService.sendActivityCompleted).toHaveBeenCalledTimes(1);
    expect(mailService.sendActivityCompleted).toHaveBeenCalledWith('a@kku.ac.th', 'A', 'Workshop');
  });
});

/** ปล่อยให้ microtask ของ `void this.notifyX(...)` (fire-and-forget) รันจนจบก่อน assert */
const flush = () => new Promise((resolve) => setImmediate(resolve));

function makeRegistration(overrides: Partial<any> = {}) {
  return {
    id: 1,
    attendance: 'absent',
    student: { email: 'student@kku.ac.th', name: 'Student A' },
    ...overrides,
  } as any;
}

describe('ActivitiesService student-notification side effects', () => {
  let service: ActivitiesService;
  let activitiesRepo: { findById: jest.Mock; markCompleted: jest.Mock; cancelByOrganizer: jest.Mock };
  let registrationsRepo: { findByActivity: jest.Mock };
  let mail: { sendActivityCompleted: jest.Mock; sendActivityCancelled: jest.Mock };

  beforeEach(async () => {
    activitiesRepo = {
      findById: jest.fn().mockResolvedValue(makeActivity()),
      markCompleted: jest.fn().mockResolvedValue({ id: 5, status: ActivityStatus.COMPLETED }),
      cancelByOrganizer: jest.fn().mockResolvedValue({ id: 5, approvalStatus: ApprovalStatus.CANCELLED }),
    };
    registrationsRepo = { findByActivity: jest.fn().mockResolvedValue([]) };
    mail = { sendActivityCompleted: jest.fn(), sendActivityCancelled: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: ActivitiesRepository, useValue: activitiesRepo },
        { provide: EventsRepository, useValue: { findByIdWithSurveyAnswers: jest.fn() } },
        { provide: RegistrationsRepository, useValue: registrationsRepo },
        { provide: MailService, useValue: mail },
        { provide: UsersRepository, useValue: { countActiveStudents: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => "test-secret" } },
      ],
    }).compile();
    service = module.get(ActivitiesService);
  });

  it('markCompleted only emails registrants who actually attended', async () => {
    registrationsRepo.findByActivity.mockResolvedValue([
      makeRegistration({ attendance: 'attended', student: { email: 'went@kku.ac.th', name: 'Went' } }),
      makeRegistration({ attendance: 'absent', student: { email: 'skipped@kku.ac.th', name: 'Skipped' } }),
    ]);

    await service.markCompleted(5, 7, UserRole.ORGANIZER);
    await flush();

    expect(mail.sendActivityCompleted).toHaveBeenCalledTimes(1);
    expect(mail.sendActivityCompleted).toHaveBeenCalledWith('went@kku.ac.th', 'Went', 'Workshop');
  });

  it('requestCancellation emails every registrant regardless of attendance, with the given reason', async () => {
    registrationsRepo.findByActivity.mockResolvedValue([
      makeRegistration({ attendance: 'attended', student: { email: 'a@kku.ac.th', name: 'A' } }),
      makeRegistration({ attendance: 'absent', student: { email: 'b@kku.ac.th', name: 'B' } }),
    ]);

    const saved = await service.requestCancellation(5, 7, 'ฝนตกหนัก');
    await flush();

    // ต้องใช้ CANCELLED ไม่ใช่ REJECTED — REJECTED สงวนไว้สำหรับแอดมิน/ระบบปฏิเสธ
    expect(activitiesRepo.cancelByOrganizer).toHaveBeenCalledWith(5, 'ฝนตกหนัก');
    expect(saved.approvalStatus).toBe(ApprovalStatus.CANCELLED);
    expect(mail.sendActivityCancelled).toHaveBeenCalledTimes(2);
    expect(mail.sendActivityCancelled).toHaveBeenCalledWith('a@kku.ac.th', 'A', 'Workshop', 'ฝนตกหนัก');
    expect(mail.sendActivityCancelled).toHaveBeenCalledWith('b@kku.ac.th', 'B', 'Workshop', 'ฝนตกหนัก');
  });

  it('does not let a notification failure surface as an error from the caller-facing method', async () => {
    registrationsRepo.findByActivity.mockRejectedValue(new Error('db down'));

    await expect(service.markCompleted(5, 7, UserRole.ORGANIZER)).resolves.toEqual({
      id: 5,
      status: ActivityStatus.COMPLETED,
    });
    await flush();
  });
});

describe('ActivitiesService.delete', () => {
  let service: ActivitiesService;
  let activitiesRepo: { findById: jest.Mock; delete: jest.Mock };

  beforeEach(async () => {
    activitiesRepo = {
      findById: jest.fn().mockResolvedValue(makeActivity()),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: ActivitiesRepository, useValue: activitiesRepo },
        { provide: EventsRepository, useValue: { findByIdWithSurveyAnswers: jest.fn() } },
        { provide: RegistrationsRepository, useValue: { findByActivity: jest.fn() } },
        { provide: MailService, useValue: {} },
        { provide: UsersRepository, useValue: { countActiveStudents: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => "test-secret" } },
      ],
    }).compile();
    service = module.get(ActivitiesService);
  });

  it('deletes an activity with no registrations', async () => {
    await service.delete(5, 7, UserRole.ORGANIZER);
    expect(activitiesRepo.delete).toHaveBeenCalledWith(5);
  });

  it('refuses to delete an activity that already has registrations', async () => {
    activitiesRepo.findById.mockResolvedValue(makeActivity({ _count: { registrations: 3 } }));

    await expect(service.delete(5, 7, UserRole.ORGANIZER)).rejects.toThrow(BadRequestException);
    expect(activitiesRepo.delete).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when another organizer tries to delete it', async () => {
    await expect(service.delete(5, 999, UserRole.ORGANIZER)).rejects.toThrow(ForbiddenException);
    expect(activitiesRepo.delete).not.toHaveBeenCalled();
  });
});

describe('ActivitiesService.findByIdForOrganizer', () => {
  let service: ActivitiesService;
  let activitiesRepo: { findByIdForOrganizer: jest.Mock };

  beforeEach(async () => {
    activitiesRepo = {
      findByIdForOrganizer: jest.fn().mockResolvedValue(makeActivity({ registrations: [{ id: 1 }] })),
    };

    const module = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: ActivitiesRepository, useValue: activitiesRepo },
        { provide: EventsRepository, useValue: { findByIdWithSurveyAnswers: jest.fn() } },
        { provide: RegistrationsRepository, useValue: { findByActivity: jest.fn() } },
        { provide: MailService, useValue: {} },
        { provide: UsersRepository, useValue: { countActiveStudents: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => "test-secret" } },
      ],
    }).compile();
    service = module.get(ActivitiesService);
  });

  it('returns the full activity (with registrations) for its owner', async () => {
    const result = await service.findByIdForOrganizer(5, 7, UserRole.ORGANIZER);
    expect(result.registrations).toEqual([{ id: 1 }]);
  });

  it('allows an admin to view an activity they do not own', async () => {
    await expect(service.findByIdForOrganizer(5, 999, UserRole.ADMIN)).resolves.toBeDefined();
  });

  it('throws ForbiddenException when a non-owning organizer requests it', async () => {
    await expect(service.findByIdForOrganizer(5, 999, UserRole.ORGANIZER)).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException when the activity does not exist', async () => {
    activitiesRepo.findByIdForOrganizer.mockResolvedValue(null);
    await expect(service.findByIdForOrganizer(5, 7, UserRole.ORGANIZER)).rejects.toThrow(NotFoundException);
  });
});

describe('ActivitiesService.getSurveyResults — ownership', () => {
  let service: ActivitiesService;
  let activitiesRepo: { findByIdWithSurveyAnswers: jest.Mock };

  beforeEach(async () => {
    activitiesRepo = {
      findByIdWithSurveyAnswers: jest
        .fn()
        .mockResolvedValue({ id: 5, organizerId: 7, eventId: null, surveyQuestions: [] }),
    };

    const module = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: ActivitiesRepository, useValue: activitiesRepo },
        { provide: EventsRepository, useValue: { findByIdWithSurveyAnswers: jest.fn() } },
        { provide: RegistrationsRepository, useValue: { findByActivity: jest.fn() } },
        { provide: MailService, useValue: {} },
        { provide: UsersRepository, useValue: { countActiveStudents: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => "test-secret" } },
      ],
    }).compile();
    service = module.get(ActivitiesService);
  });

  it('returns results to the owning organizer', async () => {
    await expect(service.getSurveyResults(5, 7, UserRole.ORGANIZER)).resolves.toBeDefined();
  });

  it('allows an admin who does not own the activity', async () => {
    await expect(service.getSurveyResults(5, 999, UserRole.ADMIN)).resolves.toBeDefined();
  });

  it('throws ForbiddenException (not BadRequest) for a non-owning organizer', async () => {
    await expect(service.getSurveyResults(5, 999, UserRole.ORGANIZER)).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException when the activity does not exist', async () => {
    activitiesRepo.findByIdWithSurveyAnswers.mockResolvedValue(null);
    await expect(service.getSurveyResults(5, 7, UserRole.ORGANIZER)).rejects.toThrow(NotFoundException);
  });
});

describe('ActivitiesService.duplicate', () => {
  let service: ActivitiesService;
  let activitiesRepo: { findById: jest.Mock; duplicate: jest.Mock };

  beforeEach(async () => {
    activitiesRepo = {
      findById: jest.fn().mockResolvedValue(makeActivity()),
      duplicate: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: ActivitiesRepository, useValue: activitiesRepo },
        { provide: EventsRepository, useValue: { findByIdWithSurveyAnswers: jest.fn() } },
        { provide: RegistrationsRepository, useValue: { findByActivity: jest.fn() } },
        { provide: MailService, useValue: {} },
        { provide: UsersRepository, useValue: { countActiveStudents: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => "test-secret" } },
      ],
    }).compile();
    service = module.get(ActivitiesService);
  });

  it('duplicates for the owning organizer and maps registeredCount', async () => {
    activitiesRepo.duplicate.mockResolvedValue({
      id: 6,
      name: 'Workshop (สำเนา)',
      _count: { registrations: 0 },
    });

    const result = await service.duplicate(5, 7, UserRole.ORGANIZER);

    expect(activitiesRepo.duplicate).toHaveBeenCalledWith(5, 7);
    expect(result.id).toBe(6);
    expect(result.registeredCount).toBe(0);
    expect(result._count).toBeUndefined();
  });

  it('allows an admin who does not own the activity, copying to the admin', async () => {
    activitiesRepo.duplicate.mockResolvedValue({ id: 6, _count: { registrations: 0 } });
    await service.duplicate(5, 999, UserRole.ADMIN);
    expect(activitiesRepo.duplicate).toHaveBeenCalledWith(5, 999);
  });

  it('throws ForbiddenException for a non-owning organizer', async () => {
    await expect(service.duplicate(5, 999, UserRole.ORGANIZER)).rejects.toThrow(ForbiddenException);
    expect(activitiesRepo.duplicate).not.toHaveBeenCalled();
  });

  it('throws NotFoundException if the activity is deleted between the ownership check and the copy', async () => {
    activitiesRepo.duplicate.mockResolvedValue(null);
    await expect(service.duplicate(5, 7, UserRole.ORGANIZER)).rejects.toThrow(NotFoundException);
  });
});

describe('ActivitiesService.setStatus', () => {
  let service: ActivitiesService;
  let activitiesRepo: { findById: jest.Mock; updateStatus: jest.Mock };

  beforeEach(async () => {
    activitiesRepo = {
      findById: jest.fn().mockResolvedValue(makeActivity()),
      updateStatus: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: ActivitiesRepository, useValue: activitiesRepo },
        { provide: EventsRepository, useValue: { findByIdWithSurveyAnswers: jest.fn() } },
        { provide: RegistrationsRepository, useValue: { findByActivity: jest.fn() } },
        { provide: MailService, useValue: {} },
        { provide: UsersRepository, useValue: { countActiveStudents: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => "test-secret" } },
      ],
    }).compile();
    service = module.get(ActivitiesService);
  });

  it('closes registration for the owning organizer', async () => {
    activitiesRepo.updateStatus.mockResolvedValue({ id: 5, status: 'closed', _count: { registrations: 0 } });
    const result = await service.setStatus(5, 7, UserRole.ORGANIZER, 'closed');
    expect(activitiesRepo.updateStatus).toHaveBeenCalledWith(5, 'closed');
    expect(result.registeredCount).toBe(0);
  });

  it('reopens registration for the owning organizer', async () => {
    activitiesRepo.updateStatus.mockResolvedValue({ id: 5, status: 'open', _count: { registrations: 0 } });
    await service.setStatus(5, 7, UserRole.ORGANIZER, 'open');
    expect(activitiesRepo.updateStatus).toHaveBeenCalledWith(5, 'open');
  });

  it('allows an admin who does not own the activity', async () => {
    activitiesRepo.updateStatus.mockResolvedValue({ id: 5, _count: { registrations: 0 } });
    await service.setStatus(5, 999, UserRole.ADMIN, 'closed');
    expect(activitiesRepo.updateStatus).toHaveBeenCalledWith(5, 'closed');
  });

  it('throws ForbiddenException for a non-owning organizer', async () => {
    await expect(service.setStatus(5, 999, UserRole.ORGANIZER, 'closed')).rejects.toThrow(ForbiddenException);
    expect(activitiesRepo.updateStatus).not.toHaveBeenCalled();
  });
});

describe('ActivitiesService.getCheckInSession / setSelfCheckIn — QR เช็คอินหมุนรหัส', () => {
  let service: ActivitiesService;
  let activitiesRepo: { findById: jest.Mock; updateSelfCheckIn: jest.Mock };
  const SECRET = 'test-secret-at-least-32-characters-long';

  beforeEach(async () => {
    activitiesRepo = {
      findById: jest.fn().mockResolvedValue(makeActivity({ selfCheckInEnabled: false })),
      updateSelfCheckIn: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: ActivitiesRepository, useValue: activitiesRepo },
        { provide: EventsRepository, useValue: { findByIdWithSurveyAnswers: jest.fn() } },
        { provide: RegistrationsRepository, useValue: { findByActivity: jest.fn() } },
        { provide: MailService, useValue: {} },
        { provide: UsersRepository, useValue: { countActiveStudents: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => SECRET } },
      ],
    }).compile();
    service = module.get(ActivitiesService);
  });

  describe('getCheckInSession', () => {
    it("returns the activity's current enabled flag plus a freshly computed token", async () => {
      activitiesRepo.findById.mockResolvedValue(makeActivity({ selfCheckInEnabled: true }));
      const result = await service.getCheckInSession(5, 7, UserRole.ORGANIZER);
      expect(result.enabled).toBe(true);
      expect(typeof result.token).toBe('string');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('reports enabled:false without error when the organizer has not opened check-in', async () => {
      const result = await service.getCheckInSession(5, 7, UserRole.ORGANIZER);
      expect(result.enabled).toBe(false);
    });

    it('throws ForbiddenException for a non-owning organizer', async () => {
      await expect(service.getCheckInSession(5, 999, UserRole.ORGANIZER)).rejects.toThrow(ForbiddenException);
    });

    it('allows an admin who does not own the activity', async () => {
      await expect(service.getCheckInSession(5, 999, UserRole.ADMIN)).resolves.toBeDefined();
    });
  });

  describe('setSelfCheckIn', () => {
    it('enables check-in for the owning organizer and returns a usable token', async () => {
      const result = await service.setSelfCheckIn(5, 7, UserRole.ORGANIZER, true);
      expect(activitiesRepo.updateSelfCheckIn).toHaveBeenCalledWith(5, true);
      expect(result).toMatchObject({ enabled: true });
      expect(typeof result.token).toBe('string');
    });

    it('disables check-in for the owning organizer', async () => {
      await service.setSelfCheckIn(5, 7, UserRole.ORGANIZER, false);
      expect(activitiesRepo.updateSelfCheckIn).toHaveBeenCalledWith(5, false);
    });

    it('throws ForbiddenException for a non-owning organizer', async () => {
      await expect(service.setSelfCheckIn(5, 999, UserRole.ORGANIZER, true)).rejects.toThrow(ForbiddenException);
      expect(activitiesRepo.updateSelfCheckIn).not.toHaveBeenCalled();
    });

    it('allows an admin to toggle an activity they do not own', async () => {
      await expect(service.setSelfCheckIn(5, 999, UserRole.ADMIN, true)).resolves.toBeDefined();
    });

    // เปิดเช็คอินกิจกรรมที่จบไปแล้วไม่มีความหมาย — กันผู้จัดกดเปิดหลงจากกิจกรรมจบแล้ว
    it('refuses to enable check-in once the activity is already completed', async () => {
      activitiesRepo.findById.mockResolvedValue(makeActivity({ status: ActivityStatus.COMPLETED }));
      await expect(service.setSelfCheckIn(5, 7, UserRole.ORGANIZER, true)).rejects.toThrow(BadRequestException);
      expect(activitiesRepo.updateSelfCheckIn).not.toHaveBeenCalled();
    });

    it('still allows disabling check-in on a completed activity (closing down is always safe)', async () => {
      activitiesRepo.findById.mockResolvedValue(makeActivity({ status: ActivityStatus.COMPLETED, selfCheckInEnabled: true }));
      await expect(service.setSelfCheckIn(5, 7, UserRole.ORGANIZER, false)).resolves.toMatchObject({ enabled: false });
      expect(activitiesRepo.updateSelfCheckIn).toHaveBeenCalledWith(5, false);
    });
  });
});

describe('ActivitiesService.getOrganizerStats', () => {
  let service: ActivitiesService;
  let activitiesRepo: { findManyByOrganizerWithCount: jest.Mock };
  let usersRepo: { countActiveStudents: jest.Mock };
  let registrationsRepo: { countPendingByOrganizer: jest.Mock };

  beforeEach(async () => {
    activitiesRepo = { findManyByOrganizerWithCount: jest.fn().mockResolvedValue([]) };
    usersRepo = { countActiveStudents: jest.fn().mockResolvedValue(42) };
    registrationsRepo = { countPendingByOrganizer: jest.fn().mockResolvedValue(3) };

    const module = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: ActivitiesRepository, useValue: activitiesRepo },
        { provide: EventsRepository, useValue: { findByIdWithSurveyAnswers: jest.fn() } },
        { provide: RegistrationsRepository, useValue: registrationsRepo },
        { provide: MailService, useValue: {} },
        { provide: UsersRepository, useValue: usersRepo },
        { provide: ConfigService, useValue: { get: () => "test-secret" } },
      ],
    }).compile();
    service = module.get(ActivitiesService);
  });

  // บั๊กเดิม: นับจาก approvalStatus === APPROVED ทำให้ "กำลังเปิดรับ" บนการ์ดสถิติไม่ตรงกับ
  // แท็บสถานะ "เปิดรับสมัคร" ของหน้าเดียวกัน (ซึ่งนับจาก status ไม่ใช่ approvalStatus)
  it('counts activeActivities from registration status (open), not approval status', async () => {
    activitiesRepo.findManyByOrganizerWithCount.mockResolvedValue([
      makeActivity({ id: 1, status: ActivityStatus.OPEN, approvalStatus: ApprovalStatus.APPROVED }),
      // อนุมัติแล้วแต่ปิดรับสมัคร/จบไปแล้ว — เคยถูกนับเป็น active ทั้งที่ไม่ได้เปิดรับสมัครจริง
      makeActivity({ id: 2, status: ActivityStatus.CLOSED, approvalStatus: ApprovalStatus.APPROVED }),
      makeActivity({ id: 3, status: ActivityStatus.COMPLETED, approvalStatus: ApprovalStatus.APPROVED }),
      // รออนุมัติอยู่แต่ status ดิบยังเป็น open — ไม่ควรนับ (ยังไม่เผยแพร่ให้ใครเห็น)
      makeActivity({ id: 4, status: ActivityStatus.OPEN, approvalStatus: ApprovalStatus.PENDING }),
    ]);

    const stats = await service.getOrganizerStats(7);

    expect(stats.totalActivities).toBe(4);
    expect(stats.activeActivities).toBe(1);
  });

  it('excludes cancelled/rejected activities from activeActivities even if status is still open', async () => {
    activitiesRepo.findManyByOrganizerWithCount.mockResolvedValue([
      makeActivity({ id: 1, status: ActivityStatus.OPEN, approvalStatus: ApprovalStatus.CANCELLED }),
      makeActivity({ id: 2, status: ActivityStatus.OPEN, approvalStatus: ApprovalStatus.REJECTED }),
    ]);

    const stats = await service.getOrganizerStats(7);

    expect(stats.totalActivities).toBe(2);
    expect(stats.activeActivities).toBe(0);
  });

  it('sums registrations across all activities and passes through student/pending counts unchanged', async () => {
    activitiesRepo.findManyByOrganizerWithCount.mockResolvedValue([
      makeActivity({ id: 1, _count: { registrations: 5 } }),
      makeActivity({ id: 2, _count: { registrations: 2 } }),
    ]);

    const stats = await service.getOrganizerStats(7);

    expect(stats.totalRegistrations).toBe(7);
    expect(stats.totalStudents).toBe(42);
    expect(stats.pendingRegistrations).toBe(3);
    expect(registrationsRepo.countPendingByOrganizer).toHaveBeenCalledWith(7);
  });
});
