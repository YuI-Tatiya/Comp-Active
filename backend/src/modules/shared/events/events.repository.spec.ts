import { Test } from '@nestjs/testing';
import { EventsRepository, eventInclude, eventOrganizerInclude } from './events.repository';
import { PrismaService } from '../../../prisma/prisma.service';

describe('EventsRepository.update', () => {
  let repo: EventsRepository;
  let tx: any;
  let prisma: { $transaction: jest.Mock };

  beforeEach(async () => {
    tx = {
      event: {
        update: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ id: 1, name: 'Updated' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ organizerId: 42 }),
      },
      // update() now reconciles surveyQuestions/activityQuestion in place (findMany the
      // existing rows, then update/create/delete the difference) instead of wiping the
      // whole set — see the "ห้ามลบทั้งชุดแล้วสร้างใหม่" comment in events.repository.ts.
      // findMany defaults to no existing rows so every test's incoming list is all-create.
      eventSurveyQuestion: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      registrationSurveyAnswer: { deleteMany: jest.fn() },
      eventVisibilityProgram: { deleteMany: jest.fn(), createMany: jest.fn() },
      eventVisibilityYear: { deleteMany: jest.fn(), createMany: jest.fn() },
      activity: { deleteMany: jest.fn(), update: jest.fn(), create: jest.fn() },
      activitySoftSkill: { deleteMany: jest.fn(), createMany: jest.fn() },
      activityQuestion: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      activityQuestionOption: { create: jest.fn(), update: jest.fn(), deleteMany: jest.fn() },
      registrationAnswer: { deleteMany: jest.fn() },
    };
    prisma = { $transaction: jest.fn((cb) => cb(tx)) };

    const module = await Test.createTestingModule({
      providers: [EventsRepository, { provide: PrismaService, useValue: prisma }],
    }).compile();

    repo = module.get(EventsRepository);
  });

  it('deletes activities that were removed from the submitted list', async () => {
    await repo.update(
      1,
      {
        name: 'Updated',
        description: 'desc',
        isPublic: true,
        activities: [],
        surveyQuestions: [],
        visibility: 'everyone',
        visibilityPrograms: [],
        visibilityYears: [],
      },
      [5, 6],
    );

    expect(tx.activity.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [5, 6] } } });
  });

  it('updates an existing activity in place when it has an id', async () => {
    await repo.update(
      1,
      {
        name: 'Updated',
        description: 'desc',
        isPublic: true,
        activities: [
          {
            id: 10,
            name: 'A1',
            description: 'd',
            categories: ['Technology'],
            startAt: new Date(),
            endAt: new Date(),
            date: new Date(),
            startTime: '09:00',
            endTime: '10:00',
            location: 'Room 1',
            softSkillRates: [],
            questions: [],
          },
        ],
        surveyQuestions: [],
        visibility: 'everyone',
        visibilityPrograms: [],
        visibilityYears: [],
      },
      [],
    );

    expect(tx.activity.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 10 } }));
    expect(tx.activity.create).not.toHaveBeenCalled();
  });

  it('creates a new activity when no id is given', async () => {
    await repo.update(
      1,
      {
        name: 'Updated',
        description: 'desc',
        isPublic: true,
        activities: [
          {
            name: 'A2',
            description: 'd',
            categories: ['Technology'],
            startAt: new Date(),
            endAt: new Date(),
            date: new Date(),
            startTime: '09:00',
            endTime: '10:00',
            location: 'Room 1',
            softSkillRates: [],
            questions: [],
          },
        ],
        surveyQuestions: [],
        visibility: 'everyone',
        visibilityPrograms: [],
        visibilityYears: [],
      },
      [],
    );

    expect(tx.activity.create).toHaveBeenCalled();
    expect(tx.activity.update).not.toHaveBeenCalled();
  });

  it('returns the updated event using eventOrganizerInclude (full registration data)', async () => {
    await repo.update(
      1,
      {
        name: 'Updated',
        description: 'desc',
        isPublic: true,
        activities: [],
        surveyQuestions: [],
        visibility: 'everyone',
        visibilityPrograms: [],
        visibilityYears: [],
      },
      [],
    );

    expect(tx.event.findUnique).toHaveBeenCalledWith({ where: { id: 1 }, include: eventOrganizerInclude });
  });
});

describe('EventsRepository include shape', () => {
  let repo: EventsRepository;
  let prisma: any;

  beforeEach(async () => {
    prisma = { event: { findUnique: jest.fn(), findMany: jest.fn() } };

    const module = await Test.createTestingModule({
      providers: [EventsRepository, { provide: PrismaService, useValue: prisma }],
    }).compile();

    repo = module.get(EventsRepository);
  });

  it('eventInclude does not expose student/evaluation on registrations (public-safe)', () => {
    expect(eventInclude.activities.include.registrations as any).toBe(true);
  });

  it('eventOrganizerInclude exposes student/evaluation on registrations', () => {
    const registrationsInclude = (eventOrganizerInclude.activities.include.registrations as any).include;
    expect(registrationsInclude.student).toBeDefined();
    expect(registrationsInclude.evaluation).toBe(true);
  });

  it('both includes carry _count.registrations for registeredCount mapping', () => {
    expect((eventInclude.activities.include as any)._count).toEqual({ select: { registrations: true } });
    expect((eventOrganizerInclude.activities.include as any)._count).toEqual({ select: { registrations: true } });
  });

  it('findById uses eventOrganizerInclude', async () => {
    prisma.event.findUnique.mockResolvedValue({ id: 1 });
    await repo.findById(1);
    expect(prisma.event.findUnique).toHaveBeenCalledWith({ where: { id: 1 }, include: eventOrganizerInclude });
  });

  it('findByIdPublicSafe uses eventInclude', async () => {
    prisma.event.findUnique.mockResolvedValue({ id: 1 });
    await repo.findByIdPublicSafe(1);
    expect(prisma.event.findUnique).toHaveBeenCalledWith({ where: { id: 1 }, include: eventInclude });
  });

  it('findByOrganizer uses eventOrganizerInclude', async () => {
    prisma.event.findMany.mockResolvedValue([]);
    await repo.findByOrganizer(7);
    expect(prisma.event.findMany).toHaveBeenCalledWith(expect.objectContaining({ include: eventOrganizerInclude }));
  });

  it('findAllApproved uses eventInclude', async () => {
    prisma.event.findMany.mockResolvedValue([]);
    await repo.findAllApproved();
    expect(prisma.event.findMany).toHaveBeenCalledWith(expect.objectContaining({ include: eventInclude }));
  });
});
