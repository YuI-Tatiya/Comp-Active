import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { RegistrationsRepository } from './registrations.repository';
import {
  RegistrationStatus,
  AttendanceStatus,
  ActivityStatus,
  ApprovalStatus,
} from '../../../common/enums/status.enum';

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(private readonly registrationsRepository: RegistrationsRepository) {}

  async create(studentId: number, activityId: number) {
    const activity = await this.registrationsRepository.findActivityWithActiveCount(activityId);

    if (!activity) throw new NotFoundException('ไม่พบกิจกรรม');

    if (activity.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new BadRequestException('กิจกรรมนี้ยังไม่ได้รับการอนุมัติ');
    }

    if (activity.status !== ActivityStatus.OPEN) {
      throw new BadRequestException('กิจกรรมนี้ปิดรับสมัครแล้ว');
    }

    if (activity._count.registrations >= activity.capacity) {
      throw new BadRequestException('กิจกรรมนี้เต็มแล้ว');
    }

    const existing = await this.registrationsRepository.findActiveByStudentAndActivity(studentId, activityId);

    if (existing) throw new ConflictException('คุณลงทะเบียนกิจกรรมนี้แล้ว');

    const registration = await this.registrationsRepository.create(studentId, activityId);

    this.logger.log(`Registration created: student ${studentId} → activity ${activityId}`);
    return registration;
  }

  async cancel(registrationId: number, studentId: number) {
    const registration = await this.registrationsRepository.findByIdAndStudent(registrationId, studentId);

    if (!registration) throw new NotFoundException('ไม่พบรายการลงทะเบียน');

    if (registration.status === RegistrationStatus.CANCELLED) {
      throw new BadRequestException('รายการนี้ถูกยกเลิกแล้ว');
    }

    await this.registrationsRepository.update(registrationId, { status: RegistrationStatus.CANCELLED as any });

    this.logger.log(`Registration cancelled: ID ${registrationId}`);
  }

  async findByStudent(studentId: number) {
    return this.registrationsRepository.findByStudent(studentId);
  }

  async findByActivity(activityId: number) {
    return this.registrationsRepository.findByActivity(activityId);
  }

  async confirm(registrationId: number) {
    const registration = await this.registrationsRepository.findById(registrationId);

    if (!registration) throw new NotFoundException('ไม่พบรายการลงทะเบียน');

    const saved = await this.registrationsRepository.update(registrationId, {
      status: RegistrationStatus.CONFIRMED as any,
    });

    this.logger.log(`Registration confirmed: ID ${registrationId}`);
    return saved;
  }

  async checkIn(registrationId: number) {
    const registration = await this.registrationsRepository.findById(registrationId);

    if (!registration) throw new NotFoundException('ไม่พบรายการลงทะเบียน');

    if (registration.status !== RegistrationStatus.CONFIRMED) {
      throw new BadRequestException('ต้องยืนยันการลงทะเบียนก่อนเช็คอิน');
    }

    const saved = await this.registrationsRepository.update(registrationId, {
      attendance: AttendanceStatus.ATTENDED as any,
      checkInTime: new Date(),
    });

    this.logger.log(`Check-in: registration ID ${registrationId}`);
    return saved;
  }

  async countAll() {
    return this.registrationsRepository.countAll();
  }
}
