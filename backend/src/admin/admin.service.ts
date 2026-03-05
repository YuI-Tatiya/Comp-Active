import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { ActivitiesService } from '../activities/activities.service';
import { RegistrationsService } from '../registrations/registrations.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly activitiesService: ActivitiesService,
    private readonly registrationsService: RegistrationsService,
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
}
