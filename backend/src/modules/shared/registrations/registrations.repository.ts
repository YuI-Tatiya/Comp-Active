import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RegistrationStatus } from '../../../common/enums/status.enum';

@Injectable()
export class RegistrationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActivityWithActiveCount(activityId: number) {
    return this.prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        _count: { select: { registrations: { where: { status: { not: RegistrationStatus.CANCELLED as any } } } } },
      },
    });
  }

  findActiveByStudentAndActivity(studentId: number, activityId: number) {
    return this.prisma.registration.findFirst({
      where: {
        studentId,
        activityId,
        status: { in: [RegistrationStatus.PENDING as any, RegistrationStatus.CONFIRMED as any] },
      },
    });
  }

  create(studentId: number, activityId: number) {
    return this.prisma.registration.create({
      data: { studentId, activityId, status: RegistrationStatus.PENDING as any },
    });
  }

  findByIdAndStudent(id: number, studentId: number) {
    return this.prisma.registration.findFirst({ where: { id, studentId } });
  }

  update(id: number, data: Record<string, any>) {
    return this.prisma.registration.update({ where: { id }, data });
  }

  findById(id: number) {
    return this.prisma.registration.findUnique({ where: { id } });
  }

  findByStudent(studentId: number) {
    return this.prisma.registration.findMany({
      where: { studentId },
      include: { activity: true, evaluation: true },
      orderBy: { registerDate: 'desc' },
    });
  }

  findByActivity(activityId: number) {
    return this.prisma.registration.findMany({
      where: { activityId },
      include: { student: true },
      orderBy: { registerDate: 'asc' },
    });
  }

  countAll() {
    return this.prisma.registration.count();
  }
}
