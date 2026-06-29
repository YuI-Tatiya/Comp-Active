import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  RegistrationStatus,
  AttendanceStatus,
  ActivityStatus,
  ApprovalStatus,
} from '../common/enums/status.enum';

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(studentId: number, activityId: number) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: { _count: { select: { registrations: { where: { status: { not: RegistrationStatus.CANCELLED as any } } } } } },
    });

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

    const existing = await this.prisma.registration.findFirst({
      where: {
        studentId,
        activityId,
        status: { in: [RegistrationStatus.PENDING as any, RegistrationStatus.CONFIRMED as any] },
      },
    });

    if (existing) throw new ConflictException('คุณลงทะเบียนกิจกรรมนี้แล้ว');

    const registration = await this.prisma.registration.create({
      data: {
        studentId,
        activityId,
        status: RegistrationStatus.PENDING as any,
      },
    });

    this.logger.log(`Registration created: student ${studentId} → activity ${activityId}`);
    return registration;
  }

  async cancel(registrationId: number, studentId: number) {
    const registration = await this.prisma.registration.findFirst({
      where: { id: registrationId, studentId },
    });

    if (!registration) throw new NotFoundException('ไม่พบรายการลงทะเบียน');

    if (registration.status === RegistrationStatus.CANCELLED) {
      throw new BadRequestException('รายการนี้ถูกยกเลิกแล้ว');
    }

    await this.prisma.registration.update({
      where: { id: registrationId },
      data: { status: RegistrationStatus.CANCELLED as any },
    });

    this.logger.log(`Registration cancelled: ID ${registrationId}`);
  }

  async findByStudent(studentId: number) {
    return this.prisma.registration.findMany({
      where: { studentId },
      include: { activity: true, evaluation: true },
      orderBy: { registerDate: 'desc' },
    });
  }

  async findByActivity(activityId: number) {
    return this.prisma.registration.findMany({
      where: { activityId },
      include: { student: true },
      orderBy: { registerDate: 'asc' },
    });
  }

  async confirm(registrationId: number) {
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) throw new NotFoundException('ไม่พบรายการลงทะเบียน');

    const saved = await this.prisma.registration.update({
      where: { id: registrationId },
      data: { status: RegistrationStatus.CONFIRMED as any },
    });

    this.logger.log(`Registration confirmed: ID ${registrationId}`);
    return saved;
  }

  async checkIn(registrationId: number) {
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) throw new NotFoundException('ไม่พบรายการลงทะเบียน');

    if (registration.status !== RegistrationStatus.CONFIRMED) {
      throw new BadRequestException('ต้องยืนยันการลงทะเบียนก่อนเช็คอิน');
    }

    const saved = await this.prisma.registration.update({
      where: { id: registrationId },
      data: {
        attendance: AttendanceStatus.ATTENDED as any,
        checkInTime: new Date(),
      },
    });

    this.logger.log(`Check-in: registration ID ${registrationId}`);
    return saved;
  }

  async countAll() {
    return this.prisma.registration.count();
  }
}
