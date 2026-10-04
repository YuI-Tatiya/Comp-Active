import { Test } from '@nestjs/testing';
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
