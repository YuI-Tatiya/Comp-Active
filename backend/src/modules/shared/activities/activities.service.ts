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
import { ApprovalStatus } from '../../../common/enums/status.enum';
import { UserRole } from '../../../common/enums/role.enum';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(private readonly activitiesRepository: ActivitiesRepository) {}

  async create(organizerId: number, createDto: CreateActivityDto) {
    const { tags, conditions, benefits, softSkills, date, ...activityData } = createDto;

    const activity = await this.activitiesRepository.create(organizerId, {
      ...activityData,
      date: new Date(date),
      tags: { create: tags?.map((tagName) => ({ tagName })) ?? [] },
      conditions: { create: conditions?.map((conditionText) => ({ conditionText })) ?? [] },
      benefits: { create: benefits?.map((benefitText) => ({ benefitText })) ?? [] },
      softSkills: { create: softSkills?.map((skillName) => ({ skillName })) ?? [] },
    });

    this.logger.log(`Activity created: "${activity.name}" (ID: ${activity.id})`);
    return activity;
  }

  async findAllApproved(filterDto?: ActivityFilterDto) {
    const activities = await this.activitiesRepository.findAllApproved(filterDto);

    return activities.map(({ _count, ...a }: any) => ({
      ...a,
      registeredCount: _count.registrations,
    }));
  }

  async findById(id: number) {
    const activity = await this.activitiesRepository.findById(id);

    if (!activity) {
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

    await this.activitiesRepository.delete(activityId);
    this.logger.log(`Activity deleted: "${activity.name}" (ID: ${activityId})`);
  }

  findPendingApproval() {
    return this.activitiesRepository.findPendingApproval();
  }

  async approve(activityId: number) {
    const activity = await this.activitiesRepository.approve(activityId);
    this.logger.log(`Activity approved: "${activity.name}" (ID: ${activityId})`);
    return activity;
  }

  async reject(activityId: number, reason: string) {
    const activity = await this.activitiesRepository.reject(activityId, reason);
    this.logger.log(`Activity rejected: "${activity.name}" (ID: ${activityId})`);
    return activity;
  }

  countAll() {
    return this.activitiesRepository.countAll();
  }

  countPending() {
    return this.activitiesRepository.countPending();
  }

  async requestCancellation(activityId: number, organizerId: number, reason: string) {
    const activity = await this.findById(activityId);

    if (activity.organizerId !== organizerId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ยกเลิกกิจกรรมนี้');
    }

    if (
      activity.registrations.length === 0 ||
      activity.approvalStatus !== ApprovalStatus.APPROVED
    ) {
      return this.activitiesRepository.closeAndReject(activityId, reason);
    }

    const saved = await this.activitiesRepository.requestCancellation(activityId, reason);
    this.logger.log(`Cancellation requested: "${activity.name}" (ID: ${activityId})`);
    return saved;
  }

  findPendingCancellation() {
    return this.activitiesRepository.findPendingCancellation();
  }

  async approveCancellation(activityId: number) {
    const activity = await this.findById(activityId);
    if (activity.approvalStatus !== ApprovalStatus.PENDING_CANCEL) {
      throw new BadRequestException('กิจกรรมนี้ไม่ได้อยู่ระหว่างการขอรอยกเลิก');
    }

    const saved = await this.activitiesRepository.approveCancellation(activityId);
    this.logger.log(`Cancellation approved by Admin: "${activity.name}" (ID: ${activityId})`);
    return saved;
  }

  async getOrganizerStats(organizerId: number) {
    const activities = await this.activitiesRepository.findManyByOrganizerWithCount(organizerId);

    const totalActivities = activities.length;
    const activeActivities = activities.filter(
      (a) => a.approvalStatus === ApprovalStatus.APPROVED,
    ).length;
    const totalRegistrations = activities.reduce(
      (sum, a) => sum + a._count.registrations,
      0,
    );
    const pendingApprovals = activities.filter(
      (a) => a.approvalStatus === ApprovalStatus.PENDING,
    ).length;

    return { totalActivities, activeActivities, totalRegistrations, pendingApprovals };
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
