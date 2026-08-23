import { Test } from '@nestjs/testing';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ActivitiesRepository } from './activities.repository';
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
