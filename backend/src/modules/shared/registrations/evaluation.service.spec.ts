import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EvaluationsService } from './evaluation.service';
import { EvaluationsRepository } from './evaluation.repository';
import { UserRole } from '../../../common/enums/role.enum';

describe('EvaluationsService.autoCreateForCheckIn', () => {
  let service: EvaluationsService;
  let repo: {
    findByRegistrationIdTx: jest.Mock;
    createTx: jest.Mock;
    findBaselinesForDutyRoleTx: jest.Mock;
  };

  const SKILLS = [
    { skillType: 'leadership', rate: 3 },
    { skillType: 'communication', rate: 2 },
  ];

  beforeEach(() => {
    repo = {
      findByRegistrationIdTx: jest.fn().mockResolvedValue(null),
      createTx: jest.fn().mockResolvedValue({ id: 1 }),
      findBaselinesForDutyRoleTx: jest.fn().mockResolvedValue([]),
    };
    service = new EvaluationsService(repo as unknown as EvaluationsRepository);
  });

  it('copies the activity default rate when there is no dutyRole context', async () => {
    await service.autoCreateForCheckIn({}, 1, 7, SKILLS);

    expect(repo.findBaselinesForDutyRoleTx).not.toHaveBeenCalled();
    expect(repo.createTx).toHaveBeenCalledWith(
      {},
      1,
      7,
      expect.objectContaining({ leadership: 3, communication: 2, creativity: 0 }),
      'approved',
    );
  });

  it("uses the dutyRole's baseline instead of the activity default for a late check-in", async () => {
    repo.findBaselinesForDutyRoleTx.mockResolvedValue([{ skillType: 'leadership', score: 5 }]);

    await service.autoCreateForCheckIn({}, 1, 7, SKILLS, { activityId: 10, dutyRole: 'ฝ่ายอุปกรณ์' });

    expect(repo.findBaselinesForDutyRoleTx).toHaveBeenCalledWith({}, 10, 'ฝ่ายอุปกรณ์');
    expect(repo.createTx).toHaveBeenCalledWith({}, 1, 7, expect.objectContaining({ leadership: 5, communication: 2 }), 'approved');
  });

  it('ignores a stale baseline for a skill the activity no longer evaluates', async () => {
    repo.findBaselinesForDutyRoleTx.mockResolvedValue([{ skillType: 'creativity', score: 5 }]);

    await service.autoCreateForCheckIn({}, 1, 7, SKILLS, { activityId: 10, dutyRole: 'ฝ่ายอุปกรณ์' });

    expect(repo.createTx).toHaveBeenCalledWith({}, 1, 7, expect.objectContaining({ creativity: 0 }), 'approved');
  });

  it('creates the row as pending_approval when the activity runs in 360° mode (hidden from the student until approved)', async () => {
    await service.autoCreateForCheckIn({}, 1, 7, SKILLS, { activityId: 10, dutyRole: 'ฝ่ายอุปกรณ์', pendingApproval: true });

    expect(repo.createTx).toHaveBeenCalledWith({}, 1, 7, expect.any(Object), 'pending_approval');
  });

  it('keeps the row approved (visible immediately) when 360° mode is off', async () => {
    await service.autoCreateForCheckIn({}, 1, 7, SKILLS, { activityId: 10, pendingApproval: false });

    expect(repo.createTx).toHaveBeenCalledWith({}, 1, 7, expect.any(Object), 'approved');
  });

  it('does nothing when an evaluation already exists (no double check-in overwrite)', async () => {
    repo.findByRegistrationIdTx.mockResolvedValue({ id: 99 });

    const result = await service.autoCreateForCheckIn({}, 1, 7, SKILLS, { activityId: 10, dutyRole: 'ฝ่ายอุปกรณ์' });

    expect(result).toEqual({ id: 99 });
    expect(repo.createTx).not.toHaveBeenCalled();
  });
});

describe('EvaluationsService.findByActivity', () => {
  const OWNER_ID = 10;
  const ACTIVITY_ID = 5;
  let service: EvaluationsService;
  let repo: { findActivityOrganizerId: jest.Mock; findByActivity: jest.Mock };

  beforeEach(() => {
    repo = {
      findActivityOrganizerId: jest.fn().mockResolvedValue(OWNER_ID),
      findByActivity: jest.fn().mockResolvedValue([{ id: 1 }]),
    };
    service = new EvaluationsService(repo as unknown as EvaluationsRepository);
  });

  it('returns the evaluations to the organizer who owns the activity', async () => {
    await expect(service.findByActivity(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID)).resolves.toEqual([{ id: 1 }]);
    expect(repo.findByActivity).toHaveBeenCalledWith(ACTIVITY_ID);
  });

  it('throws ForbiddenException for an organizer who does not own the activity, without reading any evaluation', async () => {
    await expect(service.findByActivity(999, UserRole.ORGANIZER, ACTIVITY_ID)).rejects.toThrow(ForbiddenException);
    expect(repo.findByActivity).not.toHaveBeenCalled();
  });

  it('allows an admin who does not own the activity', async () => {
    await expect(service.findByActivity(999, UserRole.ADMIN, ACTIVITY_ID)).resolves.toEqual([{ id: 1 }]);
  });

  it('throws NotFoundException when the activity does not exist', async () => {
    repo.findActivityOrganizerId.mockResolvedValue(null);
    await expect(service.findByActivity(OWNER_ID, UserRole.ORGANIZER, ACTIVITY_ID)).rejects.toThrow(NotFoundException);
    expect(repo.findByActivity).not.toHaveBeenCalled();
  });
});

describe('EvaluationsService.override — ownership', () => {
  const OWNER_ID = 10;
  let service: EvaluationsService;
  let repo: { findRegistrationWithActivity: jest.Mock; findByRegistrationId: jest.Mock; update: jest.Mock };

  beforeEach(() => {
    repo = {
      findRegistrationWithActivity: jest.fn().mockResolvedValue({ id: 1, activity: { organizerId: OWNER_ID } }),
      findByRegistrationId: jest.fn().mockResolvedValue({ id: 99 }),
      update: jest.fn().mockResolvedValue({ id: 99, leadership: 3 }),
    };
    service = new EvaluationsService(repo as unknown as EvaluationsRepository);
  });

  it('updates the scores for the organizer who owns the activity', async () => {
    await service.override(OWNER_ID, UserRole.ORGANIZER, 1, { leadership: 3 } as any);
    expect(repo.update).toHaveBeenCalledWith(1, { leadership: 3 });
  });

  it('throws ForbiddenException (not BadRequest) for an organizer who does not own the activity', async () => {
    await expect(service.override(999, UserRole.ORGANIZER, 1, { leadership: 3 } as any)).rejects.toThrow(
      ForbiddenException,
    );
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('refuses to overwrite a row locked by a 360° approval (only the approval flow may change it)', async () => {
    repo.findByRegistrationId.mockResolvedValue({ id: 99, approval: { id: 5 } });

    await expect(service.override(OWNER_ID, UserRole.ORGANIZER, 1, { leadership: 3 } as any)).rejects.toThrow(
      BadRequestException,
    );
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('allows an admin who does not own the activity', async () => {
    await service.override(999, UserRole.ADMIN, 1, { leadership: 3 } as any);
    expect(repo.update).toHaveBeenCalled();
  });

  it('throws NotFoundException when the registration does not exist', async () => {
    repo.findRegistrationWithActivity.mockResolvedValue(null);
    await expect(service.override(OWNER_ID, UserRole.ORGANIZER, 1, {} as any)).rejects.toThrow(NotFoundException);
  });
});
