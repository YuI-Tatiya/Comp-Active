import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../shared/users/users.service';
import { ActivitiesService } from '../shared/activities/activities.service';
import { RegistrationsService } from '../shared/registrations/registrations.service';
import { EvaluationsRepository } from '../shared/registrations/evaluation.repository';

@Injectable()
export class AdminStatsService {
  private readonly logger = new Logger(AdminStatsService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly activitiesService: ActivitiesService,
    private readonly registrationsService: RegistrationsService,
    private readonly evaluationsRepository: EvaluationsRepository,
  ) {}

  /**
   * ดึงสถิติ Dashboard สำหรับ Admin
   */
  async getDashboardStats() {
    const [totalUsers, totalActivities, totalRegistrations, pendingActivities, usersByRole] =
      await Promise.all([
        this.usersService.countAll(),
        this.activitiesService.countAll(),
        this.registrationsService.countAll(),
        this.activitiesService.countPending(),
        this.usersService.countByRole(),
      ]);

    return {
      totalUsers,
      totalActivities,
      totalRegistrations,
      pendingActivities,
      usersByRole,
    };
  }

  /**
   * ค่าเฉลี่ยคะแนนทักษะ 5 ด้านของทั้งแพลตฟอร์ม (รวมจาก Evaluation ที่มีอยู่แล้ว — ไม่มี schema ใหม่)
   */
  async getSkillsAnalytics() {
    const result = await this.evaluationsRepository.aggregateSkills();

    return {
      totalEvaluations: result._count,
      averages: {
        teamwork: result._avg.teamwork ?? 0,
        leadership: result._avg.leadership ?? 0,
        communication: result._avg.communication ?? 0,
        problemSolving: result._avg.problemSolving ?? 0,
        adaptability: result._avg.adaptability ?? 0,
      },
    };
  }
}
