import { Test } from '@nestjs/testing';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ActivitiesRepository } from './activities.repository';
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
      providers: [ActivitiesService, { provide: ActivitiesRepository, useValue: repo }],
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
