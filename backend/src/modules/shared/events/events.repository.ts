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
  categories: string[];
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
  registrationType: string;
  dutyRoleOptions: string[];
  dutyShiftOptions: string[];
  teamSizeMin: number | null;
  teamSizeMax: number | null;
  competitionCategoryOptions: string[];
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
  /** ไม่ส่งมา = ไม่แตะแบบสำรวจเดิม (ป้องกันการเผลอลบคำถาม+คำตอบทิ้งทั้งชุด) */
  surveyQuestions?: PreparedSurveyQuestionData[];
  visibility: string;
  visibilityPrograms: string[];
  visibilityYears: number[];
  visibilityStudentIdFilter?: string;
}

/** ใช้กับเส้นทางสาธารณะ/ยังไม่ยืนยันตัวตน — ห้ามมี registrations แบบละเอียด (ไม่มี student/evaluation) */
export const eventInclude = {
  activities: { include: { ...activityInclude, registrations: true, _count: { select: { registrations: true } } } },
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
          student: { select: { id: true, name: true, studentId: true, email: true, phone: true } },
          evaluation: true,
          certificate: true,
          // คำตอบคำถามลงทะเบียน — organizer เห็นได้เต็ม เพื่อกรอง/ export ตามคำตอบ
          answers: {
            include: {
              question: { select: { id: true, label: true } },
              options: { include: { option: { select: { id: true, label: true } } } },
            },
          },
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
          visibilityProgram: { create: data.visibilityPrograms.map((programCode) => ({ programCode })) },
          visibilityYears: { create: data.visibilityYears.map((year) => ({ year })) },
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

  /**
   * คัดลอกงานทั้งงานพร้อมกิจกรรมย่อยทุกตัวเป็นแถวใหม่ทั้งหมด — ไม่คัดลอกผู้ลงทะเบียน
   * เผยแพร่สถานะรีเซ็ตเป็น "ไม่เผยแพร่" เสมอ ให้ผู้จัดตรวจก่อนเปิดจริง (ดู EventsService.duplicate)
   * คืน null ถ้าไม่พบต้นฉบับ (ผู้เรียกตรวจสิทธิ์ความเป็นเจ้าของเองอีกชั้นก่อนเรียกเมธอดนี้)
   */
  duplicateEvent(eventId: number, organizerId: number) {
    return this.prisma.$transaction(async (tx) => {
      const source = await tx.event.findUnique({
        where: { id: eventId },
        include: {
          activities: { include: activityInclude },
          surveyQuestions: { orderBy: { sortOrder: 'asc' } },
          visibilityProgram: true,
          visibilityYears: true,
        },
      });
      if (!source) return null;

      const event = await tx.event.create({
        data: {
          organizerId,
          name: `${source.name} (สำเนา)`,
          description: source.description,
          imageUrl: source.imageUrl,
          isPublic: false, // สำเนาใหม่ไม่เผยแพร่อัตโนมัติเสมอ แม้ต้นฉบับจะเผยแพร่อยู่
          registrationCloseAt: source.registrationCloseAt,
          visibility: source.visibility,
          visibilityStudentIdFilter: source.visibilityStudentIdFilter,
          visibilityProgram: { create: source.visibilityProgram.map((p) => ({ programCode: p.programCode })) },
          visibilityYears: { create: source.visibilityYears.map((y) => ({ year: y.year })) },
          surveyQuestions: {
            create: source.surveyQuestions.map((q) => ({
              label: q.label,
              type: q.type,
              scaleMax: q.scaleMax,
              sortOrder: q.sortOrder,
            })),
          },
        } as any,
      });

      for (const a of source.activities) {
        await tx.activity.create({
          data: {
            organizerId,
            eventId: event.id,
            name: a.name,
            description: a.description,
            categories: a.categories,
            date: a.date,
            startTime: a.startTime,
            endTime: a.endTime,
            startAt: a.startAt,
            endAt: a.endAt,
            location: a.location,
            capacity: a.capacity,
            status: 'open' as any,
            approvalStatus: ApprovalStatus.APPROVED as any,
            imageUrl: a.imageUrl,
            attachmentUrl: a.attachmentUrl,
            volunteerHours: a.volunteerHours,
            volunteerRole: a.volunteerRole,
            registrationType: a.registrationType,
            dutyRoleOptions: a.dutyRoleOptions,
            dutyShiftOptions: a.dutyShiftOptions,
            teamSizeMin: a.teamSizeMin,
            teamSizeMax: a.teamSizeMax,
            competitionCategoryOptions: a.competitionCategoryOptions,
            peerAssessmentEnabled: false,
            tags: { create: a.tags.map((t) => ({ tagName: t.tagName })) },
            conditions: { create: a.conditions.map((c) => ({ conditionText: c.conditionText })) },
            benefits: { create: a.benefits.map((b) => ({ benefitText: b.benefitText })) },
            softSkills: { create: a.softSkills.map((s) => ({ skillType: s.skillType, rate: s.rate })) },
            questions: {
              create: a.questions.map((q) => ({
                label: q.label,
                type: q.type,
                required: q.required,
                sortOrder: q.sortOrder,
                options: { create: q.options.map((o) => ({ label: o.label, sortOrder: o.sortOrder })) },
              })),
            },
            // ไม่คัดลอก a.surveyQuestions — กิจกรรมย่อยของงานใช้แบบสำรวจระดับ Event เท่านั้น (เหมือน create()/update())
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

      // แบบสำรวจ — จับคู่ตามลำดับข้อแล้วอัปเดตทับแถวเดิม ห้ามลบทั้งชุดแล้วสร้างใหม่
      //
      // เดิมทำแบบ deleteMany + createMany ซึ่งเป็นบั๊กทำข้อมูลหาย: RegistrationSurveyAnswer.questionId
      // เป็น onDelete: Cascade ดังนั้นแค่ผู้จัดเปิด wizard แล้วกดบันทึกโดยไม่แตะแบบสำรวจเลย
      // คำตอบที่นักศึกษาตอบไว้ทั้งหมดก็หายเกลี้ยง (คำถามได้ id ใหม่ ไม่มีคำตอบผูกอยู่)
      if (data.surveyQuestions !== undefined) {
        const existing = await tx.eventSurveyQuestion.findMany({
          where: { eventId },
          orderBy: { sortOrder: 'asc' },
        });

        for (const [sortOrder, q] of data.surveyQuestions.entries()) {
          const row = existing[sortOrder];
          if (!row) {
            await tx.eventSurveyQuestion.create({
              data: { eventId, label: q.label, type: q.type as any, scaleMax: q.scaleMax, sortOrder },
            });
            continue;
          }

          // เปลี่ยนชนิดคำถาม = คำตอบเดิมใช้ไม่ได้แล้ว (คะแนนกับข้อความคนละอย่างกัน) ลบเฉพาะข้อนั้น
          if (row.type !== (q.type as any)) {
            await tx.registrationSurveyAnswer.deleteMany({ where: { questionId: row.id } });
          }

          await tx.eventSurveyQuestion.update({
            where: { id: row.id },
            data: { label: q.label, type: q.type as any, scaleMax: q.scaleMax, sortOrder },
          });
        }

        // เหลือเฉพาะข้อที่ผู้จัดลบออกจริงๆ (จำนวนข้อใหม่น้อยกว่าเดิม) — คำตอบของข้อนั้นหายตาม ซึ่งถูกต้อง
        const surplus = existing.slice(data.surveyQuestions.length);
        if (surplus.length) {
          await tx.eventSurveyQuestion.deleteMany({ where: { id: { in: surplus.map((r) => r.id) } } });
        }
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
        await tx.eventVisibilityYear.createMany({ data: data.visibilityYears.map((year) => ({ eventId, year })) });
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
              data: softSkillRates.map(({ skillType, rate }) => ({
                activityId: id,
                skillType: skillType as any,
                rate,
              })),
            });
          }

          // คำถามตอนลงทะเบียน — จับคู่ตามลำดับแล้วอัปเดตทับ ด้วยเหตุผลเดียวกับแบบสำรวจด้านบน
          // (RegistrationAnswer.questionId และ RegistrationAnswerOption.optionId เป็น onDelete: Cascade
          // ถ้าลบทั้งชุดแล้วสร้างใหม่ คำตอบที่นักศึกษากรอกตอนสมัคร เช่น ข้อจำกัดด้านอาหาร/ไซส์เสื้อ
          // จะหายทั้งหมดเพียงเพราะผู้จัดกดบันทึกหน้าแก้ไขงาน)
          const existingQuestions = await tx.activityQuestion.findMany({
            where: { activityId: id },
            orderBy: { sortOrder: 'asc' },
            include: { options: { orderBy: { sortOrder: 'asc' } } },
          });

          for (const [sortOrder, q] of questions.entries()) {
            const row = existingQuestions[sortOrder];

            if (!row) {
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
              continue;
            }

            // เปลี่ยนชนิดคำถาม = คำตอบเดิมใช้ไม่ได้แล้ว ลบเฉพาะข้อนั้น
            if (row.type !== (q.type as any)) {
              await tx.registrationAnswer.deleteMany({ where: { questionId: row.id } });
            }

            await tx.activityQuestion.update({
              where: { id: row.id },
              data: { label: q.label, type: q.type as any, required: q.required, sortOrder },
            });

            // ตัวเลือกของคำถาม — จับคู่ตามลำดับเช่นกัน เพื่อไม่ให้ RegistrationAnswerOption หายไปด้วย
            for (const [optSortOrder, label] of q.options.entries()) {
              const optRow = row.options[optSortOrder];
              if (optRow) {
                await tx.activityQuestionOption.update({
                  where: { id: optRow.id },
                  data: { label, sortOrder: optSortOrder },
                });
              } else {
                await tx.activityQuestionOption.create({
                  data: { questionId: row.id, label, sortOrder: optSortOrder },
                });
              }
            }
            const surplusOptions = row.options.slice(q.options.length);
            if (surplusOptions.length) {
              await tx.activityQuestionOption.deleteMany({
                where: { id: { in: surplusOptions.map((o) => o.id) } },
              });
            }
          }

          const surplusQuestions = existingQuestions.slice(questions.length);
          if (surplusQuestions.length) {
            await tx.activityQuestion.deleteMany({
              where: { id: { in: surplusQuestions.map((r) => r.id) } },
            });
          }
        } else {
          await tx.activity.create({
            data: {
              ...activityData,
              organizerId: (await tx.event.findUniqueOrThrow({ where: { id: eventId }, select: { organizerId: true } }))
                .organizerId,
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
      include: {
        surveyQuestions: {
          include: {
            // ต้องดึง registration + student + activity มาด้วย ไม่ใช่แค่ answer ดิบ —
            // organizer ต้องดูได้ว่า "นักศึกษาคนไหนตอบว่าอะไร" ไม่ใช่แค่ค่าเฉลี่ยรวม
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
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }
}
