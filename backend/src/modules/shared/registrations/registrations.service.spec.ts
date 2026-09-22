import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { RegistrationsRepository } from './registrations.repository';
import { EvaluationsService } from './evaluation.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegistrationStatus, RegistrationType } from '../../../common/enums/status.enum';
import { UserRole } from '../../../common/enums/role.enum';

/** ปล่อยให้ microtask ของ `void this.notifyRegistrationConfirmed(...)` (fire-and-forget) รันจนจบก่อน assert */
const flush = () => new Promise((resolve) => setImmediate(resolve));

const OWNER_ID = 10;

describe('RegistrationsService.confirm', () => {
  let service: RegistrationsService;
  let repo: { findByIdWithActivity: jest.Mock; update: jest.Mock; findByIdWithStudentAndActivity: jest.Mock };
  let mail: { sendRegistrationConfirmed: jest.Mock };

  beforeEach(async () => {
    repo = {
      findByIdWithActivity: jest
        .fn()
        .mockResolvedValue({ id: 1, status: RegistrationStatus.PENDING, activity: { organizerId: OWNER_ID } }),
      update: jest.fn().mockResolvedValue({ id: 1, status: RegistrationStatus.CONFIRMED }),
      findByIdWithStudentAndActivity: jest
        .fn()
        .mockResolvedValue({
          id: 1,
          student: { email: 'student@kku.ac.th', name: 'Student A' },
          activity: {
            name: 'Workshop',
            date: '2027-01-01T00:00:00.000Z',
            startTime: '09:00',
            endTime: '12:00',
            location: 'Room 1',
          },
        }),
    };
    mail = { sendRegistrationConfirmed: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        RegistrationsService,
        { provide: RegistrationsRepository, useValue: repo },
        { provide: EvaluationsService, useValue: {} },
        { provide: PrismaService, useValue: {} },
        { provide: MailService, useValue: mail },
      ],
    }).compile();
    service = module.get(RegistrationsService);
  });

  it('confirms the registration and returns the saved record', async () => {
    const result = await service.confirm(OWNER_ID, UserRole.ORGANIZER, 1);
    expect(repo.update).toHaveBeenCalledWith(1, { status: RegistrationStatus.CONFIRMED });
    expect(result).toEqual({ id: 1, status: RegistrationStatus.CONFIRMED });
  });

  it('throws NotFoundException when the registration does not exist', async () => {
    repo.findByIdWithActivity.mockResolvedValue(null);
    await expect(service.confirm(OWNER_ID, UserRole.ORGANIZER, 1)).rejects.toThrow(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the caller does not own the activity', async () => {
    await expect(service.confirm(999, UserRole.ORGANIZER, 1)).rejects.toThrow(BadRequestException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('allows an admin to confirm a registration they do not own', async () => {
    const result = await service.confirm(999, UserRole.ADMIN, 1);
    expect(result).toEqual({ id: 1, status: RegistrationStatus.CONFIRMED });
  });

  it('emails the student with their activity details after confirming', async () => {
    await service.confirm(OWNER_ID, UserRole.ORGANIZER, 1);
    await flush();

    expect(mail.sendRegistrationConfirmed).toHaveBeenCalledWith(
      'student@kku.ac.th',
      'Student A',
      'Workshop',
      expect.any(String),
      '09:00 - 12:00',
      'Room 1',
    );
  });

  it('does not let a notification failure surface as an error from confirm()', async () => {
    repo.findByIdWithStudentAndActivity.mockRejectedValue(new Error('db down'));
    await expect(service.confirm(OWNER_ID, UserRole.ORGANIZER, 1)).resolves.toEqual({
      id: 1,
      status: RegistrationStatus.CONFIRMED,
    });
    await flush();
  });
});

describe('RegistrationsService.checkIn', () => {
  let service: RegistrationsService;
  let repo: { findByIdWithActivitySoftSkills: jest.Mock; updateTx: jest.Mock };
  let evaluations: { autoCreateForCheckIn: jest.Mock };
  let prisma: { $transaction: jest.Mock };

  const ACTIVITY = { organizerId: OWNER_ID, softSkills: [{ skillType: 'communication', rate: 5 }] };

  beforeEach(async () => {
    repo = {
      findByIdWithActivitySoftSkills: jest.fn(),
      updateTx: jest.fn().mockResolvedValue({ id: 1, status: RegistrationStatus.CONFIRMED, attendance: 'attended' }),
    };
    evaluations = { autoCreateForCheckIn: jest.fn().mockResolvedValue(undefined) };
    prisma = { $transaction: jest.fn((cb: any) => cb({})) };

    const module = await Test.createTestingModule({
      providers: [
        RegistrationsService,
        { provide: RegistrationsRepository, useValue: repo },
        { provide: EvaluationsService, useValue: evaluations },
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: {} },
      ],
    }).compile();
    service = module.get(RegistrationsService);
  });

  // การยืนยันลงทะเบียนกับการเช็คอินเป็นคนละเรื่องกัน — ยังไม่ยืนยันไม่ได้แปลว่าจะไม่มาจริง
  it('checks in a PENDING registration and auto-confirms it in the same update', async () => {
    repo.findByIdWithActivitySoftSkills.mockResolvedValue({
      id: 1,
      status: RegistrationStatus.PENDING,
      activity: ACTIVITY,
    });

    await service.checkIn(OWNER_ID, UserRole.ORGANIZER, 1);

    expect(repo.updateTx).toHaveBeenCalledWith(
      {},
      1,
      expect.objectContaining({ status: RegistrationStatus.CONFIRMED, attendance: 'attended' }),
    );
  });

  it('checks in an already-CONFIRMED registration without error', async () => {
    repo.findByIdWithActivitySoftSkills.mockResolvedValue({
      id: 1,
      status: RegistrationStatus.CONFIRMED,
      activity: ACTIVITY,
    });

    await expect(service.checkIn(OWNER_ID, UserRole.ORGANIZER, 1)).resolves.toBeDefined();
    expect(repo.updateTx).toHaveBeenCalled();
  });

  it('refuses to check in a CANCELLED registration', async () => {
    repo.findByIdWithActivitySoftSkills.mockResolvedValue({
      id: 1,
      status: RegistrationStatus.CANCELLED,
      activity: ACTIVITY,
    });

    await expect(service.checkIn(OWNER_ID, UserRole.ORGANIZER, 1)).rejects.toThrow(BadRequestException);
    expect(repo.updateTx).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the registration does not exist', async () => {
    repo.findByIdWithActivitySoftSkills.mockResolvedValue(null);
    await expect(service.checkIn(OWNER_ID, UserRole.ORGANIZER, 1)).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when the caller does not own the activity', async () => {
    repo.findByIdWithActivitySoftSkills.mockResolvedValue({
      id: 1,
      status: RegistrationStatus.PENDING,
      activity: ACTIVITY,
    });

    await expect(service.checkIn(999, UserRole.ORGANIZER, 1)).rejects.toThrow(BadRequestException);
    expect(repo.updateTx).not.toHaveBeenCalled();
  });

  it('auto-creates the soft-skill evaluation using the activity organizer and soft skills', async () => {
    repo.findByIdWithActivitySoftSkills.mockResolvedValue({
      id: 1,
      status: RegistrationStatus.PENDING,
      activity: ACTIVITY,
    });

    await service.checkIn(OWNER_ID, UserRole.ORGANIZER, 1);

    expect(evaluations.autoCreateForCheckIn).toHaveBeenCalledWith({}, 1, OWNER_ID, ACTIVITY.softSkills);
  });
});

describe('RegistrationsService.create — registration type validation', () => {
  let service: RegistrationsService;
  let repo: {
    findActivityWithActiveCount: jest.Mock;
    findActiveByStudentAndActivity: jest.Mock;
    create: jest.Mock;
  };

  const STUDENT_ID = 5;
  const ACTIVITY_ID = 1;

  function baseActivity(overrides: Record<string, unknown> = {}) {
    return {
      id: ACTIVITY_ID,
      event: null,
      approvalStatus: 'approved',
      status: 'open',
      capacity: null,
      volunteerRole: null,
      questions: [],
      _count: { registrations: 0 },
      registrationType: RegistrationType.PARTICIPANT,
      dutyRoleOptions: [] as string[],
      dutyShiftOptions: [] as string[],
      teamSizeMin: null as number | null,
      teamSizeMax: null as number | null,
      competitionCategoryOptions: [] as string[],
      ...overrides,
    };
  }

  beforeEach(async () => {
    repo = {
      findActivityWithActiveCount: jest.fn(),
      findActiveByStudentAndActivity: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 99 }),
    };

    const module = await Test.createTestingModule({
      providers: [
        RegistrationsService,
        { provide: RegistrationsRepository, useValue: repo },
        { provide: EvaluationsService, useValue: {} },
        { provide: PrismaService, useValue: {} },
        { provide: MailService, useValue: {} },
      ],
    }).compile();
    service = module.get(RegistrationsService);
  });

  it('registers a plain participant without any registration-type fields', async () => {
    repo.findActivityWithActiveCount.mockResolvedValue(baseActivity());

    await service.create(STUDENT_ID, ACTIVITY_ID, {} as any, [], {}, {});

    expect(repo.create).toHaveBeenCalledWith(
      STUDENT_ID,
      ACTIVITY_ID,
      [],
      { wantsCertLoanFund: false, wantsCertScholarship: false },
      {
        dutyRole: null,
        dutyShift: null,
        teamName: null,
        teamSize: null,
        competitionCategory: null,
        submissionLink: null,
      },
    );
  });

  it('rejects a staff_volunteer registration missing dutyRole', async () => {
    repo.findActivityWithActiveCount.mockResolvedValue(
      baseActivity({ registrationType: RegistrationType.STAFF_VOLUNTEER, dutyRoleOptions: ['ลงทะเบียนหน้างาน'] }),
    );

    await expect(service.create(STUDENT_ID, ACTIVITY_ID, {} as any, [], {}, {})).rejects.toThrow(BadRequestException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects a dutyRole that is not one of the activity options', async () => {
    repo.findActivityWithActiveCount.mockResolvedValue(
      baseActivity({ registrationType: RegistrationType.STAFF_VOLUNTEER, dutyRoleOptions: ['ลงทะเบียนหน้างาน'] }),
    );

    await expect(
      service.create(STUDENT_ID, ACTIVITY_ID, {} as any, [], {}, { dutyRole: 'ปลอมแปลง' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts a valid staff_volunteer registration and stores dutyRole/dutyShift', async () => {
    repo.findActivityWithActiveCount.mockResolvedValue(
      baseActivity({
        registrationType: RegistrationType.STAFF_VOLUNTEER,
        dutyRoleOptions: ['ลงทะเบียนหน้างาน'],
        dutyShiftOptions: ['กะเช้า'],
      }),
    );

    await service.create(STUDENT_ID, ACTIVITY_ID, {} as any, [], {}, {
      dutyRole: 'ลงทะเบียนหน้างาน',
      dutyShift: 'กะเช้า',
    });

    expect(repo.create).toHaveBeenCalledWith(
      STUDENT_ID,
      ACTIVITY_ID,
      [],
      { wantsCertLoanFund: false, wantsCertScholarship: false },
      expect.objectContaining({ dutyRole: 'ลงทะเบียนหน้างาน', dutyShift: 'กะเช้า' }),
    );
  });

  it('rejects a contestant registration missing teamName', async () => {
    repo.findActivityWithActiveCount.mockResolvedValue(baseActivity({ registrationType: RegistrationType.CONTESTANT }));

    await expect(service.create(STUDENT_ID, ACTIVITY_ID, {} as any, [], {}, {})).rejects.toThrow(BadRequestException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects a contestant team size outside the activity bounds', async () => {
    repo.findActivityWithActiveCount.mockResolvedValue(
      baseActivity({ registrationType: RegistrationType.CONTESTANT, teamSizeMin: 3, teamSizeMax: 5 }),
    );

    await expect(
      service.create(STUDENT_ID, ACTIVITY_ID, {} as any, [], {}, { teamName: 'ทีม A', teamSize: 2 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts a valid contestant registration and stores team details', async () => {
    repo.findActivityWithActiveCount.mockResolvedValue(
      baseActivity({ registrationType: RegistrationType.CONTESTANT, teamSizeMin: 2, teamSizeMax: 5 }),
    );

    await service.create(STUDENT_ID, ACTIVITY_ID, {} as any, [], {}, {
      teamName: 'ทีม A',
      teamSize: 3,
      submissionLink: 'https://example.com/portfolio',
    });

    expect(repo.create).toHaveBeenCalledWith(
      STUDENT_ID,
      ACTIVITY_ID,
      [],
      { wantsCertLoanFund: false, wantsCertScholarship: false },
      expect.objectContaining({ teamName: 'ทีม A', teamSize: 3, submissionLink: 'https://example.com/portfolio' }),
    );
  });

  it('still rejects a duplicate active registration regardless of registration type', async () => {
    repo.findActivityWithActiveCount.mockResolvedValue(baseActivity());
    repo.findActiveByStudentAndActivity.mockResolvedValue({ id: 1 });

    await expect(service.create(STUDENT_ID, ACTIVITY_ID, {} as any, [], {}, {})).rejects.toThrow(ConflictException);
    expect(repo.create).not.toHaveBeenCalled();
  });
});
