import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CertificatesService } from './certificate.service';
import { CertificatesRepository } from './certificate.repository';
import { AttendanceStatus } from '../../../common/enums/status.enum';

describe('CertificatesService.issue', () => {
  let service: CertificatesService;
  let repo: {
    findRegistrationWithActivityAndStudent: jest.Mock;
    findByRegistrationId: jest.Mock;
    create: jest.Mock;
  };

  const REGISTRATION_ID = 1;

  function registration(overrides: Record<string, unknown> = {}) {
    return {
      id: REGISTRATION_ID,
      attendance: AttendanceStatus.ATTENDED,
      activity: { volunteerHours: 6, volunteerRole: 'ผู้ช่วยกิจกรรม' },
      ...overrides,
    };
  }

  beforeEach(async () => {
    repo = {
      findRegistrationWithActivityAndStudent: jest.fn().mockResolvedValue(registration()),
      findByRegistrationId: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 99 }),
    };

    const module = await Test.createTestingModule({
      providers: [CertificatesService, { provide: CertificatesRepository, useValue: repo }],
    }).compile();
    service = module.get(CertificatesService);
  });

  it('falls back to the activity default when no override is given', async () => {
    await service.issue(REGISTRATION_ID);

    expect(repo.create).toHaveBeenCalledWith(
      REGISTRATION_ID,
      expect.any(String),
      expect.any(String),
      6,
      'ผู้ช่วยกิจกรรม',
    );
  });

  it('uses the override instead of the activity default when given', async () => {
    await service.issue(REGISTRATION_ID, 8);

    expect(repo.create).toHaveBeenCalledWith(
      REGISTRATION_ID,
      expect.any(String),
      expect.any(String),
      8,
      'ผู้ช่วยกิจกรรม',
    );
  });

  it('rounds the override to 2 decimal places defensively', async () => {
    await service.issue(REGISTRATION_ID, 5.6789);

    expect(repo.create).toHaveBeenCalledWith(
      REGISTRATION_ID,
      expect.any(String),
      expect.any(String),
      5.68,
      'ผู้ช่วยกิจกรรม',
    );
  });

  it('treats an override of 0 as an explicit value, not "no override"', async () => {
    await service.issue(REGISTRATION_ID, 0);

    expect(repo.create).toHaveBeenCalledWith(
      REGISTRATION_ID,
      expect.any(String),
      expect.any(String),
      0,
      'ผู้ช่วยกิจกรรม',
    );
  });

  it('rejects issuance before the student has checked in', async () => {
    repo.findRegistrationWithActivityAndStudent.mockResolvedValue(
      registration({ attendance: AttendanceStatus.ABSENT }),
    );

    await expect(service.issue(REGISTRATION_ID)).rejects.toThrow(BadRequestException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects a second issuance for the same registration', async () => {
    repo.findByRegistrationId.mockResolvedValue({ id: 5 });

    await expect(service.issue(REGISTRATION_ID)).rejects.toThrow(BadRequestException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the registration does not exist', async () => {
    repo.findRegistrationWithActivityAndStudent.mockResolvedValue(null);

    await expect(service.issue(REGISTRATION_ID)).rejects.toThrow(NotFoundException);
    expect(repo.create).not.toHaveBeenCalled();
  });
});
