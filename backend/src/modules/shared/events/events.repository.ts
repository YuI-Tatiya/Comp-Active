import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApprovalStatus } from '../../../common/enums/status.enum';
import { activityInclude } from '../activities/activities.repository';

export interface PreparedQuestionData {
  label: string;
  type: string;
  required: boolean;
  options: string[];
}

export interface PreparedActivityData {
  name: string;
  description: string;
  category: string;
  imageUrl?: string | null;
  attachmentUrl?: string | null;
  startAt: Date;
  endAt: Date;
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  capacity?: number | null;
  volunteerHours?: number | null;
  volunteerRole?: string | null;
  softSkillRates: { skillType: string; rate: number }[];
  questions: PreparedQuestionData[];
}

export interface PreparedSurveyQuestionData {
  label: string;
  type: string;
  scaleMax: number;
}

export interface PreparedEventData {
  name: string;
  description: string;
  imageUrl?: string;
  isPublic: boolean;
  registrationCloseAt?: Date;
  activities: PreparedActivityData[];
  surveyQuestions: PreparedSurveyQuestionData[];
  visibility: string;
  visibilityPrograms: string[];
  visibilityYears: number[];
  visibilityStudentIdFilter?: string;
}

export interface PreparedActivityUpdateData extends PreparedActivityData {
  /** ไม่มี = สร้างกิจกรรมย่อยใหม่ */
  id?: number;
}

export interface PreparedEventUpdateData {
  name: string;
  description: string;
  imageUrl?: string;
  isPublic: boolean;
  registrationCloseAt?: Date;
  activities: PreparedActivityUpdateData[];
  surveyQuestions: PreparedSurveyQuestionData[];
  visibility: string;
  visibilityPrograms: string[];
  visibilityYears: number[];
  visibilityStudentIdFilter?: string;
}

/** ใช้กับเส้นทางสาธารณะ/ยังไม่ยืนยันตัวตน — ห้ามมี registrations แบบละเอียด (ไม่มี student/evaluation) */
export const eventInclude = {
  activities: {
    include: { ...activityInclude, registrations: true, _count: { select: { registrations: true } } },
  },
  surveyQuestions: true,
  visibilityProgram: true,
  visibilityYears: true,
} as const;

/** ใช้เฉพาะเส้นทางที่ organizer เจ้าของงาน (หรือ admin) authenticated แล้วเท่านั้น — มีข้อมูลผู้ลงทะเบียนแบบเต็ม */
export const eventOrganizerInclude = {
  activities: {
    include: {
      ...activityInclude,
      registrations: {
        include: {
          student: { select: { id: true, name: true, studentId: true, email: true } },
          evaluation: true,
        },
      },
      _count: { select: { registrations: true } },
    },
  },
  surveyQuestions: true,
  visibilityProgram: true,
  visibilityYears: true,
} as const;

@Injectable()
export class EventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(organizerId: number, data: PreparedEventData) {
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          organizerId,
          name: data.name,
          description: data.description,
          imageUrl: data.imageUrl,
          isPublic: data.isPublic,
          registrationCloseAt: data.registrationCloseAt,
          surveyQuestions: {
            create: data.surveyQuestions.map((q, sortOrder) => ({
              label: q.label,
              type: q.type as any,
              scaleMax: q.scaleMax,
              sortOrder,
            })),
          },
          visibility: data.visibility as any,
          visibilityStudentIdFilter: data.visibilityStudentIdFilter,
          visibilityProgram: {
            create: data.visibilityPrograms.map((programCode) => ({ programCode })),
          },
          visibilityYears: {
            create: data.visibilityYears.map((year) => ({ year })),
          },
        } as any,
      });

      for (const activity of data.activities) {
        const { softSkillRates, questions, ...activityData } = activity;
        await tx.activity.create({
          data: {
            ...activityData,
            organizerId,
            eventId: event.id,
            approvalStatus: ApprovalStatus.APPROVED as any,
            softSkills: {
              create: softSkillRates.map(({ skillType, rate }) => ({ skillType: skillType as any, rate })),
            },
            questions: {
              create: questions.map((q, sortOrder) => ({
                label: q.label,
                type: q.type as any,
                required: q.required,
                sortOrder,
                options: q.options.length
                  ? { create: q.options.map((label, optSortOrder) => ({ label, sortOrder: optSortOrder })) }
                  : undefined,
              })),
            },
          } as any,
        });
      }

      return tx.event.findUnique({ where: { id: event.id }, include: eventOrganizerInclude }) as any;
    });
  }

  update(eventId: number, data: PreparedEventUpdateData, removedActivityIds: number[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: eventId },
        data: {
          name: data.name,
          description: data.description,
          imageUrl: data.imageUrl,
          isPublic: data.isPublic,
          registrationCloseAt: data.registrationCloseAt,
          visibility: data.visibility as any,
          visibilityStudentIdFilter: data.visibilityStudentIdFilter,
        },
      });

      // แบบสำรวจ — แทนที่ทั้งชุดเสมอ (ง่ายและถูกต้องกว่า diff รายข้อ)
      await tx.eventSurveyQuestion.deleteMany({ where: { eventId } });
      if (data.surveyQuestions.length) {
        await tx.eventSurveyQuestion.createMany({
          data: data.surveyQuestions.map((q, sortOrder) => ({
            eventId,
            label: q.label,
            type: q.type as any,
            scaleMax: q.scaleMax,
            sortOrder,
          })),
        });
      }

      // เงื่อนไขการมองเห็น — แทนที่ทั้งชุดเสมอเช่นกัน
      await tx.eventVisibilityProgram.deleteMany({ where: { eventId } });
      if (data.visibilityPrograms.length) {
        await tx.eventVisibilityProgram.createMany({
          data: data.visibilityPrograms.map((programCode) => ({ eventId, programCode })),
        });
      }
      await tx.eventVisibilityYear.deleteMany({ where: { eventId } });
      if (data.visibilityYears.length) {
        await tx.eventVisibilityYear.createMany({
          data: data.visibilityYears.map((year) => ({ eventId, year })),
        });
      }

      // กิจกรรมย่อยที่ถูกเอาออก — cascade ลบ tags/conditions/benefits/softSkills/questions ให้เองผ่าน schema
      if (removedActivityIds.length) {
        await tx.activity.deleteMany({ where: { id: { in: removedActivityIds } } });
      }

      for (const activity of data.activities) {
        const { softSkillRates, questions, id, ...activityData } = activity;

        if (id) {
          await tx.activity.update({ where: { id }, data: activityData as any });

          await tx.activitySoftSkill.deleteMany({ where: { activityId: id } });
          if (softSkillRates.length) {
            await tx.activitySoftSkill.createMany({
              data: softSkillRates.map(({ skillType, rate }) => ({ activityId: id, skillType: skillType as any, rate })),
            });
          }

          await tx.activityQuestion.deleteMany({ where: { activityId: id } });
          for (const [sortOrder, q] of questions.entries()) {
            await tx.activityQuestion.create({
              data: {
                activityId: id,
                label: q.label,
                type: q.type as any,
                required: q.required,
                sortOrder,
                options: q.options.length
                  ? { create: q.options.map((label, optSortOrder) => ({ label, sortOrder: optSortOrder })) }
                  : undefined,
              },
            });
          }
        } else {
          await tx.activity.create({
            data: {
              ...activityData,
              organizerId: (await tx.event.findUniqueOrThrow({ where: { id: eventId }, select: { organizerId: true } })).organizerId,
              eventId,
              approvalStatus: 'approved' as any,
              softSkills: {
                create: softSkillRates.map(({ skillType, rate }) => ({ skillType: skillType as any, rate })),
              },
              questions: {
                create: questions.map((q, sortOrder) => ({
                  label: q.label,
                  type: q.type as any,
                  required: q.required,
                  sortOrder,
                  options: q.options.length
                    ? { create: q.options.map((label, optSortOrder) => ({ label, sortOrder: optSortOrder })) }
                    : undefined,
                })),
              },
            } as any,
          });
        }
      }

      return tx.event.findUnique({ where: { id: eventId }, include: eventOrganizerInclude }) as any;
    });
  }

  /** ใช้เฉพาะเส้นทาง organizer/admin ที่ authenticated แล้วเท่านั้น — มี registrations แบบเต็ม (student/evaluation) */
  findById(id: number) {
    return this.prisma.event.findUnique({ where: { id }, include: eventOrganizerInclude });
  }

  /** ใช้กับเส้นทางสาธารณะ/ยังไม่ยืนยันตัวตน — ไม่มี student/evaluation บน registrations */
  findByIdPublicSafe(id: number) {
    return this.prisma.event.findUnique({ where: { id }, include: eventInclude });
  }

  findByOrganizer(organizerId: number) {
    return this.prisma.event.findMany({
      where: { organizerId },
      include: eventOrganizerInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  updatePublic(eventId: number, isPublic: boolean) {
    return this.prisma.event.update({ where: { id: eventId }, data: { isPublic } });
  }

  /**
   * ลบงานทั้งงานพร้อมกิจกรรมย่อยทั้งหมด — ต้องลบ Activity ก่อนเพราะความสัมพันธ์
   * Activity.event เป็น onDelete: SetNull (ลบ Event เฉยๆ จะทำให้กิจกรรมย่อยกลายเป็น
   * กิจกรรมเดี่ยวลอยๆ แทนที่จะถูกลบไปด้วย) — ผู้เรียกต้องเช็คว่าไม่มีผู้ลงทะเบียนก่อนแล้ว
   */
  deleteWithActivities(eventId: number) {
    return this.prisma.$transaction([
      this.prisma.activity.deleteMany({ where: { eventId } }),
      this.prisma.event.delete({ where: { id: eventId } }),
    ]);
  }

  /** งานที่มีอย่างน้อย 1 กิจกรรมย่อยที่ approved แล้ว — ใช้สำหรับรายการสาธารณะ */
  findAllApproved() {
    return this.prisma.event.findMany({
      where: { activities: { some: { approvalStatus: ApprovalStatus.APPROVED as any } } },
      include: eventInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  findByIdWithSurveyAnswers(id: number) {
    return this.prisma.event.findUnique({
      where: { id },
      include: { surveyQuestions: { include: { answers: true }, orderBy: { sortOrder: 'asc' } } },
    });
  }
}
