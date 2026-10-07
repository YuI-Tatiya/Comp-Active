import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RegistrationStatus } from '../../../common/enums/status.enum';
import { STUDENT_CONTACT_SELECT } from '../../../common/constants/user-select';

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
            // create() ใช้บังคับช่วงเวลารับสมัคร — ถ้าไม่ select มา ค่าจะเป็น undefined แล้วการเช็คไม่ทำงานโดยไม่มี error
            registrationOpenAt: true,
            registrationCloseAt: true,
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
    certRequest: { wantsCertLoanFund?: boolean; wantsCertScholarship?: boolean } = {},
    registrationTypeFields: {
      dutyRole?: string | null;
      dutyShift?: string | null;
      teamName?: string | null;
      teamSize?: number | null;
      competitionCategory?: string | null;
      submissionLink?: string | null;
    } = {},
  ) {
    return this.prisma.registration.create({
      data: {
        studentId,
        activityId,
        status: RegistrationStatus.PENDING as any,
        wantsCertLoanFund: !!certRequest.wantsCertLoanFund,
        wantsCertScholarship: !!certRequest.wantsCertScholarship,
        dutyRole: registrationTypeFields.dutyRole ?? null,
        dutyShift: registrationTypeFields.dutyShift ?? null,
        teamName: registrationTypeFields.teamName ?? null,
        teamSize: registrationTypeFields.teamSize ?? null,
        competitionCategory: registrationTypeFields.competitionCategory ?? null,
        submissionLink: registrationTypeFields.submissionLink ?? null,
        answers: {
          create: answers.map((a) => ({
            questionId: a.questionId,
            textValue: a.textValue,
            options: a.optionIds.length ? { create: a.optionIds.map((optionId) => ({ optionId })) } : undefined,
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

  findByIdWithActivity(id: number) {
    return this.prisma.registration.findUnique({ where: { id }, include: { activity: true } });
  }

  findByIdWithActivitySoftSkills(id: number) {
    return this.prisma.registration.findUnique({
      where: { id },
      include: { activity: { include: { softSkills: true } } },
    });
  }

  /** ใช้เช็คว่า studentId คนนี้มีการลงทะเบียนที่ยังไม่ถูกยกเลิกของกิจกรรมนี้อยู่หรือไม่ — สำหรับ self check-in ผ่าน QR */
  findActiveByStudentAndActivityWithSoftSkills(studentId: number, activityId: number) {
    return this.prisma.registration.findFirst({
      where: {
        studentId,
        activityId,
        status: { in: [RegistrationStatus.PENDING as any, RegistrationStatus.CONFIRMED as any] },
      },
      include: { activity: { include: { softSkills: true } } },
      orderBy: { registerDate: 'desc' },
    });
  }

  /** ใช้ตรวจสิทธิ์ความเป็นเจ้าของกิจกรรมก่อนให้ organizer ดู/แก้ไขผู้เข้าร่วม */
  async findActivityOrganizerId(activityId: number): Promise<number | null> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { organizerId: true },
    });
    return activity?.organizerId ?? null;
  }

  /** ใช้สำหรับส่งอีเมลยืนยันการลงทะเบียน — ต้องการอีเมล/ชื่อนักศึกษาและรายละเอียดกิจกรรม */
  findByIdWithStudentAndActivity(id: number) {
    return this.prisma.registration.findUnique({ where: { id }, include: { student: { select: STUDENT_CONTACT_SELECT }, activity: true } });
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
      include: { student: { select: STUDENT_CONTACT_SELECT } },
      orderBy: { registerDate: 'asc' },
    });
  }

  countAll() {
    return this.prisma.registration.count();
  }

  /** จำนวนคำขอลงทะเบียนที่รอผู้จัดยืนยัน — นับรวมทุกกิจกรรมของผู้จัดคนนี้ */
  countPendingByOrganizer(organizerId: number) {
    return this.prisma.registration.count({
      where: { status: RegistrationStatus.PENDING as any, activity: { organizerId } },
    });
  }

  // ดึงทั้งแบบสำรวจระดับ "งาน" (activity.event.surveyQuestions) และระดับ "กิจกรรมเดี่ยว"
  // (activity.surveyQuestions) มาพร้อมกัน — กิจกรรมหนึ่งมีได้แค่ทางใดทางหนึ่งเสมอ (มี event หรือไม่มี)
  // service เป็นคนเลือกใช้ชุดที่ตรงกับกิจกรรมนั้นจริงๆ
  findByIdWithEventSurveyQuestions(id: number) {
    return this.prisma.registration.findUnique({
      where: { id },
      include: {
        activity: {
          include: {
            event: { include: { surveyQuestions: { orderBy: { sortOrder: 'asc' } } } },
            surveyQuestions: { orderBy: { sortOrder: 'asc' } },
          },
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
    return this.prisma.registrationSurveyAnswer.createMany({ data: answers.map((a) => ({ registrationId, ...a })) });
  }
}
