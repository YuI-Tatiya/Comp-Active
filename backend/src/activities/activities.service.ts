import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ActivityFilterDto } from './dto/activity-filter.dto';
import { ActivityStatus, ApprovalStatus } from '../common/enums/status.enum';
import { UserRole } from '../common/enums/role.enum';

const activityInclude = {
  tags: true,
  conditions: true,
  benefits: true,
  softSkills: true,
  organizer: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(organizerId: number, createDto: CreateActivityDto) {
    const { tags, conditions, benefits, softSkills, date, ...activityData } = createDto;

    const activity = await this.prisma.activity.create({
      data: {
        ...activityData,
        date: new Date(date),
        organizerId,
        approvalStatus: ApprovalStatus.APPROVED as any,
        tags: { create: tags?.map((tagName) => ({ tagName })) ?? [] },
        conditions: { create: conditions?.map((conditionText) => ({ conditionText })) ?? [] },
        benefits: { create: benefits?.map((benefitText) => ({ benefitText })) ?? [] },
        softSkills: { create: softSkills?.map((skillName) => ({ skillName })) ?? [] },
      },
      include: { ...activityInclude, registrations: true },
    });

    this.logger.log(`Activity created: "${activity.name}" (ID: ${activity.id})`);
    return activity;
  }

  async findAllApproved(filterDto?: ActivityFilterDto) {
    const activities = await this.prisma.activity.findMany({
      where: {
        approvalStatus: ApprovalStatus.APPROVED as any,
        ...(filterDto?.search && {
          name: { contains: filterDto.search, mode: 'insensitive' },
        }),
        ...(filterDto?.category && { category: filterDto.category }),
        ...(filterDto?.status && { status: filterDto.status as any }),
      },
      include: {
        ...activityInclude,
        _count: { select: { registrations: true } },
      },
      orderBy: { date: 'asc' },
    });

    return activities.map(({ _count, ...a }) => ({
      ...a,
      registeredCount: _count.registrations,
    }));
  }

  async findById(id: number) {
    const activity = await this.prisma.activity.findUnique({
      where: { id },
      include: {
        ...activityInclude,
        registrations: {
          include: {
            student: true,
            evaluation: true,
          },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException(`ไม่พบกิจกรรม ID: ${id}`);
    }

    return activity;
  }

  async findByOrganizer(organizerId: number) {
    const activities = await this.prisma.activity.findMany({
      where: { organizerId },
      include: {
        tags: true,
        conditions: true,
        benefits: true,
        softSkills: true,
        _count: { select: { registrations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return activities.map(({ _count, ...a }) => ({
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

    return this.prisma.$transaction(async (tx) => {
      await tx.activity.update({
        where: { id: activityId },
        data: {
          ...activityData,
          ...(date && { date: new Date(date) }),
        },
      });

      if (tags !== undefined) {
        await tx.activityTag.deleteMany({ where: { activityId } });
        if (tags.length) {
          await tx.activityTag.createMany({
            data: tags.map((tagName) => ({ activityId, tagName })),
          });
        }
      }

      if (conditions !== undefined) {
        await tx.activityCondition.deleteMany({ where: { activityId } });
        if (conditions.length) {
          await tx.activityCondition.createMany({
            data: conditions.map((conditionText) => ({ activityId, conditionText })),
          });
        }
      }

      if (benefits !== undefined) {
        await tx.activityBenefit.deleteMany({ where: { activityId } });
        if (benefits.length) {
          await tx.activityBenefit.createMany({
            data: benefits.map((benefitText) => ({ activityId, benefitText })),
          });
        }
      }

      if (softSkills !== undefined) {
        await tx.activitySoftSkill.deleteMany({ where: { activityId } });
        if (softSkills.length) {
          await tx.activitySoftSkill.createMany({
            data: softSkills.map((skillName) => ({ activityId, skillName })),
          });
        }
      }

      const updated = await tx.activity.findUnique({
        where: { id: activityId },
        include: { ...activityInclude, registrations: true },
      });

      this.logger.log(`Activity updated: "${activity.name}" (ID: ${activityId})`);
      return updated;
    });
  }

  async delete(activityId: number, userId: number, userRole: UserRole) {
    const activity = await this.findById(activityId);

    if (userRole !== UserRole.ADMIN && activity.organizerId !== userId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ลบกิจกรรมนี้');
    }

    await this.prisma.activity.delete({ where: { id: activityId } });
    this.logger.log(`Activity deleted: "${activity.name}" (ID: ${activityId})`);
  }

  async findPendingApproval() {
    return this.prisma.activity.findMany({
      where: { approvalStatus: ApprovalStatus.PENDING as any },
      include: activityInclude,
      orderBy: { createdAt: 'asc' },
    });
  }

  async approve(activityId: number) {
    const activity = await this.prisma.activity.update({
      where: { id: activityId },
      data: {
        approvalStatus: ApprovalStatus.APPROVED as any,
        rejectionReason: null,
      },
      include: { ...activityInclude, registrations: true },
    });
    this.logger.log(`Activity approved: "${activity.name}" (ID: ${activityId})`);
    return activity;
  }

  async reject(activityId: number, reason: string) {
    const activity = await this.prisma.activity.update({
      where: { id: activityId },
      data: {
        approvalStatus: ApprovalStatus.REJECTED as any,
        rejectionReason: reason,
      },
      include: { ...activityInclude, registrations: true },
    });
    this.logger.log(`Activity rejected: "${activity.name}" (ID: ${activityId})`);
    return activity;
  }

  async countAll() {
    return this.prisma.activity.count();
  }

  async countPending() {
    return this.prisma.activity.count({
      where: { approvalStatus: ApprovalStatus.PENDING as any },
    });
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
      return this.prisma.activity.update({
        where: { id: activityId },
        data: {
          approvalStatus: ApprovalStatus.REJECTED as any,
          status: ActivityStatus.CLOSED as any,
          cancellationReason: reason,
        },
        include: { ...activityInclude, registrations: true },
      });
    }

    const saved = await this.prisma.activity.update({
      where: { id: activityId },
      data: {
        approvalStatus: ApprovalStatus.PENDING_CANCEL as any,
        cancellationReason: reason,
      },
      include: { ...activityInclude, registrations: true },
    });
    this.logger.log(`Cancellation requested: "${activity.name}" (ID: ${activityId})`);
    return saved;
  }

  async findPendingCancellation() {
    return this.prisma.activity.findMany({
      where: { approvalStatus: ApprovalStatus.PENDING_CANCEL as any },
      include: {
        organizer: { select: { id: true, name: true, email: true } },
        registrations: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveCancellation(activityId: number) {
    const activity = await this.findById(activityId);
    if (activity.approvalStatus !== ApprovalStatus.PENDING_CANCEL) {
      throw new BadRequestException('กิจกรรมนี้ไม่ได้อยู่ระหว่างการขอรอยกเลิก');
    }

    const saved = await this.prisma.activity.update({
      where: { id: activityId },
      data: {
        approvalStatus: ApprovalStatus.REJECTED as any,
        status: ActivityStatus.CLOSED as any,
      },
      include: { ...activityInclude, registrations: true },
    });
    this.logger.log(`Cancellation approved by Admin: "${activity.name}" (ID: ${activityId})`);
    return saved;
  }

  async getOrganizerStats(organizerId: number) {
    const activities = await this.prisma.activity.findMany({
      where: { organizerId },
      include: { _count: { select: { registrations: true } } },
    });

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
    const totalActivities = await this.prisma.activity.count({
      where: { approvalStatus: ApprovalStatus.APPROVED as any },
    });

    const distinctStudents = await this.prisma.registration.findMany({
      distinct: ['studentId'],
      select: { studentId: true },
    });

    return {
      totalActivities,
      totalParticipants: distinctStudents.length,
    };
  }
}
