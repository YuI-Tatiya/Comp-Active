import { Test } from '@nestjs/testing';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsRepository } from './events.repository';
import { UserRole } from '../../../common/enums/role.enum';

function makeEvent(overrides: Partial<any> = {}) {
  return {
    id: 1,
    organizerId: 7,
    name: 'Camp',
    activities: [
      { id: 10, name: 'Day 1', registrations: [] },
      { id: 11, name: 'Day 2', registrations: [{ id: 99 }] },
    ],
    ...overrides,
  };
}

function makeDto(activities: any[] = []) {
  return {
    name: 'Camp',
    description: 'desc',
    activities: activities.length
      ? activities
      : [
          {
            id: 10,
            name: 'Day 1',
            description: 'd',
            categories: ['Technology'],
            startAt: '2027-01-01T09:00:00.000Z',
            endAt: '2027-01-01T12:00:00.000Z',
            location: 'Room 1',
          },
          {
            id: 11,
            name: 'Day 2',
            description: 'd',
            categories: ['Technology'],
            startAt: '2027-01-02T09:00:00.000Z',
            endAt: '2027-01-02T12:00:00.000Z',
            location: 'Room 1',
          },
        ],
  } as any;
}

describe('EventsService.create — soft skill cap', () => {
  let service: EventsService;
  let repo: { create: jest.Mock };

  beforeEach(async () => {
    repo = { create: jest.fn().mockResolvedValue({ id: 1, name: 'Camp', activities: [] }) };
    const module = await Test.createTestingModule({
      providers: [EventsService, { provide: EventsRepository, useValue: repo }],
    }).compile();
    service = module.get(EventsService);
  });

  function activityDto(overrides: Record<string, unknown> = {}) {
    return {
      name: 'A1',
      description: 'd',
      categories: ['Technology'],
      startAt: '2027-01-01T09:00:00.000Z',
      endAt: '2027-01-01T12:00:00.000Z', // 3h → cap = 1 (ผ่าน)
      location: 'Room 1',
      ...overrides,
    };
  }

  it('rejects more than 3 selected soft skills', async () => {
    const dto = {
      name: 'Camp',
      description: 'desc',
      activities: [
        activityDto({
          softSkillRates: [
            { skillType: 'communication', rate: 1 },
            { skillType: 'leadership', rate: 1 },
            { skillType: 'creativity', rate: 1 },
            { skillType: 'decision_making', rate: 1 },
          ],
        }),
      ],
    } as any;

    await expect(service.create(7, dto)).rejects.toThrow(BadRequestException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects a rate above the duration-based cap for a short activity', async () => {
    // 3h activity -> cap = 1
    const dto = {
      name: 'Camp',
      description: 'desc',
      activities: [activityDto({ softSkillRates: [{ skillType: 'leadership', rate: 3 }] })],
    } as any;

    await expect(service.create(7, dto)).rejects.toThrow(BadRequestException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('accepts a rate within the duration-based cap', async () => {
    const dto = {
      name: 'Camp',
      description: 'desc',
      activities: [activityDto({ softSkillRates: [{ skillType: 'leadership', rate: 1 }] })],
    } as any;

    await service.create(7, dto);
    expect(repo.create).toHaveBeenCalled();
  });

  it('does NOT unlock level 3 for a short sub-activity of a multi-activity event — the old per-project shortcut was removed, only duration matters now', async () => {
    const dto = {
      name: 'Camp',
      description: 'desc',
      activities: [
        activityDto({
          registrationType: 'staff_volunteer',
          dutyRoleOptions: ['ลงทะเบียนหน้างาน'],
          softSkillRates: [{ skillType: 'leadership', rate: 3 }],
        }),
        activityDto({ name: 'A2', startAt: '2027-01-02T09:00:00.000Z', endAt: '2027-01-02T12:00:00.000Z' }),
      ],
    } as any;

    await expect(service.create(7, dto)).rejects.toThrow(BadRequestException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('does NOT unlock level 3 for a short activity standing alone either (duration is still what matters)', async () => {
    const dto = {
      name: 'Camp',
      description: 'desc',
      activities: [
        activityDto({
          dutyRoleOptions: ['ลงทะเบียนหน้างาน'],
          softSkillRates: [{ skillType: 'leadership', rate: 3 }],
        }),
      ],
    } as any;

    await expect(service.create(7, dto)).rejects.toThrow(BadRequestException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('unlocks level 3 for any activity 2 days or longer (≥48h), regardless of registration type', async () => {
    const dto = {
      name: 'Camp',
      description: 'desc',
      activities: [
        activityDto({
          startAt: '2027-01-01T09:00:00.000Z',
          endAt: '2027-01-03T09:00:00.000Z', // 48h
          softSkillRates: [{ skillType: 'leadership', rate: 3 }],
        }),
      ],
    } as any;

    await service.create(7, dto);
    expect(repo.create).toHaveBeenCalled();
  });
});

describe('EventsService.create — registration window (registrationOpenAt / registrationCloseAt)', () => {
  let service: EventsService;
  let repo: { create: jest.Mock };

  beforeEach(async () => {
    repo = { create: jest.fn().mockResolvedValue({ id: 1, name: 'Camp', activities: [] }) };
    const module = await Test.createTestingModule({
      providers: [EventsService, { provide: EventsRepository, useValue: repo }],
    }).compile();
    service = module.get(EventsService);
  });

  it('rejects when the open date is on or after the close date — no window left to register in', async () => {
    const dto = makeDto();
    dto.registrationOpenAt = '2027-01-01T00:00:00.000Z';
    dto.registrationCloseAt = '2027-01-01T00:00:00.000Z'; // เท่ากันพอดี

    await expect(service.create(7, dto)).rejects.toThrow(BadRequestException);
    await expect(service.create(7, dto)).rejects.toThrow('วันเปิดรับสมัครต้องอยู่ก่อนวันปิดรับสมัคร');
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('accepts and maps both dates when the open date is before the close date', async () => {
    const dto = makeDto();
    dto.registrationOpenAt = '2026-12-01T00:00:00.000Z';
    dto.registrationCloseAt = '2027-01-01T00:00:00.000Z';

    await expect(service.create(7, dto)).resolves.toBeDefined();
    expect(repo.create).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        registrationOpenAt: new Date('2026-12-01T00:00:00.000Z'),
        registrationCloseAt: new Date('2027-01-01T00:00:00.000Z'),
      }),
    );
  });

  it('accepts when only one of the two dates is set (nothing to compare)', async () => {
    const dto = makeDto();
    dto.registrationOpenAt = '2026-12-01T00:00:00.000Z';

    await expect(service.create(7, dto)).resolves.toBeDefined();
  });
});

describe('EventsService.update', () => {
  let service: EventsService;
  let repo: { findById: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    repo = { findById: jest.fn(), update: jest.fn().mockResolvedValue({ id: 1 }) };
    const module = await Test.createTestingModule({
      providers: [EventsService, { provide: EventsRepository, useValue: repo }],
    }).compile();
    service = module.get(EventsService);
  });

  it('throws NotFoundException when the event does not exist', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.update(7, UserRole.ORGANIZER, 1, makeDto())).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when the caller does not own the event', async () => {
    repo.findById.mockResolvedValue(makeEvent());
    await expect(service.update(999, UserRole.ORGANIZER, 1, makeDto())).rejects.toThrow(ForbiddenException);
  });

  it('allows an admin to update an event they do not own', async () => {
    repo.findById.mockResolvedValue(makeEvent());
    await service.update(999, UserRole.ADMIN, 1, makeDto());
    expect(repo.update).toHaveBeenCalled();
  });

  it('rejects removing an activity that already has registrations', async () => {
    repo.findById.mockResolvedValue(makeEvent());
    // ส่งเฉพาะ activity id 10 กลับมา -> id 11 (มีคนลงทะเบียนแล้ว) ถูกเอาออก
    await expect(
      service.update(
        7,
        UserRole.ORGANIZER,
        1,
        makeDto([
          {
            id: 10,
            name: 'Day 1',
            description: 'd',
            categories: ['Technology'],
            startAt: '2027-01-01T09:00:00.000Z',
            endAt: '2027-01-01T12:00:00.000Z',
            location: 'Room 1',
          },
        ]),
      ),
    ).rejects.toThrow(BadRequestException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('allows removing an activity with no registrations', async () => {
    repo.findById.mockResolvedValue(makeEvent());
    await service.update(
      7,
      UserRole.ORGANIZER,
      1,
      makeDto([
        {
          id: 11,
          name: 'Day 2',
          description: 'd',
          categories: ['Technology'],
          startAt: '2027-01-02T09:00:00.000Z',
          endAt: '2027-01-02T12:00:00.000Z',
          location: 'Room 1',
        },
      ]),
    );
    expect(repo.update).toHaveBeenCalledWith(1, expect.anything(), [10]);
  });
});

describe('EventsService.findByIdPublic', () => {
  let service: EventsService;
  let repo: { findByIdPublicSafe: jest.Mock };

  beforeEach(async () => {
    repo = { findByIdPublicSafe: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [EventsService, { provide: EventsRepository, useValue: repo }],
    }).compile();
    service = module.get(EventsService);
  });

  it('throws NotFoundException when the event does not exist', async () => {
    repo.findByIdPublicSafe.mockResolvedValue(null);
    await expect(service.findByIdPublic(1, null)).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when the viewer is not eligible for a restricted event', async () => {
    repo.findByIdPublicSafe.mockResolvedValue({
      id: 1,
      visibility: 'restricted',
      visibilityStudentIdFilter: null,
      visibilityProgram: [{ programCode: 'CS' }],
      visibilityYears: [],
      activities: [{ id: 10, approvalStatus: 'approved' }],
    });
    await expect(
      service.findByIdPublic(1, { role: 'student', studentId: '653380001-1', program: 'IT' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns the event when visibility is everyone', async () => {
    const event = {
      id: 1,
      visibility: 'everyone',
      visibilityProgram: [],
      visibilityYears: [],
      activities: [{ id: 10, approvalStatus: 'approved', _count: { registrations: 3 } }],
    };
    repo.findByIdPublicSafe.mockResolvedValue(event);
    const result = await service.findByIdPublic(1, null);
    expect(result.activities[0].registeredCount).toBe(3);
  });

  it('throws NotFoundException when the event has no approved activity', async () => {
    repo.findByIdPublicSafe.mockResolvedValue({
      id: 1,
      visibility: 'everyone',
      visibilityProgram: [],
      visibilityYears: [],
      activities: [{ id: 10, approvalStatus: 'pending_approval' }],
    });
    await expect(service.findByIdPublic(1, null)).rejects.toThrow(NotFoundException);
  });

  it('strips registrations, organizer.email, and unapproved sibling activities from the response', async () => {
    repo.findByIdPublicSafe.mockResolvedValue({
      id: 1,
      visibility: 'everyone',
      visibilityProgram: [],
      visibilityYears: [],
      activities: [
        {
          id: 10,
          approvalStatus: 'approved',
          registrations: [{ id: 1, studentId: 5 }],
          organizer: { id: 3, name: 'Org', email: 'org@example.com' },
          _count: { registrations: 1 },
        },
        { id: 11, approvalStatus: 'pending_approval', registrations: [], _count: { registrations: 0 } },
      ],
    });

    const result = await service.findByIdPublic(1, null);

    expect(result.activities).toHaveLength(1);
    expect(result.activities[0].id).toBe(10);
    expect(result.activities[0].registrations).toBeUndefined();
    expect(result.activities[0]._count).toBeUndefined();
    expect(result.activities[0].registeredCount).toBe(1);
    expect(result.activities[0].organizer).toEqual({ id: 3, name: 'Org' });
    expect((result.activities[0].organizer as any).email).toBeUndefined();
  });
});

describe('EventsService.findAllPublic', () => {
  let service: EventsService;
  let repo: { findAllApproved: jest.Mock };

  beforeEach(async () => {
    repo = { findAllApproved: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [EventsService, { provide: EventsRepository, useValue: repo }],
    }).compile();
    service = module.get(EventsService);
  });

  it('filters unapproved activities and maps registeredCount for eligible events', async () => {
    repo.findAllApproved.mockResolvedValue([
      {
        id: 1,
        visibility: 'everyone',
        visibilityProgram: [],
        visibilityYears: [],
        activities: [
          {
            id: 10,
            approvalStatus: 'approved',
            registrations: [],
            organizer: { id: 3, name: 'Org', email: 'x@y.com' },
            _count: { registrations: 2 },
          },
          { id: 11, approvalStatus: 'pending_approval', registrations: [], _count: { registrations: 0 } },
        ],
      },
    ]);

    const [result] = await service.findAllPublic(null);
    expect(result.activities).toHaveLength(1);
    expect(result.activities[0].registeredCount).toBe(2);
    expect(result.activities[0].organizer.email).toBeUndefined();
  });
});

describe('EventsService.findByIdForOrganizer', () => {
  let service: EventsService;
  let repo: { findById: jest.Mock };

  beforeEach(async () => {
    repo = { findById: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [EventsService, { provide: EventsRepository, useValue: repo }],
    }).compile();
    service = module.get(EventsService);
  });

  it('throws NotFoundException when the event does not exist', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findByIdForOrganizer(1, 7, UserRole.ORGANIZER)).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException (not Forbidden) when the caller does not own the event', async () => {
    repo.findById.mockResolvedValue({ id: 1, organizerId: 7, activities: [] });
    await expect(service.findByIdForOrganizer(1, 999, UserRole.ORGANIZER)).rejects.toThrow(NotFoundException);
  });

  it('allows an admin to view an event they do not own', async () => {
    repo.findById.mockResolvedValue({ id: 1, organizerId: 7, activities: [] });
    await expect(service.findByIdForOrganizer(1, 999, UserRole.ADMIN)).resolves.toEqual(
      expect.objectContaining({ id: 1 }),
    );
  });

  it('maps registeredCount for the owning organizer, keeping full registration data', async () => {
    repo.findById.mockResolvedValue({
      id: 1,
      organizerId: 7,
      activities: [
        {
          id: 10,
          registrations: [{ id: 1, student: { id: 5, name: 'A', studentId: '1', email: 'a@b.com' }, evaluation: null }],
          _count: { registrations: 1 },
        },
      ],
    });
    const result = await service.findByIdForOrganizer(1, 7, UserRole.ORGANIZER);
    expect(result.activities[0].registeredCount).toBe(1);
    expect(result.activities[0].registrations[0].student.name).toBe('A');
    expect(result.activities[0]._count).toBeUndefined();
  });
});

describe('EventsService.getSurveyResults — ownership', () => {
  let service: EventsService;
  let repo: { findByIdWithSurveyAnswers: jest.Mock };

  beforeEach(async () => {
    repo = { findByIdWithSurveyAnswers: jest.fn().mockResolvedValue({ id: 1, organizerId: 7, surveyQuestions: [] }) };
    const module = await Test.createTestingModule({
      providers: [EventsService, { provide: EventsRepository, useValue: repo }],
    }).compile();
    service = module.get(EventsService);
  });

  it('returns results to the owning organizer', async () => {
    await expect(service.getSurveyResults(1, 7, UserRole.ORGANIZER)).resolves.toBeDefined();
  });

  it('allows an admin who does not own the event', async () => {
    await expect(service.getSurveyResults(1, 999, UserRole.ADMIN)).resolves.toBeDefined();
  });

  it('throws ForbiddenException (not BadRequest) for a non-owning organizer', async () => {
    await expect(service.getSurveyResults(1, 999, UserRole.ORGANIZER)).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException when the event does not exist', async () => {
    repo.findByIdWithSurveyAnswers.mockResolvedValue(null);
    await expect(service.getSurveyResults(1, 7, UserRole.ORGANIZER)).rejects.toThrow(NotFoundException);
  });
});

describe('EventsService.duplicate', () => {
  let service: EventsService;
  let repo: { findById: jest.Mock; duplicateEvent: jest.Mock };

  beforeEach(async () => {
    repo = {
      findById: jest.fn().mockResolvedValue({ id: 1, organizerId: 7, name: 'Camp' }),
      duplicateEvent: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [EventsService, { provide: EventsRepository, useValue: repo }],
    }).compile();
    service = module.get(EventsService);
  });

  it('duplicates for the owning organizer and maps registeredCount', async () => {
    repo.duplicateEvent.mockResolvedValue({
      id: 2,
      name: 'Camp (สำเนา)',
      activities: [{ id: 20, _count: { registrations: 0 } }],
    });

    const result = await service.duplicate(7, UserRole.ORGANIZER, 1);

    expect(repo.duplicateEvent).toHaveBeenCalledWith(1, 7);
    expect(result.id).toBe(2);
    expect(result.activities[0].registeredCount).toBe(0);
    expect(result.activities[0]._count).toBeUndefined();
  });

  it('allows an admin who does not own the event, copying to the admin', async () => {
    repo.duplicateEvent.mockResolvedValue({ id: 2, activities: [] });
    await service.duplicate(999, UserRole.ADMIN, 1);
    expect(repo.duplicateEvent).toHaveBeenCalledWith(1, 999);
  });

  it('throws ForbiddenException for a non-owning organizer', async () => {
    await expect(service.duplicate(999, UserRole.ORGANIZER, 1)).rejects.toThrow(ForbiddenException);
    expect(repo.duplicateEvent).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the event does not exist', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.duplicate(7, UserRole.ORGANIZER, 1)).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException if the event is deleted between the ownership check and the copy', async () => {
    repo.duplicateEvent.mockResolvedValue(null);
    await expect(service.duplicate(7, UserRole.ORGANIZER, 1)).rejects.toThrow(NotFoundException);
  });
});

describe('EventsService.setActivitiesStatus', () => {
  let service: EventsService;
  let repo: { findById: jest.Mock; updateActivitiesStatus: jest.Mock };

  beforeEach(async () => {
    repo = {
      findById: jest.fn().mockResolvedValue({ id: 1, organizerId: 7, name: 'Camp' }),
      updateActivitiesStatus: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [EventsService, { provide: EventsRepository, useValue: repo }],
    }).compile();
    service = module.get(EventsService);
  });

  it('closes every sub-activity for the owning organizer', async () => {
    repo.updateActivitiesStatus.mockResolvedValue({ count: 2 });
    const result = await service.setActivitiesStatus(7, UserRole.ORGANIZER, 1, 'closed');
    expect(repo.updateActivitiesStatus).toHaveBeenCalledWith(1, 'closed');
    expect(result.count).toBe(2);
  });

  it('allows an admin who does not own the event', async () => {
    repo.updateActivitiesStatus.mockResolvedValue({ count: 1 });
    await service.setActivitiesStatus(999, UserRole.ADMIN, 1, 'open');
    expect(repo.updateActivitiesStatus).toHaveBeenCalledWith(1, 'open');
  });

  it('throws ForbiddenException for a non-owning organizer', async () => {
    await expect(service.setActivitiesStatus(999, UserRole.ORGANIZER, 1, 'closed')).rejects.toThrow(
      ForbiddenException,
    );
    expect(repo.updateActivitiesStatus).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the event does not exist', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.setActivitiesStatus(7, UserRole.ORGANIZER, 1, 'closed')).rejects.toThrow(
      NotFoundException,
    );
  });
});
