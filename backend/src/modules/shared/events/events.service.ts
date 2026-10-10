import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { EventsRepository, PreparedActivityData } from './events.repository';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { diffHours, formatHHmm } from '../../../common/utils/time.util';
import { prepareRegistrationTypeFields } from '../../../common/utils/registration-type.util';
import { maxSoftSkillLevel } from '../../../common/utils/soft-skill-cap.util';

const MAX_SOFT_SKILLS_PER_ACTIVITY = 3;
import {
  ActivityQuestionType,
  SurveyQuestionType,
  EventVisibility,
  ApprovalStatus,
} from '../../../common/enums/status.enum';
import { UserRole } from '../../../common/enums/role.enum';
import { isViewerEligibleForEvent, Viewer } from './event-visibility.util';
import { buildSurveyResults } from './survey-results.util';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly eventsRepository: EventsRepository) {}

  /** จำกัดจำนวนทักษะ + เพดานระดับตามระยะเวลากิจกรรม — กันกิจกรรมสั้นได้คะแนนสูงเกินจริง (ดู soft-skill-cap.util.ts) */
  private validateSoftSkillRates(
    rates: { skillType: string; rate: number }[],
    durationHours: number,
    errorPrefix: string,
  ) {
    if (rates.length > MAX_SOFT_SKILLS_PER_ACTIVITY) {
      throw new BadRequestException(
        `${errorPrefix}เลือกประเมิน Soft Skills ได้ไม่เกิน ${MAX_SOFT_SKILLS_PER_ACTIVITY} ทักษะต่อกิจกรรม`,
      );
    }
    const cap = maxSoftSkillLevel(durationHours);
    if (rates.some((r) => r.rate > cap)) {
      throw new BadRequestException(
        `${errorPrefix}ให้คะแนน Soft Skills ได้ไม่เกินระดับ ${cap} ตามระยะเวลาของกิจกรรมนี้ (${durationHours} ชม.)`,
      );
    }
  }

  /** ถ้าตั้งไว้ทั้งสองวัน วันเปิดรับสมัครต้องมาก่อนวันปิดเสมอ — กันตั้งค่าสลับกันจนไม่เหลือช่วงเวลาที่สมัครได้เลย */
  private validateRegistrationWindow(openAt?: Date, closeAt?: Date) {
    if (openAt && closeAt && openAt.getTime() >= closeAt.getTime()) {
      throw new BadRequestException('วันเปิดรับสมัครต้องอยู่ก่อนวันปิดรับสมัคร');
    }
  }

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

        return { label: q.label, type: q.type, required: q.required ?? false, options: needsOptions ? options : [] };
      });

      const registrationTypeFields = prepareRegistrationTypeFields(a, `กิจกรรมลำดับที่ ${index + 1}: `);

      const durationHours = diffHours(startAt, endAt);
      const softSkillRates = (a.softSkillRates ?? []).map((s) => ({ skillType: s.skillType, rate: s.rate }));
      this.validateSoftSkillRates(softSkillRates, durationHours, `กิจกรรมลำดับที่ ${index + 1}: `);

      return {
        name: a.name,
        description: a.description,
        categories: a.categories,
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
        volunteerHours: a.issueVolunteerCertificate ? diffHours(startAt, endAt) : null,
        volunteerRole: a.issueVolunteerCertificate ? a.volunteerRole : null,
        ...registrationTypeFields,
        softSkillRates,
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
    const registrationOpenAt = dto.registrationOpenAt ? new Date(dto.registrationOpenAt) : undefined;
    const registrationCloseAt = dto.registrationCloseAt ? new Date(dto.registrationCloseAt) : undefined;
    this.validateRegistrationWindow(registrationOpenAt, registrationCloseAt);

    const event = await this.eventsRepository.create(organizerId, {
      name: dto.name,
      description: dto.description,
      imageUrl: dto.imageUrl,
      isPublic: dto.isPublic ?? true,
      registrationOpenAt,
      registrationCloseAt,
      activities,
      surveyQuestions,
      visibility,
      visibilityPrograms: visibility === EventVisibility.RESTRICTED ? (dto.visibilityPrograms ?? []) : [],
      visibilityYears: visibility === EventVisibility.RESTRICTED ? (dto.visibilityYears ?? []) : [],
      visibilityStudentIdFilter: visibility === EventVisibility.RESTRICTED ? dto.visibilityStudentIdFilter : undefined,
    });

    this.logger.log(`Event created: "${event.name}" (ID: ${event.id}) with ${activities.length} activities`);
    return this.mapRegisteredCount(event);
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
        throw new BadRequestException(`ไม่สามารถลบกิจกรรม "${removed.name}" ได้ เนื่องจากมีผู้ลงทะเบียนแล้ว`);
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

      const registrationTypeFields = prepareRegistrationTypeFields(a, `กิจกรรมลำดับที่ ${index + 1}: `);

      const durationHours = diffHours(startAt, endAt);
      const softSkillRates = (a.softSkillRates ?? []).map((s) => ({ skillType: s.skillType, rate: s.rate }));
      this.validateSoftSkillRates(softSkillRates, durationHours, `กิจกรรมลำดับที่ ${index + 1}: `);

      return {
        id: a.id,
        name: a.name,
        description: a.description,
        categories: a.categories,
        imageUrl: a.imageUrl,
        attachmentUrl: a.attachmentUrl,
        startAt,
        endAt,
        date: startAt,
        startTime: formatHHmm(startAt),
        endTime: formatHHmm(endAt),
        location: a.location,
        capacity: a.capacity,
        volunteerHours: a.issueVolunteerCertificate ? diffHours(startAt, endAt) : null,
        volunteerRole: a.issueVolunteerCertificate ? a.volunteerRole : null,
        ...registrationTypeFields,
        softSkillRates,
        questions,
      };
    });

    // ไม่ส่ง surveyQuestions มาเลย = ไม่ได้ตั้งใจแก้แบบสำรวจ ปล่อยของเดิมไว้
    // (เดิม `?? []` ทำให้กลายเป็น "ลบทุกข้อ" ซึ่งพาคำตอบของนักศึกษาหายไปด้วย)
    const surveyQuestions = dto.surveyQuestions?.map((q, index) => {
      if (q.type === SurveyQuestionType.RATING && q.scaleMax !== undefined && q.scaleMax < 2) {
        throw new BadRequestException(`คำถามแบบสำรวจข้อที่ ${index + 1}: คะแนนเต็มต้องมีอย่างน้อย 2`);
      }
      return { label: q.label, type: q.type, scaleMax: q.scaleMax ?? 5 };
    });

    const visibility = dto.visibility ?? EventVisibility.EVERYONE;
    const registrationOpenAt = dto.registrationOpenAt ? new Date(dto.registrationOpenAt) : undefined;
    const registrationCloseAt = dto.registrationCloseAt ? new Date(dto.registrationCloseAt) : undefined;
    this.validateRegistrationWindow(registrationOpenAt, registrationCloseAt);

    const updated = await this.eventsRepository.update(
      eventId,
      {
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        isPublic: dto.isPublic ?? true,
        registrationOpenAt,
        registrationCloseAt,
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
    return this.mapRegisteredCount(updated);
  }

  /** สลับสถานะเผยแพร่ของงาน — แยกจาก update() เพราะ update() ต้องส่ง activities ทั้งชุดมาด้วยเสมอ */
  async setPublic(organizerId: number, callerRole: UserRole, eventId: number, isPublic: boolean) {
    const event = await this.eventsRepository.findById(eventId);
    if (!event) throw new NotFoundException('ไม่พบงาน');
    if (callerRole !== UserRole.ADMIN && (event as any).organizerId !== organizerId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขงานนี้');
    }

    const updated = await this.eventsRepository.updatePublic(eventId, isPublic);
    this.logger.log(`Event ${isPublic ? 'published' : 'unpublished'}: "${event.name}" (ID: ${eventId})`);
    return updated;
  }

  /** เปิด/ปิดรับสมัครกิจกรรมย่อยทั้งหมดในงานนี้พร้อมกันชั่วคราว — ย้อนกลับได้ */
  async setActivitiesStatus(organizerId: number, callerRole: UserRole, eventId: number, status: 'open' | 'closed') {
    const event = await this.eventsRepository.findById(eventId);
    if (!event) throw new NotFoundException('ไม่พบงาน');
    if (callerRole !== UserRole.ADMIN && (event as any).organizerId !== organizerId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขสถานะงานนี้');
    }

    const result = await this.eventsRepository.updateActivitiesStatus(eventId, status);
    this.logger.log(`Event activities status set to ${status}: "${event.name}" (ID: ${eventId}, ${result.count} activities)`);
    return result;
  }

  /** ลบงานทั้งงานพร้อมกิจกรรมย่อย — บล็อกถ้ามีกิจกรรมย่อยตัวใดตัวหนึ่งมีผู้ลงทะเบียนแล้ว */
  async delete(organizerId: number, callerRole: UserRole, eventId: number) {
    const event = await this.eventsRepository.findById(eventId);
    if (!event) throw new NotFoundException('ไม่พบงาน');
    if (callerRole !== UserRole.ADMIN && (event as any).organizerId !== organizerId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ลบงานนี้');
    }

    const hasRegistrations = ((event as any).activities ?? []).some((a: any) => (a.registrations?.length ?? 0) > 0);
    if (hasRegistrations) {
      throw new BadRequestException('ไม่สามารถลบงานนี้ได้ เนื่องจากมีกิจกรรมย่อยที่มีผู้ลงทะเบียนแล้ว');
    }

    await this.eventsRepository.deleteWithActivities(eventId);
    this.logger.log(`Event deleted: "${event.name}" (ID: ${eventId})`);
  }

  /** คัดลอกงานทั้งงานพร้อมกิจกรรมย่อยทุกตัวเป็นงานใหม่ (ไม่เผยแพร่, ไม่คัดลอกผู้ลงทะเบียน) */
  async duplicate(organizerId: number, callerRole: UserRole, eventId: number) {
    const event = await this.eventsRepository.findById(eventId);
    if (!event) throw new NotFoundException('ไม่พบงาน');
    if (callerRole !== UserRole.ADMIN && (event as any).organizerId !== organizerId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์คัดลอกงานนี้');
    }

    // organizerId ของสำเนาเป็นของผู้ที่กดคัดลอก ไม่ใช่เจ้าของเดิมเสมอไป (แอดมินคัดลอกแทนผู้จัดได้)
    const copy = await this.eventsRepository.duplicateEvent(eventId, organizerId);
    if (!copy) throw new NotFoundException('ไม่พบงาน');

    this.logger.log(`Event duplicated: "${event.name}" (ID: ${eventId}) → new ID ${(copy as any).id}`);
    return this.mapRegisteredCount(copy);
  }

  /** ใช้ภายใน service เท่านั้น (เช่น update() ตรวจสอบสิทธิ์/รายการกิจกรรมย่อย) — ไม่ได้ผูก registeredCount */
  findById(id: number) {
    return this.eventsRepository.findById(id);
  }

  /** เส้นทาง organizer/admin authenticated แล้ว — ตรวจสิทธิ์ความเป็นเจ้าของก่อนคืนข้อมูลเต็ม */
  async findByIdForOrganizer(id: number, callerId: number, callerRole: UserRole) {
    const event = await this.eventsRepository.findById(id);
    if (!event) throw new NotFoundException('ไม่พบงาน');
    if (callerRole !== UserRole.ADMIN && (event as any).organizerId !== callerId) {
      // 404 ไม่ใช่ 403 — ไม่บอกว่ามีอยู่จริงแก่ผู้ที่ไม่ใช่เจ้าของ
      throw new NotFoundException('ไม่พบงาน');
    }
    return this.mapRegisteredCount(event);
  }

  async findByOrganizer(organizerId: number) {
    const events = await this.eventsRepository.findByOrganizer(organizerId);
    return events.map((e: any) => this.mapRegisteredCount(e));
  }

  async findAllPublic(viewer: Viewer | null) {
    const events = await this.eventsRepository.findAllApproved();
    return events.filter((e: any) => isViewerEligibleForEvent(viewer, e as any)).map((e: any) => this.toPublicEvent(e));
  }

  async findByIdPublic(id: number, viewer: Viewer | null) {
    const event = await this.eventsRepository.findByIdPublicSafe(id);
    const hasApprovedActivity = (event as any)?.activities?.some(
      (a: any) => a.approvalStatus === ApprovalStatus.APPROVED,
    );
    // ให้ error เดียวกับ "ไม่พบ" เสมอ ไม่ว่าจะไม่มีจริงๆ, ไม่มีกิจกรรมย่อยที่อนุมัติแล้ว, หรือมีแต่ไม่มีสิทธิ์เห็น
    if (!event || !hasApprovedActivity || !isViewerEligibleForEvent(viewer, event as any)) {
      throw new NotFoundException(`ไม่พบงาน ID: ${id}`);
    }
    return this.toPublicEvent(event);
  }

  /** เติม registeredCount จาก _count.registrations (mirror ของฝั่ง Activity) — ใช้กับเส้นทาง organizer/admin */
  private mapRegisteredCount(event: any) {
    if (!event) return event;
    return {
      ...event,
      activities: (event.activities ?? []).map(({ _count, ...a }: any) => ({
        ...a,
        registeredCount: _count?.registrations ?? 0,
      })),
    };
  }

  /** ตัดข้อมูลที่ไม่ควรเปิดเผยต่อสาธารณะ: registrations ดิบ, organizer.email, กิจกรรมย่อยที่ยังไม่ approved */
  private toPublicEvent(event: any) {
    return {
      ...event,
      activities: (event.activities ?? [])
        .filter((a: any) => a.approvalStatus === ApprovalStatus.APPROVED)
        .map(({ registrations, _count, organizer, ...a }: any) => ({
          ...a,
          organizer: organizer ? { id: organizer.id, name: organizer.name } : organizer,
          registeredCount: _count?.registrations ?? 0,
        })),
    };
  }

  async getSurveyResults(eventId: number, callerId: number, callerRole: UserRole) {
    const event = await this.eventsRepository.findByIdWithSurveyAnswers(eventId);

    if (!event) throw new NotFoundException('ไม่พบงาน');
    if (callerRole !== UserRole.ADMIN && event.organizerId !== callerId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ดูผลสำรวจของงานนี้');
    }

    return buildSurveyResults(event.surveyQuestions);
  }
}
