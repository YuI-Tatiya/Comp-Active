import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class EvaluationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findRegistrationWithActivity(registrationId: number) {
    return this.prisma.registration.findUnique({ where: { id: registrationId }, include: { activity: true } });
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

  /** ใช้ตอนเช็คอิน — ต้องอยู่ใน $transaction เดียวกับการอัปเดต Registration ผ่าน tx client ที่ส่งมา */
  findByRegistrationIdTx(tx: any, registrationId: number) {
    return tx.evaluation.findUnique({ where: { registrationId } });
  }

  createTx(tx: any, registrationId: number, evaluatorId: number, scores: Record<string, any>) {
    return tx.evaluation.create({ data: { registrationId, evaluatorId, ...scores } });
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
        communication: true,
        timeManagement: true,
        flexibilityAdaptability: true,
        teamworkCollaboration: true,
        analyticCriticalThinking: true,
        decisionMaking: true,
        creativity: true,
        complexProblemSolving: true,
        curiosityLifelongLearning: true,
        negotiationPersuasion: true,
        leadership: true,
        positiveAttitude: true,
      },
      _count: true,
    });
  }
}
