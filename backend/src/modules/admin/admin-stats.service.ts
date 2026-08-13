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
    const [totalUsers, totalActivities, totalRegistrations, usersByRole] =
      await Promise.all([
        this.usersService.countAll(),
        this.activitiesService.countAll(),
        this.registrationsService.countAll(),
        this.usersService.countByRole(),
      ]);

    return {
      totalUsers,
      totalActivities,
      totalRegistrations,
      usersByRole,
    };
  }

  /**
   * ค่าเฉลี่ยคะแนนทักษะ 12 ด้านของทั้งแพลตฟอร์ม (รวมจาก Evaluation ที่มีอยู่แล้ว — ไม่มี schema ใหม่)
   */
  async getSkillsAnalytics() {
    const result = await this.evaluationsRepository.aggregateSkills();

    return {
      totalEvaluations: result._count,
      averages: {
        communication: result._avg.communication ?? 0,
        timeManagement: result._avg.timeManagement ?? 0,
        flexibilityAdaptability: result._avg.flexibilityAdaptability ?? 0,
        teamworkCollaboration: result._avg.teamworkCollaboration ?? 0,
        analyticCriticalThinking: result._avg.analyticCriticalThinking ?? 0,
        decisionMaking: result._avg.decisionMaking ?? 0,
        creativity: result._avg.creativity ?? 0,
        complexProblemSolving: result._avg.complexProblemSolving ?? 0,
        curiosityLifelongLearning: result._avg.curiosityLifelongLearning ?? 0,
        negotiationPersuasion: result._avg.negotiationPersuasion ?? 0,
        leadership: result._avg.leadership ?? 0,
        positiveAttitude: result._avg.positiveAttitude ?? 0,
      },
    };
  }
}
