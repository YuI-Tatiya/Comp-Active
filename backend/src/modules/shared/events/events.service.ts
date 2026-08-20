import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { EventsRepository, PreparedActivityData } from './events.repository';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { diffHours, formatHHmm } from '../../../common/utils/time.util';
import { ActivityQuestionType, SurveyQuestionType, EventVisibility, ApprovalStatus } from '../../../common/enums/status.enum';
import { UserRole } from '../../../common/enums/role.enum';
import { isViewerEligibleForEvent, Viewer } from './event-visibility.util';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly eventsRepository: EventsRepository) {}

  async create(organizerId: number, dto: CreateEventDto) {
    const activities: PreparedActivityData[] = dto.activities.map((a, index) => {
      const startAt = new Date(a.startAt);
      const endAt = new Date(a.endAt);

      if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
        throw new BadRequestException(`กิจกรรมลำดับที่ ${index + 1}: รูปแบบวันที่ไม่ถูกต้อง`);
      }
      if (endAt <= startAt) {
        throw new BadRequestException(`กิจกรรมลำดับที่ ${index + 1}: เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม`);
      }
      if (a.issueVolunteerCertificate && !a.volunteerRole?.trim()) {
        throw new BadRequestException(`กิจกรรมลำดับที่ ${index + 1}: กรุณาระบุชื่อการทำงานเพื่อออกใบจิตอาสา`);
      }

      const questions = (a.questions ?? []).map((q, qIndex) => {
        const needsOptions =
          q.type === ActivityQuestionType.SINGLE_CHOICE || q.type === ActivityQuestionType.MULTI_CHOICE;
        const options = (q.options ?? []).map((o) => o.trim()).filter(Boolean);

        if (needsOptions && options.length < 2) {
          throw new BadRequestException(
            `กิจกรรมลำดับที่ ${index + 1} คำถามข้อที่ ${qIndex + 1}: ต้องมีตัวเลือกอย่างน้อย 2 ข้อ`,
          );
        }

        return {
          label: q.label,
          type: q.type,
          required: q.required ?? false,
          options: needsOptions ? options : [],
        };
      });

      return {
        name: a.name,
        description: a.description,
        category: a.category,
        imageUrl: a.imageUrl,
        attachmentUrl: a.attachmentUrl,
        startAt,
        endAt,
        // date/startTime/endTime derived จาก startAt/endAt เพื่อ backward-compat กับทุกหน้าที่ query ด้วยฟิลด์เดิม
        date: startAt,
        startTime: formatHHmm(startAt),
        endTime: formatHHmm(endAt),
        location: a.location,
        capacity: a.capacity,
        // คำนวณชั่วโมงฝั่งเซิร์ฟเวอร์เท่านั้น — ไม่เชื่อค่าจาก client
        volunteerHours: a.issueVolunteerCertificate ? diffHours(startAt, endAt) : undefined,
        volunteerRole: a.issueVolunteerCertificate ? a.volunteerRole : undefined,
        softSkillRates: (a.softSkillRates ?? []).map((s) => ({ skillType: s.skillType, rate: s.rate })),
        questions,
      };
    });

    const surveyQuestions = (dto.surveyQuestions ?? []).map((q, index) => {
      if (q.type === SurveyQuestionType.RATING && q.scaleMax !== undefined && q.scaleMax < 2) {
        throw new BadRequestException(`คำถามแบบสำรวจข้อที่ ${index + 1}: คะแนนเต็มต้องมีอย่างน้อย 2`);
      }
      return {
        label: q.label,
        type: q.type,
        scaleMax: q.scaleMax ?? 5,
      };
    });

    const visibility = dto.visibility ?? EventVisibility.EVERYONE;

    const event = await this.eventsRepository.create(organizerId, {
      name: dto.name,
      description: dto.description,
      imageUrl: dto.imageUrl,
      isPublic: dto.isPublic ?? true,
      registrationCloseAt: dto.registrationCloseAt ? new Date(dto.registrationCloseAt) : undefined,
      activities,
      surveyQuestions,
      visibility,
      visibilityPrograms: visibility === EventVisibility.RESTRICTED ? (dto.visibilityPrograms ?? []) : [],
      visibilityYears: visibility === EventVisibility.RESTRICTED ? (dto.visibilityYears ?? []) : [],
      visibilityStudentIdFilter:
        visibility === EventVisibility.RESTRICTED ? dto.visibilityStudentIdFilter : undefined,
    });

    this.logger.log(`Event created: "${event.name}" (ID: ${event.id}) with ${activities.length} activities`);
    return event;
  }

  async update(organizerId: number, callerRole: UserRole, eventId: number, dto: UpdateEventDto) {
    const event = await this.eventsRepository.findById(eventId);
    if (!event) throw new NotFoundException('ไม่พบงาน');
    if (callerRole !== UserRole.ADMIN && event.organizerId !== organizerId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขงานนี้');
    }

    const submittedIds = new Set(dto.activities.map((a) => a.id).filter((id): id is number => !!id));
    const removedActivities = event.activities.filter((a: any) => !submittedIds.has(a.id));
    for (const removed of removedActivities) {
      if ((removed.registrations?.length ?? 0) > 0) {
        throw new BadRequestException(
          `ไม่สามารถลบกิจกรรม "${removed.name}" ได้ เนื่องจากมีผู้ลงทะเบียนแล้ว`,
        );
      }
    }

    const activities = dto.activities.map((a, index) => {
      const startAt = new Date(a.startAt);
      const endAt = new Date(a.endAt);

      if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
        throw new BadRequestException(`กิจกรรมลำดับที่ ${index + 1}: รูปแบบวันที่ไม่ถูกต้อง`);
      }
      if (endAt <= startAt) {
        throw new BadRequestException(`กิจกรรมลำดับที่ ${index + 1}: เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม`);
      }
      if (a.issueVolunteerCertificate && !a.volunteerRole?.trim()) {
        throw new BadRequestException(`กิจกรรมลำดับที่ ${index + 1}: กรุณาระบุชื่อการทำงานเพื่อออกใบจิตอาสา`);
      }

      const questions = (a.questions ?? []).map((q, qIndex) => {
        const needsOptions =
          q.type === ActivityQuestionType.SINGLE_CHOICE || q.type === ActivityQuestionType.MULTI_CHOICE;
        const options = (q.options ?? []).map((o) => o.trim()).filter(Boolean);

        if (needsOptions && options.length < 2) {
          throw new BadRequestException(
            `กิจกรรมลำดับที่ ${index + 1} คำถามข้อที่ ${qIndex + 1}: ต้องมีตัวเลือกอย่างน้อย 2 ข้อ`,
          );
        }

        return { label: q.label, type: q.type, required: q.required ?? false, options: needsOptions ? options : [] };
      });

      return {
        id: a.id,
        name: a.name,
        description: a.description,
        category: a.category,
        imageUrl: a.imageUrl,
        attachmentUrl: a.attachmentUrl,
        startAt,
        endAt,
        date: startAt,
        startTime: formatHHmm(startAt),
        endTime: formatHHmm(endAt),
        location: a.location,
        capacity: a.capacity,
        volunteerHours: a.issueVolunteerCertificate ? diffHours(startAt, endAt) : undefined,
        volunteerRole: a.issueVolunteerCertificate ? a.volunteerRole : undefined,
        softSkillRates: (a.softSkillRates ?? []).map((s) => ({ skillType: s.skillType, rate: s.rate })),
        questions,
      };
    });

    const surveyQuestions = (dto.surveyQuestions ?? []).map((q, index) => {
      if (q.type === SurveyQuestionType.RATING && q.scaleMax !== undefined && q.scaleMax < 2) {
        throw new BadRequestException(`คำถามแบบสำรวจข้อที่ ${index + 1}: คะแนนเต็มต้องมีอย่างน้อย 2`);
      }
      return { label: q.label, type: q.type, scaleMax: q.scaleMax ?? 5 };
    });

    const visibility = dto.visibility ?? EventVisibility.EVERYONE;

    const updated = await this.eventsRepository.update(
      eventId,
      {
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        isPublic: dto.isPublic ?? true,
        registrationCloseAt: dto.registrationCloseAt ? new Date(dto.registrationCloseAt) : undefined,
        activities,
        surveyQuestions,
        visibility,
        visibilityPrograms: visibility === EventVisibility.RESTRICTED ? (dto.visibilityPrograms ?? []) : [],
        visibilityYears: visibility === EventVisibility.RESTRICTED ? (dto.visibilityYears ?? []) : [],
        visibilityStudentIdFilter:
          visibility === EventVisibility.RESTRICTED ? dto.visibilityStudentIdFilter : undefined,
      },
      removedActivities.map((a: any) => a.id),
    );

    this.logger.log(`Event updated: "${updated.name}" (ID: ${eventId})`);
    return updated;
  }

  findById(id: number) {
    return this.eventsRepository.findById(id);
  }

  findByOrganizer(organizerId: number) {
    return this.eventsRepository.findByOrganizer(organizerId);
  }

  async findAllPublic(viewer: Viewer | null) {
    const events = await this.eventsRepository.findAllApproved();
    return events.filter((e: any) =>
      isViewerEligibleForEvent(viewer, e as any),
    );
  }

  async findByIdPublic(id: number, viewer: Viewer | null) {
    const event = await this.eventsRepository.findById(id);
    const hasApprovedActivity = (event as any)?.activities?.some(
      (a: any) => a.approvalStatus === ApprovalStatus.APPROVED,
    );
    // ให้ error เดียวกับ "ไม่พบ" เสมอ ไม่ว่าจะไม่มีจริงๆ, ไม่มีกิจกรรมย่อยที่อนุมัติแล้ว, หรือมีแต่ไม่มีสิทธิ์เห็น
    if (!event || !hasApprovedActivity || !isViewerEligibleForEvent(viewer, event as any)) {
      throw new NotFoundException(`ไม่พบงาน ID: ${id}`);
    }
    return event;
  }

  async getSurveyResults(eventId: number, callerId: number, callerRole: UserRole) {
    const event = await this.eventsRepository.findByIdWithSurveyAnswers(eventId);

    if (!event) throw new NotFoundException('ไม่พบงาน');
    if (callerRole !== UserRole.ADMIN && event.organizerId !== callerId) {
      throw new BadRequestException('คุณไม่มีสิทธิ์ดูผลสำรวจของงานนี้');
    }

    return event.surveyQuestions.map((q) => {
      if (q.type === SurveyQuestionType.RATING) {
        const ratings = q.answers
          .map((a) => a.ratingValue)
          .filter((v): v is number => v !== null);
        const average = ratings.length ? ratings.reduce((sum, v) => sum + v, 0) / ratings.length : 0;

        return {
          questionId: q.id,
          label: q.label,
          type: q.type,
          scaleMax: q.scaleMax,
          responseCount: ratings.length,
          average: Number(average.toFixed(2)),
        };
      }

      const responses = q.answers
        .map((a) => a.textValue)
        .filter((v): v is string => !!v);

      return {
        questionId: q.id,
        label: q.label,
        type: q.type,
        responseCount: responses.length,
        responses,
      };
    });
  }
}
