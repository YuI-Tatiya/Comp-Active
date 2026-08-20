import { Test } from '@nestjs/testing';
import { EventsRepository } from './events.repository';
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
      eventSurveyQuestion: { deleteMany: jest.fn(), createMany: jest.fn() },
      eventVisibilityProgram: { deleteMany: jest.fn(), createMany: jest.fn() },
      eventVisibilityYear: { deleteMany: jest.fn(), createMany: jest.fn() },
      activity: { deleteMany: jest.fn(), update: jest.fn(), create: jest.fn() },
      activitySoftSkill: { deleteMany: jest.fn(), createMany: jest.fn() },
      activityQuestion: { deleteMany: jest.fn(), create: jest.fn() },
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
            category: 'Technology',
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

    expect(tx.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10 } }),
    );
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
            category: 'Technology',
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
});
