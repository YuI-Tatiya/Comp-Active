import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { ActivityTag } from './entities/activity-tag.entity';
import { ActivityCondition } from './entities/activity-condition.entity';
import { ActivityBenefit } from './entities/activity-benefit.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ActivityFilterDto } from './dto/activity-filter.dto';
import { ActivityStatus, ApprovalStatus } from '../common/enums/status.enum';
import { UserRole } from '../common/enums/role.enum';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(ActivityTag)
    private readonly tagRepository: Repository<ActivityTag>,
    @InjectRepository(ActivityCondition)
    private readonly conditionRepository: Repository<ActivityCondition>,
    @InjectRepository(ActivityBenefit)
    private readonly benefitRepository: Repository<ActivityBenefit>,
  ) {}

  /**
   * สร้างกิจกรรมใหม่ (Organizer)
   * สถานะเริ่มต้น = pending_approval
   */
  async create(
    organizerId: number,
    createDto: CreateActivityDto,
  ): Promise<Activity> {
    this.logger.debug(`Creating activity with data: ${JSON.stringify(createDto)}`);
    const { tags, conditions, benefits, ...activityData } = createDto;

    // Use a transaction to ensure all related records are saved
    return await this.activityRepository.manager.transaction(async (manager) => {
      // สร้าง Activity
      const activity = manager.create(Activity, {
        ...activityData,
        organizerId,
        approvalStatus: ApprovalStatus.PENDING,
      });

      const savedActivity = await manager.save(Activity, activity);

      // สร้าง Tags
      if (tags?.length) {
        const tagEntities = tags.map((tagName) =>
          manager.create(ActivityTag, { activityId: savedActivity.id, tagName }),
        );
        await manager.save(ActivityTag, tagEntities);
      }

      // สร้าง Conditions
      if (conditions?.length) {
        const conditionEntities = conditions.map((conditionText) =>
          manager.create(ActivityCondition, {
            activityId: savedActivity.id,
            conditionText,
          }),
        );
        await manager.save(ActivityCondition, conditionEntities);
      }

      // สร้าง Benefits
      if (benefits?.length) {
        const benefitEntities = benefits.map((benefitText) =>
          manager.create(ActivityBenefit, {
            activityId: savedActivity.id,
            benefitText,
          }),
        );
        await manager.save(ActivityBenefit, benefitEntities);
      }

      this.logger.log(
        `Activity created successfully: "${savedActivity.name}" (ID: ${savedActivity.id})`,
      );

      const finalActivity = await manager.findOne(Activity, {
        where: { id: savedActivity.id },
        relations: ['tags', 'conditions', 'benefits', 'organizer'],
      });

      if (!finalActivity) {
        throw new NotFoundException(`Activity with ID ${savedActivity.id} not found after creation`);
      }

      return finalActivity;
    });
  }

  /**
   * ดึงกิจกรรมทั้งหมดที่ approved (Public)
   */
  async findAllApproved(filterDto?: ActivityFilterDto): Promise<Activity[]> {
    const query = this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.tags', 'tags')
      .leftJoinAndSelect('activity.conditions', 'conditions')
      .leftJoinAndSelect('activity.benefits', 'benefits')
      .leftJoinAndSelect('activity.organizer', 'organizer')
      .loadRelationCountAndMap('activity.registeredCount', 'activity.registrations')
      .where('activity.approvalStatus = :status', {
        status: ApprovalStatus.APPROVED,
      })
      .select([
        'activity',
        'tags',
        'conditions',
        'benefits',
        'organizer.id',
        'organizer.name',
        'organizer.email',
      ]);

    if (filterDto?.search) {
      query.andWhere('activity.name ILIKE :search', {
        search: `%${filterDto.search}%`,
      });
    }

    if (filterDto?.category) {
      query.andWhere('activity.category = :category', {
        category: filterDto.category,
      });
    }

    if (filterDto?.status) {
      query.andWhere('activity.status = :actStatus', {
        actStatus: filterDto.status,
      });
    }

    return query.orderBy('activity.date', 'ASC').getMany();
  }

  /**
   * ดึงกิจกรรมตาม ID
   */
  async findById(id: number): Promise<Activity> {
    const activity = await this.activityRepository.findOne({
      where: { id },
      relations: ['tags', 'conditions', 'benefits', 'organizer', 'registrations', 'registrations.student', 'registrations.evaluation'],
    });
    
    if (!activity) {
      throw new NotFoundException(`ไม่พบกิจกรรม ID: ${id}`);
    }
    
    return activity;
  }

  /**
   * ดึงกิจกรรมของ Organizer
   */
  async findByOrganizer(organizerId: number): Promise<Activity[]> {
    return this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.tags', 'tags')
      .leftJoinAndSelect('activity.conditions', 'conditions')
      .leftJoinAndSelect('activity.benefits', 'benefits')
      .loadRelationCountAndMap(
        'activity.registeredCount',
        'activity.registrations',
      )
      .where('activity.organizerId = :organizerId', { organizerId })
      .orderBy('activity.createdAt', 'DESC')
      .getMany();
  }

  /**
   * แก้ไขกิจกรรม (Organizer owner หรือ Admin)
   */
  async update(
    activityId: number,
    userId: number,
    userRole: UserRole,
    updateDto: UpdateActivityDto,
  ): Promise<Activity> {
    const activity = await this.findById(activityId);

    // ตรวจสอบสิทธิ์
    if (userRole !== UserRole.ADMIN && activity.organizerId !== userId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขกิจกรรมนี้');
    }

    const { tags, conditions, benefits, ...activityData } = updateDto;

    return await this.activityRepository.manager.transaction(async (manager) => {
      // 1. Update basic activity data
      Object.assign(activity, activityData);
      await manager.save(Activity, activity);

      // 2. Update Tags
      if (tags !== undefined) {
        await manager.delete(ActivityTag, { activityId: activityId });
        if (tags.length) {
          const tagEntities = tags.map((tagName) =>
            manager.create(ActivityTag, { activityId, tagName }),
          );
          await manager.save(ActivityTag, tagEntities);
        }
      }

      // 3. Update Conditions
      if (conditions !== undefined) {
        await manager.delete(ActivityCondition, { activityId: activityId });
        if (conditions.length) {
          const conditionEntities = conditions.map((conditionText) =>
            manager.create(ActivityCondition, { activityId, conditionText }),
          );
          await manager.save(ActivityCondition, conditionEntities);
        }
      }

      // 4. Update Benefits
      if (benefits !== undefined) {
        await manager.delete(ActivityBenefit, { activityId: activityId });
        if (benefits.length) {
          const benefitEntities = benefits.map((benefitText) =>
            manager.create(ActivityBenefit, { activityId, benefitText }),
          );
          await manager.save(ActivityBenefit, benefitEntities);
        }
      }

      this.logger.log(`Activity updated: "${activity.name}" (ID: ${activityId})`);

      const updated = await manager.findOne(Activity, {
        where: { id: activityId },
        relations: ['tags', 'conditions', 'benefits', 'organizer', 'registrations'],
      });

      if (!updated) {
        throw new NotFoundException(`Activity with ID ${activityId} not found after update`);
      }

      return updated;
    });
  }

  /**
   * ลบกิจกรรม
   */
  async delete(
    activityId: number,
    userId: number,
    userRole: UserRole,
  ): Promise<void> {
    const activity = await this.findById(activityId);

    if (userRole !== UserRole.ADMIN && activity.organizerId !== userId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ลบกิจกรรมนี้');
    }

    await this.activityRepository.remove(activity);
    this.logger.log(`Activity deleted: "${activity.name}" (ID: ${activityId})`);
  }

  /**
   * ดึงกิจกรรมที่รอการอนุมัติ (Admin)
   */
  async findPendingApproval(): Promise<Activity[]> {
    return this.activityRepository.find({
      where: { approvalStatus: ApprovalStatus.PENDING },
      relations: ['tags', 'conditions', 'benefits', 'organizer'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * อนุมัติกิจกรรม (Admin)
   */
  async approve(activityId: number): Promise<Activity> {
    const activity = await this.findById(activityId);
    activity.approvalStatus = ApprovalStatus.APPROVED;
    activity.rejectionReason = null;
    const savedActivity = await this.activityRepository.save(activity);
    this.logger.log(`Activity approved: "${activity.name}" (ID: ${activityId})`);
    return savedActivity;
  }

  /**
   * ปฏิเสธกิจกรรม (Admin)
   */
  async reject(activityId: number, reason: string): Promise<Activity> {
    const activity = await this.findById(activityId);
    activity.approvalStatus = ApprovalStatus.REJECTED;
    activity.rejectionReason = reason;
    const savedActivity = await this.activityRepository.save(activity);
    this.logger.log(`Activity rejected: "${activity.name}" (ID: ${activityId})`);
    return savedActivity;
  }

  /**
   * นับจำนวนกิจกรรมทั้งหมด
   */
  async countAll(): Promise<number> {
    return this.activityRepository.count();
  }

  /**
   * นับจำนวนกิจกรรมที่รอการอนุมัติ
   */
  async countPending(): Promise<number> {
    return this.activityRepository.count({
      where: { approvalStatus: ApprovalStatus.PENDING },
    });
  }

  /**
   * ดึงกิจกรรมทั้งหมด (Admin - ไม่กรอง approval)
   */
  /**
   * ร้องขอการยกเลิกกิจกรรม (Organizer)
   */
  async requestCancellation(
    activityId: number,
    organizerId: number,
    reason: string,
  ): Promise<Activity> {
    const activity = await this.findById(activityId);

    if (activity.organizerId !== organizerId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ยกเลิกกิจกรรมนี้');
    }

    // ถ้าไม่มีคนลงทะเบียน หรือกิจกรรมยังไม่ถูก approve สามารถยกเลิกได้ทันที
    if (
      activity.registrations.length === 0 ||
      activity.approvalStatus !== ApprovalStatus.APPROVED
    ) {
      activity.approvalStatus = ApprovalStatus.REJECTED;
      activity.status = ActivityStatus.CLOSED;
      activity.cancellationReason = reason;
      return this.activityRepository.save(activity);
    }

    // มีคนลงทะเบียนแล้ว ต้องรอ Admin อนุมัติ
    activity.approvalStatus = ApprovalStatus.PENDING_CANCEL;
    activity.cancellationReason = reason;
    const saved = await this.activityRepository.save(activity);
    this.logger.log(`Cancellation requested: "${activity.name}" (ID: ${activityId})`);
    return saved;
  }

  /**
   * ดึงรายการที่รอยกเลิก (Admin)
   */
  async findPendingCancellation(): Promise<Activity[]> {
    return this.activityRepository.find({
      where: { approvalStatus: ApprovalStatus.PENDING_CANCEL },
      relations: ['organizer', 'registrations'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * อนุมัติการยกเลิกกิจกรรม (Admin)
   */
  async approveCancellation(activityId: number): Promise<Activity> {
    const activity = await this.findById(activityId);
    if (activity.approvalStatus !== ApprovalStatus.PENDING_CANCEL) {
      throw new BadRequestException('กิจกรรมนี้ไม่ได้อยู่ระหว่างการขอรอยกเลิก');
    }

    activity.approvalStatus = ApprovalStatus.REJECTED;
    activity.status = ActivityStatus.CLOSED;
    const saved = await this.activityRepository.save(activity);
    this.logger.log(`Cancellation approved by Admin: "${activity.name}" (ID: ${activityId})`);
    return saved;
  }

  /**
   * ดึงสถิติสำหรับผู้จัดงาน
   */
  async getOrganizerStats(organizerId: number) {
    const activities = await this.activityRepository.find({
      where: { organizerId },
      relations: ['registrations'],
    });

    const totalActivities = activities.length;
    const activeActivities = activities.filter(
      (a) => a.approvalStatus === ApprovalStatus.APPROVED,
    ).length;
    const totalRegistrations = activities.reduce(
      (sum, a) => sum + (a.registrations?.length || 0),
      0,
    );
    const pendingApprovals = activities.filter(
      (a) => a.approvalStatus === ApprovalStatus.PENDING,
    ).length;

    return {
      totalActivities,
      activeActivities,
      totalRegistrations,
      pendingApprovals,
    };
  }

  /**
   * ดึงสถิติรวมของแพลตฟอร์ม
   */
  async getPlatformStats() {
    const totalActivities = await this.activityRepository.count({
      where: { approvalStatus: ApprovalStatus.APPROVED },
    });

    // ในระบบจริงอาจจะนับจากตาราง User ที่มีบทบาท STUDENT
    // แต่เพื่อความง่าย เราจะนับผู้ที่เคยสมัครกิจกรรมอย่างน้อย 1 ครั้ง
    const result = await this.activityRepository
      .createQueryBuilder('activity')
      .leftJoin('activity.registrations', 'registration')
      .select('COUNT(DISTINCT registration.studentId)', 'totalStudents')
      .getRawOne();

    return {
      totalActivities,
      totalParticipants: parseInt(result.totalStudents) || 0,
    };
  }
}
