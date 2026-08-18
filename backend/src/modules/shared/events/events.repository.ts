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
  imageUrl?: string;
  attachmentUrl?: string;
  startAt: Date;
  endAt: Date;
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  capacity?: number;
  volunteerHours?: number;
  volunteerRole?: string;
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

export const eventInclude = {
  activities: { include: activityInclude },
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

      return tx.event.findUnique({ where: { id: event.id }, include: eventInclude }) as any;
    });
  }

  findById(id: number) {
    return this.prisma.event.findUnique({ where: { id }, include: eventInclude });
  }

  findByOrganizer(organizerId: number) {
    return this.prisma.event.findMany({
      where: { organizerId },
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
