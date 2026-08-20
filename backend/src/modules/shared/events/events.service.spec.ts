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
            category: 'Technology',
            startAt: '2027-01-01T09:00:00.000Z',
            endAt: '2027-01-01T12:00:00.000Z',
            location: 'Room 1',
          },
          {
            id: 11,
            name: 'Day 2',
            description: 'd',
            category: 'Technology',
            startAt: '2027-01-02T09:00:00.000Z',
            endAt: '2027-01-02T12:00:00.000Z',
            location: 'Room 1',
          },
        ],
  } as any;
}

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
      service.update(7, UserRole.ORGANIZER, 1, makeDto([
        {
          id: 10,
          name: 'Day 1',
          description: 'd',
          category: 'Technology',
          startAt: '2027-01-01T09:00:00.000Z',
          endAt: '2027-01-01T12:00:00.000Z',
          location: 'Room 1',
        },
      ])),
    ).rejects.toThrow(BadRequestException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('allows removing an activity with no registrations', async () => {
    repo.findById.mockResolvedValue(makeEvent());
    await service.update(7, UserRole.ORGANIZER, 1, makeDto([
      {
        id: 11,
        name: 'Day 2',
        description: 'd',
        category: 'Technology',
        startAt: '2027-01-02T09:00:00.000Z',
        endAt: '2027-01-02T12:00:00.000Z',
        location: 'Room 1',
      },
    ]));
    expect(repo.update).toHaveBeenCalledWith(1, expect.anything(), [10]);
  });
});

describe('EventsService.findByIdPublic', () => {
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
    await expect(service.findByIdPublic(1, null)).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when the viewer is not eligible for a restricted event', async () => {
    repo.findById.mockResolvedValue({
      id: 1,
      visibility: 'restricted',
      visibilityStudentIdFilter: null,
      visibilityProgram: [{ programCode: 'CS' }],
      visibilityYears: [],
    });
    await expect(
      service.findByIdPublic(1, { role: 'student', studentId: '653380001-1', program: 'IT' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns the event when visibility is everyone', async () => {
    const event = { id: 1, visibility: 'everyone', visibilityProgram: [], visibilityYears: [] };
    repo.findById.mockResolvedValue(event);
    await expect(service.findByIdPublic(1, null)).resolves.toBe(event);
  });
});
