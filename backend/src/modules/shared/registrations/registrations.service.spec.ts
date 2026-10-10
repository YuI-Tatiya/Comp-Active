import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { RegistrationsRepository } from './registrations.repository';
import { EvaluationsService } from './evaluation.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegistrationStatus, RegistrationType, ActivityStatus, AttendanceStatus } from '../../../common/enums/status.enum';
import { UserRole } from '../../../common/enums/role.enum';
import { generateCheckinToken } from '../../../common/utils/checkin-token.util';

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
        { provide: ConfigService, useValue: { get: () => "test-secret" } },
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

  it('throws ForbiddenException when the caller does not own the activity', async () => {
    await expect(service.confirm(999, UserRole.ORGANIZER, 1)).rejects.toThrow(ForbiddenException);
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
        { provide: ConfigService, useValue: { get: () => "test-secret" } },
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

  it('throws ForbiddenException when the caller does not own the activity', async () => {
    repo.findByIdWithActivitySoftSkills.mockResolvedValue({
      id: 1,
      status: RegistrationStatus.PENDING,
      activity: ACTIVITY,
    });

    await expect(service.checkIn(999, UserRole.ORGANIZER, 1)).rejects.toThrow(ForbiddenException);
    expect(repo.updateTx).not.toHaveBeenCalled();
  });

  it('auto-creates the soft-skill evaluation using the activity organizer and soft skills', async () => {
    repo.findByIdWithActivitySoftSkills.mockResolvedValue({
      id: 1,
      status: RegistrationStatus.PENDING,
      activityId: 3,
      dutyRole: 'ฝ่ายลงทะเบียน',
      activity: ACTIVITY,
    });

    await service.checkIn(OWNER_ID, UserRole.ORGANIZER, 1);

    // ส่งฝ่ายของผู้เช็คอินไปด้วย เพื่อให้คนที่มาทีหลังได้คะแนนฐานของฝ่ายตัวเอง
    expect(evaluations.autoCreateForCheckIn).toHaveBeenCalledWith({}, 1, OWNER_ID, ACTIVITY.softSkills, {
      activityId: 3,
      dutyRole: 'ฝ่ายลงทะเบียน',
      pendingApproval: false,
    });
  });

  it('marks the new evaluation pending when the activity has the 360° assessment mode on', async () => {
    repo.findByIdWithActivitySoftSkills.mockResolvedValue({
      id: 1,
      status: RegistrationStatus.PENDING,
      activityId: 3,
      dutyRole: 'ฝ่ายA',
      activity: { ...ACTIVITY, peerAssessmentEnabled: true },
    });

    await service.checkIn(OWNER_ID, UserRole.ORGANIZER, 1);

    expect(evaluations.autoCreateForCheckIn).toHaveBeenCalledWith(
      {},
      1,
      OWNER_ID,
      ACTIVITY.softSkills,
      expect.objectContaining({ pendingApproval: true }),
    );
  });

  // ตรงข้ามกับ checkInSelf โดยตั้งใจ — ผู้จัดเป็นคนยืนยันเอง ไม่ใช่ลิงก์ที่ใครก็เปิดได้ จึงยังแก้ย้อนหลังได้แม้กิจกรรมจบแล้ว
  it('allows the organizer to check someone in even after the activity is already completed', async () => {
    repo.findByIdWithActivitySoftSkills.mockResolvedValue({
      id: 1,
      status: RegistrationStatus.PENDING,
      activity: { ...ACTIVITY, status: ActivityStatus.COMPLETED },
    });

    await expect(service.checkIn(OWNER_ID, UserRole.ORGANIZER, 1)).resolves.toBeDefined();
    expect(repo.updateTx).toHaveBeenCalled();
  });
});

describe('RegistrationsService.checkInSelf — เช็คอินผ่าน QR ด้วยตัวเอง', () => {
  let service: RegistrationsService;
  let repo: { findActiveByStudentAndActivityWithSoftSkills: jest.Mock; updateTx: jest.Mock };
  let evaluations: { autoCreateForCheckIn: jest.Mock };
  let prisma: { $transaction: jest.Mock };

  const STUDENT_ID = 50;
  const ACTIVITY_ID = 3;
  const SECRET = 'test-secret-at-least-32-characters-long';
  const ACTIVITY = { organizerId: OWNER_ID, status: ActivityStatus.OPEN, selfCheckInEnabled: true, softSkills: [] };

  function registration(overrides: Record<string, unknown> = {}) {
    return {
      id: 1,
      status: RegistrationStatus.PENDING,
      activityId: ACTIVITY_ID,
      attendance: AttendanceStatus.ABSENT,
      activity: ACTIVITY,
      ...overrides,
    };
  }

  /** token ที่ถูกต้องสำหรับหน้าต่างเวลาปัจจุบัน — ใช้ SECRET เดียวกับที่ ConfigService mock คืนให้ service */
  function validToken() {
    return generateCheckinToken(SECRET, ACTIVITY_ID).token;
  }

  beforeEach(async () => {
    repo = {
      findActiveByStudentAndActivityWithSoftSkills: jest.fn().mockResolvedValue(registration()),
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
        { provide: ConfigService, useValue: { get: () => SECRET } },
      ],
    }).compile();
    service = module.get(RegistrationsService);
  });

  it('checks in and returns alreadyCheckedIn:false the first time', async () => {
    const result = await service.checkInSelf(STUDENT_ID, ACTIVITY_ID, validToken());
    expect(repo.updateTx).toHaveBeenCalled();
    expect(result).toMatchObject({ alreadyCheckedIn: false });
  });

  it('throws NotFoundException when the student has no active registration for this activity', async () => {
    repo.findActiveByStudentAndActivityWithSoftSkills.mockResolvedValue(null);
    await expect(service.checkInSelf(STUDENT_ID, ACTIVITY_ID, validToken())).rejects.toThrow(NotFoundException);
    expect(repo.updateTx).not.toHaveBeenCalled();
  });

  it('re-scanning after already checked in returns alreadyCheckedIn:true without error, no matter the activity status/switch/token', async () => {
    repo.findActiveByStudentAndActivityWithSoftSkills.mockResolvedValue(
      registration({
        attendance: AttendanceStatus.ATTENDED,
        activity: { ...ACTIVITY, status: ActivityStatus.COMPLETED, selfCheckInEnabled: false },
      }),
    );

    const result = await service.checkInSelf(STUDENT_ID, ACTIVITY_ID, 'garbage-token');
    expect(result).toMatchObject({ alreadyCheckedIn: true });
    expect(repo.updateTx).not.toHaveBeenCalled();
  });

  // แกนของคำถาม "เพื่อนส่งลิงก์/รูป QR มาให้แล้วเช็คอินแทนได้ไหม" — ปิดสวิตช์แล้วต้องเช็คอินไม่ได้ไม่ว่า token จะถูกแค่ไหน
  it('refuses a first-time self check-in while the organizer has not opened check-in (switch off)', async () => {
    repo.findActiveByStudentAndActivityWithSoftSkills.mockResolvedValue(
      registration({ activity: { ...ACTIVITY, selfCheckInEnabled: false } }),
    );

    await expect(service.checkInSelf(STUDENT_ID, ACTIVITY_ID, validToken())).rejects.toThrow(BadRequestException);
    expect(repo.updateTx).not.toHaveBeenCalled();
  });

  // แกนของคำถาม "แคปภาพ/ส่งต่อ QR เก่าให้เพื่อนที่ไม่ได้มา" — token หมดอายุ (หน้าต่าง 5 นาทีที่สร้างไว้ผ่านไปนานแล้ว) ต้องไม่ผ่าน
  it('refuses when the token is missing, malformed, or from a long-expired window', async () => {
    await expect(service.checkInSelf(STUDENT_ID, ACTIVITY_ID, '')).rejects.toThrow(BadRequestException);
    await expect(service.checkInSelf(STUDENT_ID, ACTIVITY_ID, 'not-a-real-token')).rejects.toThrow(BadRequestException);

    const staleWindow = new Date(Date.now() - 60 * 60 * 1000); // 1 ชั่วโมงก่อน — เกินช่วง grace 1 หน้าต่างไปมาก
    const stale = generateCheckinToken(SECRET, ACTIVITY_ID, staleWindow).token;
    await expect(service.checkInSelf(STUDENT_ID, ACTIVITY_ID, stale)).rejects.toThrow(BadRequestException);

    expect(repo.updateTx).not.toHaveBeenCalled();
  });

  it('refuses a token generated for a different activity', async () => {
    const tokenForAnotherActivity = generateCheckinToken(SECRET, ACTIVITY_ID + 1).token;
    await expect(service.checkInSelf(STUDENT_ID, ACTIVITY_ID, tokenForAnotherActivity)).rejects.toThrow(BadRequestException);
    expect(repo.updateTx).not.toHaveBeenCalled();
  });

  // แกนของเรื่องนี้: กัน QR/ลิงก์เก่าของกิจกรรมอื่นที่ไม่ได้กำลังดำเนินอยู่ ณ ตอนนี้ (จบไปแล้วไม่ว่าจะปิดเองหรือ auto-complete)
  it('refuses a first-time self check-in once the activity is already completed (even with a valid token)', async () => {
    repo.findActiveByStudentAndActivityWithSoftSkills.mockResolvedValue(
      registration({ activity: { ...ACTIVITY, status: ActivityStatus.COMPLETED } }),
    );

    await expect(service.checkInSelf(STUDENT_ID, ACTIVITY_ID, validToken())).rejects.toThrow(BadRequestException);
    expect(repo.updateTx).not.toHaveBeenCalled();
  });

  it('still allows self check-in while the activity is merely closed to new registrations (not completed)', async () => {
    repo.findActiveByStudentAndActivityWithSoftSkills.mockResolvedValue(
      registration({ activity: { ...ACTIVITY, status: ActivityStatus.CLOSED } }),
    );

    await expect(service.checkInSelf(STUDENT_ID, ACTIVITY_ID, validToken())).resolves.toMatchObject({
      alreadyCheckedIn: false,
    });
    expect(repo.updateTx).toHaveBeenCalled();
  });
});

describe('RegistrationsService.findByStudent — คะแนนที่รออนุมัติต้องไม่ถึงนักศึกษา', () => {
  const scores = {
    communication: 5, timeManagement: 5, flexibilityAdaptability: 5, teamworkCollaboration: 5,
    analyticCriticalThinking: 5, decisionMaking: 5, creativity: 5, complexProblemSolving: 5,
    curiosityLifelongLearning: 5, negotiationPersuasion: 5, leadership: 5, positiveAttitude: 5,
  };
  let service: RegistrationsService;
  let repo: { findByStudent: jest.Mock };

  beforeEach(async () => {
    repo = { findByStudent: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        RegistrationsService,
        { provide: RegistrationsRepository, useValue: repo },
        { provide: EvaluationsService, useValue: {} },
        { provide: PrismaService, useValue: {} },
        { provide: MailService, useValue: {} },
        { provide: ConfigService, useValue: { get: () => "test-secret" } },
      ],
    }).compile();
    service = module.get(RegistrationsService);
  });

  it('เก็บแถว evaluation ไว้ (ตรรกะหน้านักศึกษาพึ่งการมีอยู่ของมัน) แต่ปิดคะแนนของแถวที่ยังไม่อนุมัติ', async () => {
    repo.findByStudent.mockResolvedValue([
      { id: 1, activity: { id: 9 }, evaluation: { id: 5, status: 'pending_approval', comment: 'x', ...scores } },
    ]);

    const [row]: any[] = await service.findByStudent(50);

    expect(row.evaluation).not.toBeNull();
    expect(row.evaluation.status).toBe('pending_approval');
    expect(row.evaluation.leadership).toBe(0);
    expect(row.evaluation.communication).toBe(0);
    expect(row.evaluation.comment).toBeNull();
    expect(row.activity).toEqual({ id: 9 });
  });

  it('แถวที่อนุมัติแล้วและแถวที่ยังไม่เช็คอิน (ไม่มี evaluation) ไม่ถูกแตะ', async () => {
    repo.findByStudent.mockResolvedValue([
      { id: 1, evaluation: { id: 5, status: 'approved', comment: null, ...scores } },
      { id: 2, evaluation: null },
    ]);

    const [approved, none]: any[] = await service.findByStudent(50);

    expect(approved.evaluation.leadership).toBe(5);
    expect(none.evaluation).toBeNull();
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
        { provide: ConfigService, useValue: { get: () => "test-secret" } },
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

describe('RegistrationsService.create — registration deadline (Event.registrationCloseAt)', () => {
  let service: RegistrationsService;
  let repo: { findActivityWithActiveCount: jest.Mock; findActiveByStudentAndActivity: jest.Mock; create: jest.Mock };

  const DEADLINE = new Date('2027-01-20T10:00:00.000Z');

  const activityWithDeadline = (registrationCloseAt: Date | null) => ({
    id: 1,
    event: { visibility: 'everyone', registrationCloseAt },
    approvalStatus: 'approved',
    status: 'open',
    capacity: null,
    volunteerRole: null,
    questions: [],
    _count: { registrations: 0 },
    registrationType: RegistrationType.PARTICIPANT,
    dutyRoleOptions: [] as string[],
    dutyShiftOptions: [] as string[],
    teamSizeMin: null,
    teamSizeMax: null,
    competitionCategoryOptions: [] as string[],
  });

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(DEADLINE);
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
        { provide: ConfigService, useValue: { get: () => "test-secret" } },
      ],
    }).compile();
    service = module.get(RegistrationsService);
  });

  afterEach(() => jest.useRealTimers());

  const register = () => service.create(5, 1, {} as any, [], {}, {});

  it('rejects a registration after the deadline, without creating anything', async () => {
    repo.findActivityWithActiveCount.mockResolvedValue(activityWithDeadline(new Date(DEADLINE.getTime() - 1)));

    await expect(register()).rejects.toThrow(BadRequestException);
    await expect(register()).rejects.toThrow('หมดเขตรับสมัครแล้ว');
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects at the exact deadline instant (the deadline itself is already closed)', async () => {
    repo.findActivityWithActiveCount.mockResolvedValue(activityWithDeadline(DEADLINE));

    await expect(register()).rejects.toThrow(BadRequestException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('still accepts a registration one millisecond before the deadline', async () => {
    repo.findActivityWithActiveCount.mockResolvedValue(activityWithDeadline(new Date(DEADLINE.getTime() + 1)));

    await expect(register()).resolves.toEqual({ id: 99 });
  });

  it('accepts when the event has no deadline, and when the activity has no event at all', async () => {
    repo.findActivityWithActiveCount.mockResolvedValue(activityWithDeadline(null));
    await expect(register()).resolves.toEqual({ id: 99 });

    repo.findActivityWithActiveCount.mockResolvedValue({ ...activityWithDeadline(null), event: null });
    await expect(register()).resolves.toEqual({ id: 99 });
  });
});

describe('RegistrationsService.create — registration open date (Event.registrationOpenAt)', () => {
  let service: RegistrationsService;
  let repo: { findActivityWithActiveCount: jest.Mock; findActiveByStudentAndActivity: jest.Mock; create: jest.Mock };

  const NOW = new Date('2027-01-20T10:00:00.000Z');

  const activityWithWindow = (registrationOpenAt: Date | null, registrationCloseAt: Date | null = null) => ({
    id: 1,
    event: { visibility: 'everyone', registrationOpenAt, registrationCloseAt },
    approvalStatus: 'approved',
    status: 'open',
    capacity: null,
    volunteerRole: null,
    questions: [],
    _count: { registrations: 0 },
    registrationType: RegistrationType.PARTICIPANT,
    dutyRoleOptions: [] as string[],
    dutyShiftOptions: [] as string[],
    teamSizeMin: null,
    teamSizeMax: null,
    competitionCategoryOptions: [] as string[],
  });

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOW);
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
        { provide: ConfigService, useValue: { get: () => "test-secret" } },
      ],
    }).compile();
    service = module.get(RegistrationsService);
  });

  afterEach(() => jest.useRealTimers());

  const register = () => service.create(5, 1, {} as any, [], {}, {});

  it('rejects a registration one millisecond before the open instant, without creating anything', async () => {
    repo.findActivityWithActiveCount.mockResolvedValue(activityWithWindow(new Date(NOW.getTime() + 1)));

    await expect(register()).rejects.toThrow(BadRequestException);
    await expect(register()).rejects.toThrow('ยังไม่อยู่ในเวลาเปิดรับสมัคร');
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('accepts at the exact open instant (the open time itself already counts as open)', async () => {
    repo.findActivityWithActiveCount.mockResolvedValue(activityWithWindow(NOW));

    await expect(register()).resolves.toEqual({ id: 99 });
  });

  it('accepts one millisecond after the open instant', async () => {
    repo.findActivityWithActiveCount.mockResolvedValue(activityWithWindow(new Date(NOW.getTime() - 1)));

    await expect(register()).resolves.toEqual({ id: 99 });
  });

  it('accepts when the event has no open date set', async () => {
    repo.findActivityWithActiveCount.mockResolvedValue(activityWithWindow(null));

    await expect(register()).resolves.toEqual({ id: 99 });
  });

  it('checks the open date before the close date — still-not-open wins over already-closed when both are set', async () => {
    repo.findActivityWithActiveCount.mockResolvedValue(
      activityWithWindow(new Date(NOW.getTime() + 1), new Date(NOW.getTime() - 1)),
    );

    await expect(register()).rejects.toThrow('ยังไม่อยู่ในเวลาเปิดรับสมัคร');
  });
});

