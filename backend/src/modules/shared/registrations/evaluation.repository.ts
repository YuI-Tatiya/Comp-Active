import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class EvaluationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findRegistrationWithActivity(registrationId: number) {
    return this.prisma.registration.findUnique({
      where: { id: registrationId },
      include: { activity: true },
    });
  }

  findByRegistrationId(registrationId: number) {
    return this.prisma.evaluation.findUnique({ where: { registrationId } });
  }

  update(registrationId: number, scores: Record<string, any>) {
    return this.prisma.evaluation.update({ where: { registrationId }, data: scores });
  }

  create(registrationId: number, evaluatorId: number, scores: Record<string, any>) {
    return this.prisma.evaluation.create({ data: { registrationId, evaluatorId, ...scores } });
  }

  findByStudentWithActivity(studentId: number) {
    return this.prisma.evaluation.findMany({
      where: { registration: { studentId } },
      include: { registration: { include: { activity: true } } },
    });
  }

  findByActivity(activityId: number) {
    return this.prisma.evaluation.findMany({
      where: { registration: { activityId } },
      include: { registration: { include: { student: true } } },
    });
  }

  aggregateSkills() {
    return this.prisma.evaluation.aggregate({
      _avg: {
        teamwork: true,
        leadership: true,
        communication: true,
        problemSolving: true,
        adaptability: true,
      },
      _count: true,
    });
  }
}
