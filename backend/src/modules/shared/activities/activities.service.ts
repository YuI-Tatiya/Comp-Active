import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ActivitiesRepository } from './activities.repository';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ActivityFilterDto } from './dto/activity-filter.dto';
import { CreateSurveyQuestionDto } from '../events/dto/create-survey-question.dto';
import { ActivityStatus, ApprovalStatus, AttendanceStatus, SurveyQuestionType } from '../../../common/enums/status.enum';
import { prepareRegistrationTypeFields } from '../../../common/utils/registration-type.util';
import { UserRole } from '../../../common/enums/role.enum';
import { isViewerEligibleForEvent, filterVisibleActivities, type Viewer } from '../events/event-visibility.util';
import { buildSurveyResults } from '../events/survey-results.util';
import { EventsRepository } from '../events/events.repository';
import { RegistrationsRepository } from '../registrations/registrations.repository';
import { MailService } from '../mail/mail.service';
import { UsersRepository } from '../users/users.repository';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    private readonly activitiesRepository: ActivitiesRepository,
    // ใช้อ่านแบบสำรวจของงานแม่ เมื่อกิจกรรมที่ดูอยู่เป็นกิจกรรมย่อยของงาน
    private readonly eventsRepository: EventsRepository,
    private readonly registrationsRepository: RegistrationsRepository,
    private readonly mailService: MailService,
    private readonly usersRepository: UsersRepository,
  ) {}

  /** เกณฑ์เดียวกับ EventsService — คะแนนเต็มของคำถามแบบ rating ต้องมีอย่างน้อย 2 */
  private validateSurveyQuestions(surveyQuestions: CreateSurveyQuestionDto[] | undefined): void {
    (surveyQuestions ?? []).forEach((q, index) => {
      if (q.type === SurveyQuestionType.RATING && q.scaleMax !== undefined && q.scaleMax < 2) {
        throw new BadRequestException(`คำถามแบบสำรวจข้อที่ ${index + 1}: คะแนนเต็มต้องมีอย่างน้อย 2`);
      }
    });
  }

  async create(organizerId: number, createDto: CreateActivityDto) {
    const {
      tags,
      conditions,
      benefits,
      softSkills,
      surveyQuestions,
      date,
      registrationType,
      dutyRoleOptions,
      dutyShiftOptions,
      teamSizeMin,
      teamSizeMax,
      competitionCategoryOptions,
      ...activityData
    } = createDto;

    this.validateSurveyQuestions(surveyQuestions);

    const registrationTypeFields = prepareRegistrationTypeFields({
      registrationType,
      dutyRoleOptions,
      dutyShiftOptions,
      teamSizeMin,
      teamSizeMax,
      competitionCategoryOptions,
    });

    const activity = await this.activitiesRepository.create(organizerId, {
      ...activityData,
      date: new Date(date),
      ...registrationTypeFields,
      tags: { create: tags?.map((tagName) => ({ tagName })) ?? [] },
      conditions: { create: conditions?.map((conditionText) => ({ conditionText })) ?? [] },
      benefits: { create: benefits?.map((benefitText) => ({ benefitText })) ?? [] },
      softSkills: { create: softSkills?.map((skillType) => ({ skillType })) ?? [] },
      surveyQuestions: {
        create: (surveyQuestions ?? []).map((q, sortOrder) => ({
          label: q.label,
          type: q.type,
          scaleMax: q.scaleMax ?? 5,
          sortOrder,
        })),
      },
    });

    this.logger.log(`Activity created: "${activity.name}" (ID: ${activity.id})`);
    return activity;
  }

  async findAllApproved(filterDto?: ActivityFilterDto, viewer?: Viewer | null) {
    const activities = await this.activitiesRepository.findAllApproved(filterDto);
    const visible = filterVisibleActivities(activities as any, viewer ?? null);

    return visible.map(({ _count, ...a }: any) => ({ ...a, registeredCount: _count.registrations }));
  }

  async findById(id: number, viewer?: Viewer | null) {
    const activity = await this.activitiesRepository.findById(id);

    // ให้ error เดียวกับ "ไม่พบ" เสมอ ไม่ว่าจะไม่มีจริงๆ หรือมีแต่ไม่มีสิทธิ์เห็น — กันการเดาว่ากิจกรรม restricted มีอยู่จริง
    if (!activity || !isViewerEligibleForEvent(viewer, (activity as any).event)) {
      throw new NotFoundException(`ไม่พบกิจกรรม ID: ${id}`);
    }

    // endpoint นี้เป็น public (ดูได้ทุกคนรวมไม่ login) — ส่งแค่จำนวนผู้ลงทะเบียน ไม่ส่งรายชื่อ/อีเมล/เบอร์
    const { _count, ...rest } = activity as any;
    return { ...rest, registeredCount: _count.registrations };
  }

  /** รายละเอียดเต็ม (รวมรายชื่อผู้ลงทะเบียน+คำตอบตอนลงทะเบียน) — เฉพาะ organizer เจ้าของกิจกรรม/admin */
  async findByIdForOrganizer(id: number, callerId: number, callerRole: UserRole) {
    const activity = await this.activitiesRepository.findByIdForOrganizer(id);

    if (!activity) throw new NotFoundException(`ไม่พบกิจกรรม ID: ${id}`);
    if (callerRole !== UserRole.ADMIN && (activity as any).organizerId !== callerId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ดูข้อมูลกิจกรรมนี้');
    }

    return activity;
  }

  findAllForNewsfeed() {
    return this.activitiesRepository.findAllForNewsfeed();
  }

  /** กิจกรรมที่เปิดรับสมัครอยู่ตอนนี้แบบย่อ — ให้ ChatbotService ใช้เป็นข้อมูลอ้างอิงจริงแทนการให้โมเดลเดา/ปฏิเสธเฉยๆ */
  findOpenForChatbot() {
    return this.activitiesRepository.findOpenForChatbot();
  }

  async findByIdForNewsfeed(id: number) {
    const activity = await this.activitiesRepository.findByIdForNewsfeed(id);

    if (!activity) {
      throw new NotFoundException(`ไม่พบกิจกรรม ID: ${id}`);
    }

    return activity;
  }

  async findByOrganizer(organizerId: number) {
    const activities = await this.activitiesRepository.findByOrganizer(organizerId);

    return activities.map(({ _count, ...a }: any) => ({ ...a, registeredCount: _count.registrations }));
  }

  async update(activityId: number, userId: number, userRole: UserRole, updateDto: UpdateActivityDto) {
    const activity = await this.findById(activityId);

    if (userRole !== UserRole.ADMIN && activity.organizerId !== userId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขกิจกรรมนี้');
    }

    const {
      tags,
      conditions,
      benefits,
      softSkills,
      surveyQuestions,
      date,
      registrationType,
      dutyRoleOptions,
      dutyShiftOptions,
      teamSizeMin,
      teamSizeMax,
      competitionCategoryOptions,
      ...activityData
    } = updateDto;

    this.validateSurveyQuestions(surveyQuestions);

    // เฉพาะเมื่อผู้เรียกส่งฟิลด์ประเภทการรับสมัครมาจริง (ทางแก้ไขกิจกรรมเดี่ยวรุ่นเก่าไม่เคยส่งฟิลด์พวกนี้มาเลย)
    // จึงจะคำนวณค่าใหม่ทับ — ไม่งั้นจะรีเซ็ตกลับเป็น participant ทุกครั้งที่แก้ไขจากหน้าเดิม
    const touchedRegistrationType =
      registrationType !== undefined ||
      dutyRoleOptions !== undefined ||
      dutyShiftOptions !== undefined ||
      teamSizeMin !== undefined ||
      teamSizeMax !== undefined ||
      competitionCategoryOptions !== undefined;

    const registrationTypeFields = touchedRegistrationType
      ? prepareRegistrationTypeFields({
          registrationType,
          dutyRoleOptions,
          dutyShiftOptions,
          teamSizeMin,
          teamSizeMax,
          competitionCategoryOptions,
        })
      : {};

    const updated = await this.activitiesRepository.updateWithRelations(
      activityId,
      { ...activityData, ...registrationTypeFields, ...(date && { date: new Date(date) }) },
      {
        tags,
        conditions,
        benefits,
        softSkills,
        surveyQuestions: surveyQuestions?.map((q) => ({
          label: q.label,
          type: q.type,
          scaleMax: q.scaleMax ?? 5,
        })),
      },
    );

    this.logger.log(`Activity updated: "${activity.name}" (ID: ${activityId})`);
    return updated;
  }

  async delete(activityId: number, userId: number, userRole: UserRole) {
    const activity = await this.findById(activityId);

    if (userRole !== UserRole.ADMIN && activity.organizerId !== userId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ลบกิจกรรมนี้');
    }
    if (((activity as any).registeredCount ?? 0) > 0) {
      throw new BadRequestException('ไม่สามารถลบกิจกรรมนี้ได้ เนื่องจากมีผู้ลงทะเบียนแล้ว');
    }

    await this.activitiesRepository.delete(activityId);
    this.logger.log(`Activity deleted: "${activity.name}" (ID: ${activityId})`);
  }

  /** คัดลอกกิจกรรมเดี่ยวทั้งใบเป็นแถวใหม่ (ไม่คัดลอกผู้ลงทะเบียน) — ตั้งชื่อต่อท้ายด้วย "(สำเนา)" */
  async duplicate(activityId: number, userId: number, userRole: UserRole) {
    const activity = await this.findById(activityId);

    if (userRole !== UserRole.ADMIN && activity.organizerId !== userId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์คัดลอกกิจกรรมนี้');
    }

    // organizerId ของสำเนาเป็นของผู้ที่กดคัดลอก ไม่ใช่เจ้าของเดิมเสมอไป (แอดมินคัดลอกแทนผู้จัดได้)
    const copy = await this.activitiesRepository.duplicate(activityId, userId);
    if (!copy) throw new NotFoundException(`ไม่พบกิจกรรม ID: ${activityId}`);

    this.logger.log(`Activity duplicated: "${activity.name}" (ID: ${activityId}) → new ID ${copy.id}`);
    const { _count, ...rest } = copy as any;
    return { ...rest, registeredCount: _count.registrations };
  }

  /**
   * เปิด/ปิดรับสมัครชั่วคราว — ย้อนกลับได้ คนละอย่างกับ markCompleted (จบถาวร) หรือ
   * requestCancellation (ยกเลิกถาวร ต้องมีเหตุผล แจ้งอีเมลผู้ลงทะเบียน)
   */
  async setStatus(activityId: number, userId: number, userRole: UserRole, status: 'open' | 'closed') {
    const activity = await this.findById(activityId);

    if (userRole !== UserRole.ADMIN && activity.organizerId !== userId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขสถานะกิจกรรมนี้');
    }

    const updated = await this.activitiesRepository.updateStatus(activityId, status);
    this.logger.log(`Activity status set to ${status}: "${activity.name}" (ID: ${activityId})`);
    const { _count, ...rest } = updated as any;
    return { ...rest, registeredCount: _count.registrations };
  }

  countAll() {
    return this.activitiesRepository.countAll();
  }

  /**
   * ปิดกิจกรรมว่า "จบแล้ว" — ปลดล็อกให้นักศึกษาทำแบบสำรวจ และหยุดรับสมัคร
   * ต้องเลยเวลาสิ้นสุดจริงก่อน ไม่งั้นผู้จัดจะจบกิจกรรมที่ยังไม่ได้จัดได้
   */
  async markCompleted(activityId: number, organizerId: number, callerRole: UserRole) {
    const activity = await this.findById(activityId);

    if (callerRole !== UserRole.ADMIN && activity.organizerId !== organizerId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์จบกิจกรรมนี้');
    }
    if (activity.status === ActivityStatus.COMPLETED) {
      throw new BadRequestException('กิจกรรมนี้จบไปแล้ว');
    }
    if (activity.approvalStatus === ApprovalStatus.CANCELLED || activity.approvalStatus === ApprovalStatus.REJECTED) {
      throw new BadRequestException('กิจกรรมนี้ถูกยกเลิกไปแล้ว ไม่สามารถจบกิจกรรมได้');
    }

    const endsAt = this.computeEndsAt(activity);
    if (!Number.isNaN(endsAt.getTime()) && endsAt.getTime() > Date.now()) {
      throw new BadRequestException('ยังไม่ถึงเวลาสิ้นสุดกิจกรรม ยังจบกิจกรรมไม่ได้');
    }

    const saved = await this.activitiesRepository.markCompleted(activityId);
    this.logger.log(`Activity completed: "${activity.name}" (ID: ${activityId})`);

    void this.notifyActivityCompleted(activityId, activity.name);

    return saved;
  }

  /** endAt เป็น null สำหรับกิจกรรมรุ่นเก่า จึงถอยไปใช้ date + endTime แทน — ใช้ร่วมกันทั้ง markCompleted
   *  แบบกดเองและ autoCompleteOverdueActivities (งานอัตโนมัติ) กันสูตรเพี้ยนไม่ตรงกันระหว่างสองทาง */
  private computeEndsAt(activity: { endAt: Date | null; date: Date; endTime: string | null }): Date {
    return activity.endAt
      ? new Date(activity.endAt)
      : new Date(`${new Date(activity.date).toISOString().slice(0, 10)}T${activity.endTime || '23:59'}:00`);
  }

  /**
   * งานอัตโนมัติ: ปิดกิจกรรมที่เลยเวลาสิ้นสุดแล้วแต่ผู้จัดยังไม่ได้กด "จบกิจกรรม" เอง — ใช้เงื่อนไขเดียวกับ
   * markCompleted ทุกอย่าง (ยกเว้นเช็คเจ้าของ เพราะไม่มีผู้เรียกจริง) รวมถึงอีเมลแจ้งผู้เข้าร่วมที่เช็คอินแล้ว
   * ชุดเดียวกัน ผู้ใช้ปลายทางไม่ควรรู้สึกต่างกันว่าใครเป็นคนกด — แค่ "กิจกรรมจบแล้ว" เหมือนกัน
   *
   * แต่ละกิจกรรมพังแยกจากกัน ไม่ throw ต่อ — ไม่งั้นกิจกรรมหนึ่งมีปัญหาจะพารายการอื่นในรอบเดียวกันไม่ถูกปิดไปด้วย
   * รันทุก 10 นาที (ค่าคงที่ที่ละเอียดสุดที่ @nestjs/schedule มีให้คือระดับนี้): ถี่พอให้แบบสำรวจเปิดให้
   * ผู้เข้าร่วมตอบได้โดยไม่รอนาน ไม่ถี่จนไม่จำเป็น
   *
   * หมายเหตุ: ตอนนี้ backend รันอินสแตนซ์เดียว (ดู docker-compose.yml) จึงไม่มีความเสี่ยงรันซ้ำซ้อนจนแจ้งอีเมล
   * ผู้เข้าร่วมซ้ำ — ถ้าในอนาคตขยายเป็นหลายอินสแตนซ์ ต้องเพิ่ม lock กันชนกันก่อน
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async autoCompleteOverdueActivities(): Promise<number> {
    const now = new Date();
    const candidates = await this.activitiesRepository.findOpenPastEnd(now);
    let completedCount = 0;

    for (const activity of candidates) {
      const endsAt = this.computeEndsAt(activity);
      if (Number.isNaN(endsAt.getTime()) || endsAt.getTime() > now.getTime()) continue; // ยังไม่ถึงเวลาจริง (เคสรุ่นเก่าที่คำนวณจาก date+endTime)

      try {
        await this.activitiesRepository.markCompleted(activity.id);
        this.logger.log(`Activity auto-completed (เลยเวลาสิ้นสุดแล้ว): "${activity.name}" (ID: ${activity.id})`);
        void this.notifyActivityCompleted(activity.id, activity.name);
        completedCount++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`autoCompleteOverdueActivities failed for activity ${activity.id}: ${msg}`);
      }
    }

    if (completedCount > 0) {
      this.logger.log(`Auto-complete run: ปิดกิจกรรมที่เลยเวลาไปแล้ว ${completedCount} รายการ`);
    }
    return completedCount;
  }

  private async notifyActivityCompleted(activityId: number, activityName: string) {
    try {
      const registrations = await this.registrationsRepository.findByActivity(activityId);
      const attended = registrations.filter((r: any) => r.attendance === AttendanceStatus.ATTENDED);
      await Promise.all(
        attended.map((r: any) => this.mailService.sendActivityCompleted(r.student.email, r.student.name, activityName)),
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`notifyActivityCompleted failed for activity ${activityId}: ${msg}`);
    }
  }

  async requestCancellation(activityId: number, organizerId: number, reason: string) {
    const activity = await this.findById(activityId);

    if (activity.organizerId !== organizerId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ยกเลิกกิจกรรมนี้');
    }

    const saved = await this.activitiesRepository.cancelByOrganizer(activityId, reason);
    this.logger.log(`Activity cancelled by organizer: "${activity.name}" (ID: ${activityId})`);

    void this.notifyActivityCancelled(activityId, activity.name, reason);

    return saved;
  }

  private async notifyActivityCancelled(activityId: number, activityName: string, reason: string) {
    try {
      const registrations = await this.registrationsRepository.findByActivity(activityId);
      await Promise.all(
        registrations.map((r: any) =>
          this.mailService.sendActivityCancelled(r.student.email, r.student.name, activityName, reason),
        ),
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`notifyActivityCancelled failed for activity ${activityId}: ${msg}`);
    }
  }

  async getOrganizerStats(organizerId: number) {
    const [activities, totalStudents, pendingRegistrations] = await Promise.all([
      this.activitiesRepository.findManyByOrganizerWithCount(organizerId),
      this.usersRepository.countActiveStudents(),
      this.registrationsRepository.countPendingByOrganizer(organizerId),
    ]);

    const totalActivities = activities.length;
    // "กำลังเปิดรับ" ต้องแปลว่าเปิดรับสมัครอยู่จริง (status) ไม่ใช่แค่ผ่านการอนุมัติ (approvalStatus) —
    // เดิมนับจาก approvalStatus === APPROVED ทำให้ตัวเลขบนการ์ดสถิติไม่ตรงกับแท็บสถานะ "เปิดรับสมัคร"
    // ของหน้าเดียวกัน (กิจกรรมที่อนุมัติแล้วแต่ถูกปิดรับสมัคร/จบไปแล้ว ก็ยังถูกนับว่า "active" อยู่)
    // ต้อง === APPROVED ตรงๆ (ไม่ใช่แค่ !== CANCELLED/REJECTED) ให้ตรงกับเงื่อนไขเดียวกับที่
    // findAllApproved/EXCLUDE_RESTRICTED ใช้ตัดสินว่ากิจกรรมนี้เปิดให้สาธารณะเห็น-สมัครได้จริงหรือไม่
    const activeActivities = activities.filter(
      (a) => a.status === ActivityStatus.OPEN && a.approvalStatus === ApprovalStatus.APPROVED,
    ).length;
    const totalRegistrations = activities.reduce((sum, a) => sum + a._count.registrations, 0);

    return { totalActivities, activeActivities, totalRegistrations, totalStudents, pendingRegistrations };
  }

  async getPlatformStats() {
    const totalActivities = await this.activitiesRepository.countApproved();
    const distinctStudents = await this.activitiesRepository.countDistinctRegisteredStudents();

    return { totalActivities, totalParticipants: distinctStudents.length };
  }

  /**
   * ผลสรุปแบบสำรวจของกิจกรรม — โครงสร้าง response ตรงกับ EventsService.getSurveyResults()
   * เพื่อให้ frontend ใช้คอมโพเนนต์เดียวกันแสดงผลได้ทั้งสองหน้า
   *
   * กิจกรรมย่อยของงาน (eventId ไม่ null) ไม่มีแบบสำรวจของตัวเอง — แบบสำรวจถูกสร้างไว้ที่ระดับงาน
   * ใบเดียวใช้ร่วมกันทุกกิจกรรมย่อย จึงคืนผลของ "งานแม่" ทั้งก้อน (รวมผู้ตอบจากทุกกิจกรรมย่อย)
   * ไม่ใช่คืนค่าว่างเปล่าเหมือนเดิม
   */
  async getSurveyResults(activityId: number, callerId: number, callerRole: UserRole) {
    const activity = await this.activitiesRepository.findByIdWithSurveyAnswers(activityId);

    if (!activity) throw new NotFoundException('ไม่พบกิจกรรม');
    if (callerRole !== UserRole.ADMIN && activity.organizerId !== callerId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ดูผลสำรวจของกิจกรรมนี้');
    }

    if (activity.eventId != null) {
      const event = await this.eventsRepository.findByIdWithSurveyAnswers(activity.eventId);
      if (!event) throw new NotFoundException('ไม่พบงานที่กิจกรรมนี้สังกัดอยู่');
      return buildSurveyResults(event.surveyQuestions);
    }

    return buildSurveyResults(activity.surveyQuestions);
  }
}
