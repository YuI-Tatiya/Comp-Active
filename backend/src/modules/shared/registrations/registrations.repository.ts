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
        questions: { include: { options: true } },
        event: {
          select: {
            visibility: true,
            visibilityStudentIdFilter: true,
            visibilityProgram: { select: { programCode: true } },
            visibilityYears: { select: { year: true } },
          },
        },
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

  create(
    studentId: number,
    activityId: number,
    answers: { questionId: number; textValue?: string; optionIds: number[] }[] = [],
  ) {
    return this.prisma.registration.create({
      data: {
        studentId,
        activityId,
        status: RegistrationStatus.PENDING as any,
        answers: {
          create: answers.map((a) => ({
            questionId: a.questionId,
            textValue: a.textValue,
            options: a.optionIds.length
              ? { create: a.optionIds.map((optionId) => ({ optionId })) }
              : undefined,
          })),
        },
      } as any,
      include: { answers: { include: { options: true } } },
    });
  }

  findByIdAndStudent(id: number, studentId: number) {
    return this.prisma.registration.findFirst({ where: { id, studentId } });
  }

  update(id: number, data: Record<string, any>) {
    return this.prisma.registration.update({ where: { id }, data });
  }

  /** ใช้ตอนเช็คอิน — อยู่ใน $transaction เดียวกับการสร้างคะแนนอัตโนมัติ ผ่าน tx client ที่ส่งมา */
  updateTx(tx: any, id: number, data: Record<string, any>) {
    return tx.registration.update({ where: { id }, data });
  }

  findById(id: number) {
    return this.prisma.registration.findUnique({ where: { id } });
  }

  findByIdWithActivitySoftSkills(id: number) {
    return this.prisma.registration.findUnique({
      where: { id },
      include: { activity: { include: { softSkills: true } } },
    });
  }

  /** ใช้สำหรับส่งอีเมลยืนยันการลงทะเบียน — ต้องการอีเมล/ชื่อนักศึกษาและรายละเอียดกิจกรรม */
  findByIdWithStudentAndActivity(id: number) {
    return this.prisma.registration.findUnique({
      where: { id },
      include: { student: true, activity: true },
    });
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

  findByIdWithEventSurveyQuestions(id: number) {
    return this.prisma.registration.findUnique({
      where: { id },
      include: {
        activity: {
          include: { event: { include: { surveyQuestions: { orderBy: { sortOrder: 'asc' } } } } },
        },
      },
    });
  }

  findAnySurveyAnswer(registrationId: number) {
    return this.prisma.registrationSurveyAnswer.findFirst({ where: { registrationId } });
  }

  createSurveyAnswers(
    registrationId: number,
    answers: { questionId: number; ratingValue?: number; textValue?: string }[],
  ) {
    return this.prisma.registrationSurveyAnswer.createMany({
      data: answers.map((a) => ({ registrationId, ...a })),
    });
  }
}
