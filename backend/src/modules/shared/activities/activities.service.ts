import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ActivitiesRepository } from './activities.repository';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ActivityFilterDto } from './dto/activity-filter.dto';
import { ActivityStatus, ApprovalStatus, AttendanceStatus } from '../../../common/enums/status.enum';
import { UserRole } from '../../../common/enums/role.enum';
import { isViewerEligibleForEvent, filterVisibleActivities, type Viewer } from '../events/event-visibility.util';
import { RegistrationsRepository } from '../registrations/registrations.repository';
import { MailService } from '../mail/mail.service';
import { UsersRepository } from '../users/users.repository';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    private readonly activitiesRepository: ActivitiesRepository,
    private readonly registrationsRepository: RegistrationsRepository,
    private readonly mailService: MailService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async create(organizerId: number, createDto: CreateActivityDto) {
    const { tags, conditions, benefits, softSkills, date, ...activityData } = createDto;

    const activity = await this.activitiesRepository.create(organizerId, {
      ...activityData,
      date: new Date(date),
      tags: { create: tags?.map((tagName) => ({ tagName })) ?? [] },
      conditions: { create: conditions?.map((conditionText) => ({ conditionText })) ?? [] },
      benefits: { create: benefits?.map((benefitText) => ({ benefitText })) ?? [] },
      softSkills: { create: softSkills?.map((skillType) => ({ skillType })) ?? [] },
    });

    this.logger.log(`Activity created: "${activity.name}" (ID: ${activity.id})`);
    return activity;
  }

  async findAllApproved(filterDto?: ActivityFilterDto, viewer?: Viewer | null) {
    const activities = await this.activitiesRepository.findAllApproved(filterDto);
    const visible = filterVisibleActivities(activities as any, viewer ?? null);

    return visible.map(({ _count, ...a }: any) => ({
      ...a,
      registeredCount: _count.registrations,
    }));
  }

  async findById(id: number, viewer?: Viewer | null) {
    const activity = await this.activitiesRepository.findById(id);

    // ให้ error เดียวกับ "ไม่พบ" เสมอ ไม่ว่าจะไม่มีจริงๆ หรือมีแต่ไม่มีสิทธิ์เห็น — กันการเดาว่ากิจกรรม restricted มีอยู่จริง
    if (!activity || !isViewerEligibleForEvent(viewer, (activity as any).event)) {
      throw new NotFoundException(`ไม่พบกิจกรรม ID: ${id}`);
    }

    return activity;
  }

  findAllForNewsfeed() {
    return this.activitiesRepository.findAllForNewsfeed();
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

    return activities.map(({ _count, ...a }: any) => ({
      ...a,
      registeredCount: _count.registrations,
    }));
  }

  async update(
    activityId: number,
    userId: number,
    userRole: UserRole,
    updateDto: UpdateActivityDto,
  ) {
    const activity = await this.findById(activityId);

    if (userRole !== UserRole.ADMIN && activity.organizerId !== userId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขกิจกรรมนี้');
    }

    const { tags, conditions, benefits, softSkills, date, ...activityData } = updateDto;

    const updated = await this.activitiesRepository.updateWithRelations(
      activityId,
      { ...activityData, ...(date && { date: new Date(date) }) },
      { tags, conditions, benefits, softSkills },
    );

    this.logger.log(`Activity updated: "${activity.name}" (ID: ${activityId})`);
    return updated;
  }

  async delete(activityId: number, userId: number, userRole: UserRole) {
    const activity = await this.findById(activityId);

    if (userRole !== UserRole.ADMIN && activity.organizerId !== userId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ลบกิจกรรมนี้');
    }
    if (((activity as any).registrations?.length ?? 0) > 0) {
      throw new BadRequestException('ไม่สามารถลบกิจกรรมนี้ได้ เนื่องจากมีผู้ลงทะเบียนแล้ว');
    }

    await this.activitiesRepository.delete(activityId);
    this.logger.log(`Activity deleted: "${activity.name}" (ID: ${activityId})`);
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

    // endAt เป็น null สำหรับกิจกรรมรุ่นเก่า จึงถอยไปใช้ date + endTime แทน
    const endsAt = activity.endAt
      ? new Date(activity.endAt)
      : new Date(`${new Date(activity.date).toISOString().slice(0, 10)}T${activity.endTime || '23:59'}:00`);

    if (!Number.isNaN(endsAt.getTime()) && endsAt.getTime() > Date.now()) {
      throw new BadRequestException('ยังไม่ถึงเวลาสิ้นสุดกิจกรรม ยังจบกิจกรรมไม่ได้');
    }

    const saved = await this.activitiesRepository.markCompleted(activityId);
    this.logger.log(`Activity completed: "${activity.name}" (ID: ${activityId})`);

    void this.notifyActivityCompleted(activityId, activity.name);

    return saved;
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
    const activeActivities = activities.filter(
      (a) => a.approvalStatus === ApprovalStatus.APPROVED,
    ).length;
    const totalRegistrations = activities.reduce(
      (sum, a) => sum + a._count.registrations,
      0,
    );

    return { totalActivities, activeActivities, totalRegistrations, totalStudents, pendingRegistrations };
  }

  async getPlatformStats() {
    const totalActivities = await this.activitiesRepository.countApproved();
    const distinctStudents = await this.activitiesRepository.countDistinctRegisteredStudents();

    return {
      totalActivities,
      totalParticipants: distinctStudents.length,
    };
  }
}
