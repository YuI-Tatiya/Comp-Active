import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ActivityFilterDto } from './dto/activity-filter.dto';
import { ActivityStatus, ApprovalStatus } from '../../../common/enums/status.enum';
import { SoftSkillType } from '../../../common/enums/soft-skill.enum';

export const activityInclude = {
  tags: true,
  conditions: true,
  benefits: true,
  softSkills: true,
  questions: { include: { options: true } },
  surveyQuestions: { orderBy: { sortOrder: 'asc' } },
  organizer: { select: { id: true, name: true, email: true } },
  event: {
    select: {
      visibility: true,
      visibilityStudentIdFilter: true,
      visibilityProgram: { select: { programCode: true } },
      visibilityYears: { select: { year: true } },
    },
  },
} as const;

interface SurveyQuestionData {
  label: string;
  type: string;
  scaleMax: number;
}

interface RelationUpdate {
  tags?: string[];
  conditions?: string[];
  benefits?: string[];
  softSkills?: SoftSkillType[];
  surveyQuestions?: SurveyQuestionData[];
}

@Injectable()
export class ActivitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(organizerId: number, data: Record<string, any>) {
    return this.prisma.activity.create({
      data: { ...data, organizerId, approvalStatus: ApprovalStatus.APPROVED as any } as any,
      include: { ...activityInclude, registrations: true },
    });
  }

  async findAllApproved(filterDto?: ActivityFilterDto) {
    return this.prisma.activity.findMany({
      where: {
        approvalStatus: ApprovalStatus.APPROVED as any,
        ...(filterDto?.search && { name: { contains: filterDto.search, mode: 'insensitive' } }),
        ...(filterDto?.category && { category: filterDto.category }),
        ...(filterDto?.status && { status: filterDto.status as any }),
      },
      include: { ...activityInclude, _count: { select: { registrations: true } } },
      orderBy: { date: 'asc' },
    });
  }

  /** ใช้กับผู้ชมทั่วไป (public/student) — ไม่ส่งรายชื่อ/ข้อมูลติดต่อผู้ลงทะเบียนออกไป มีแค่จำนวนรวม */
  findById(id: number) {
    return this.prisma.activity.findUnique({
      where: { id },
      include: { ...activityInclude, _count: { select: { registrations: true } } },
    });
  }

  /** ใช้กับ organizer เจ้าของกิจกรรม/admin เท่านั้น — ส่งรายชื่อผู้ลงทะเบียนพร้อมคำตอบตอนลงทะเบียนมาด้วย */
  findByIdForOrganizer(id: number) {
    return this.prisma.activity.findUnique({
      where: { id },
      include: {
        ...activityInclude,
        registrations: {
          include: {
            student: true,
            evaluation: true,
            answers: {
              include: {
                question: { select: { id: true, label: true } },
                options: { include: { option: { select: { id: true, label: true } } } },
              },
            },
          },
        },
      },
    });
  }

  findByOrganizer(organizerId: number) {
    return this.prisma.activity.findMany({
      where: { organizerId },
      include: {
        tags: true,
        conditions: true,
        benefits: true,
        softSkills: true,
        // แดชบอร์ดผู้จัดต้องนับ "รอยืนยันผู้สมัคร" และ "รอประเมินทักษะ" ซึ่งดูจาก registration รายตัว
        // ไม่ใช่แค่ยอดรวม — เดิม include มีแค่ _count ทำให้ตัวเลขสองช่องนั้นขึ้น 0 เสมอ
        // select เฉพาะฟิลด์ที่ใช้จริง ไม่ดึงทั้งแถวเพราะผู้จัดรายเดียวอาจมีผู้ลงทะเบียนหลักพัน
        registrations: {
          select: {
            id: true,
            status: true,
            attendance: true,
            evaluation: { select: { id: true } },
          },
        },
        _count: { select: { registrations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  updateWithRelations(activityId: number, activityData: Record<string, any>, relations: RelationUpdate) {
    return this.prisma.$transaction(async (tx) => {
      await tx.activity.update({ where: { id: activityId }, data: activityData });

      if (relations.tags !== undefined) {
        await tx.activityTag.deleteMany({ where: { activityId } });
        if (relations.tags.length) {
          await tx.activityTag.createMany({ data: relations.tags.map((tagName) => ({ activityId, tagName })) });
        }
      }

      if (relations.conditions !== undefined) {
        await tx.activityCondition.deleteMany({ where: { activityId } });
        if (relations.conditions.length) {
          await tx.activityCondition.createMany({
            data: relations.conditions.map((conditionText) => ({ activityId, conditionText })),
          });
        }
      }

      if (relations.benefits !== undefined) {
        await tx.activityBenefit.deleteMany({ where: { activityId } });
        if (relations.benefits.length) {
          await tx.activityBenefit.createMany({
            data: relations.benefits.map((benefitText) => ({ activityId, benefitText })),
          });
        }
      }

      if (relations.softSkills !== undefined) {
        await tx.activitySoftSkill.deleteMany({ where: { activityId } });
        if (relations.softSkills.length) {
          await tx.activitySoftSkill.createMany({
            data: relations.softSkills.map((skillType) => ({ activityId, skillType })),
          });
        }
      }

      // แบบสำรวจ — จับคู่ตามลำดับข้อแล้วอัปเดตทับแถวเดิม (ตรรกะเดียวกับ EventsRepository.update)
      // ห้ามลบทั้งชุดแล้วสร้างใหม่ เพราะ RegistrationSurveyAnswer.questionId เป็น onDelete: Cascade
      // คำตอบที่นักศึกษาตอบไว้จะหายทั้งหมดเพียงเพราะผู้จัดกดบันทึกหน้าแก้ไข
      if (relations.surveyQuestions !== undefined) {
        const existing = await tx.eventSurveyQuestion.findMany({
          where: { activityId },
          orderBy: { sortOrder: 'asc' },
        });

        for (const [sortOrder, q] of relations.surveyQuestions.entries()) {
          const row = existing[sortOrder];
          if (!row) {
            await tx.eventSurveyQuestion.create({
              data: { activityId, label: q.label, type: q.type as any, scaleMax: q.scaleMax, sortOrder },
            });
            continue;
          }

          // เปลี่ยนชนิดคำถาม = คำตอบเดิมใช้ไม่ได้แล้ว ลบเฉพาะข้อนั้น
          if (row.type !== (q.type as any)) {
            await tx.registrationSurveyAnswer.deleteMany({ where: { questionId: row.id } });
          }

          await tx.eventSurveyQuestion.update({
            where: { id: row.id },
            data: { label: q.label, type: q.type as any, scaleMax: q.scaleMax, sortOrder },
          });
        }

        const surplus = existing.slice(relations.surveyQuestions.length);
        if (surplus.length) {
          await tx.eventSurveyQuestion.deleteMany({ where: { id: { in: surplus.map((r) => r.id) } } });
        }
      }

      return tx.activity.findUnique({
        where: { id: activityId },
        include: { ...activityInclude, registrations: true },
      });
    });
  }

  delete(activityId: number) {
    return this.prisma.activity.delete({ where: { id: activityId } });
  }

  findByIdWithSurveyAnswers(id: number) {
    return this.prisma.activity.findUnique({
      where: { id },
      include: {
        surveyQuestions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            answers: {
              include: {
                registration: {
                  include: {
                    student: { select: { id: true, name: true, studentId: true } },
                    activity: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  countAll() {
    return this.prisma.activity.count();
  }

  /** ปิดกิจกรรมแบบ "จบแล้ว" — ต่างจาก cancelByOrganizer ตรงที่ไม่ใช่การยกเลิก */
  markCompleted(activityId: number) {
    return this.prisma.activity.update({
      where: { id: activityId },
      data: { status: ActivityStatus.COMPLETED as any },
      include: { ...activityInclude, registrations: true },
    });
  }

  /** ผู้จัดยกเลิกกิจกรรมของตัวเอง — ใช้ CANCELLED ไม่ใช่ REJECTED (นั่นคือแอดมิน/ระบบปฏิเสธ) */
  cancelByOrganizer(activityId: number, reason: string) {
    return this.prisma.activity.update({
      where: { id: activityId },
      data: {
        approvalStatus: ApprovalStatus.CANCELLED as any,
        status: ActivityStatus.CLOSED as any,
        cancellationReason: reason,
      },
      include: { ...activityInclude, registrations: true },
    });
  }

  findManyByOrganizerWithCount(organizerId: number) {
    return this.prisma.activity.findMany({
      where: { organizerId },
      include: { _count: { select: { registrations: true } } },
    });
  }

  countApproved() {
    return this.prisma.activity.count({ where: { approvalStatus: ApprovalStatus.APPROVED as any } });
  }

  countDistinctRegisteredStudents() {
    return this.prisma.registration.findMany({ distinct: ['studentId'], select: { studentId: true } });
  }

  // Minimal-safe projection for the public developer newsfeed — must never leak
  // organizer email/id or internal approval/cancellation fields to external callers.
  private static readonly NEWSFEED_SELECT = {
    id: true,
    name: true,
    category: true,
    date: true,
    startTime: true,
    endTime: true,
    location: true,
    imageUrl: true,
    organizer: { select: { name: true } },
  } as const;

  // ไม่มี student identity ในเส้นทางนี้ (auth ด้วย API key) — งาน restricted จึงต้องไม่โผล่เด็ดขาด
  private static readonly EXCLUDE_RESTRICTED = { NOT: { event: { visibility: 'restricted' as any } } };

  findAllForNewsfeed() {
    return this.prisma.activity.findMany({
      where: { approvalStatus: ApprovalStatus.APPROVED as any, ...ActivitiesRepository.EXCLUDE_RESTRICTED },
      select: ActivitiesRepository.NEWSFEED_SELECT,
      orderBy: { date: 'asc' },
    });
  }

  findByIdForNewsfeed(id: number) {
    return this.prisma.activity.findFirst({
      where: { id, approvalStatus: ApprovalStatus.APPROVED as any, ...ActivitiesRepository.EXCLUDE_RESTRICTED },
      select: ActivitiesRepository.NEWSFEED_SELECT,
    });
  }
}
