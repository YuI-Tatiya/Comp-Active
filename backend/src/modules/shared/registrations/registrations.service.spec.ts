import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { RegistrationsRepository } from './registrations.repository';
import { EvaluationsService } from './evaluation.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegistrationStatus } from '../../../common/enums/status.enum';

/** ปล่อยให้ microtask ของ `void this.notifyRegistrationConfirmed(...)` (fire-and-forget) รันจนจบก่อน assert */
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('RegistrationsService.confirm', () => {
  let service: RegistrationsService;
  let repo: { findById: jest.Mock; update: jest.Mock; findByIdWithStudentAndActivity: jest.Mock };
  let mail: { sendRegistrationConfirmed: jest.Mock };

  beforeEach(async () => {
    repo = {
      findById: jest.fn().mockResolvedValue({ id: 1, status: RegistrationStatus.PENDING }),
      update: jest.fn().mockResolvedValue({ id: 1, status: RegistrationStatus.CONFIRMED }),
      findByIdWithStudentAndActivity: jest.fn().mockResolvedValue({
        id: 1,
        student: { email: 'student@kku.ac.th', name: 'Student A' },
        activity: { name: 'Workshop', date: '2027-01-01T00:00:00.000Z', startTime: '09:00', endTime: '12:00', location: 'Room 1' },
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
    const result = await service.confirm(1);
    expect(repo.update).toHaveBeenCalledWith(1, { status: RegistrationStatus.CONFIRMED });
    expect(result).toEqual({ id: 1, status: RegistrationStatus.CONFIRMED });
  });

  it('throws NotFoundException when the registration does not exist', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.confirm(1)).rejects.toThrow(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('emails the student with their activity details after confirming', async () => {
    await service.confirm(1);
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
    await expect(service.confirm(1)).resolves.toEqual({ id: 1, status: RegistrationStatus.CONFIRMED });
    await flush();
  });
});
