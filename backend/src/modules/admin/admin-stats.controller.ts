import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminStatsService } from './admin-stats.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminIpGuard } from '../../common/guards/admin-ip.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Admin Dashboard')
@Controller('api/admin')
@UseGuards(AdminIpGuard, JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminStatsController {
  constructor(private readonly adminStatsService: AdminStatsService) {}

  /**
   * GET /api/admin/dashboard/stats - สถิติรวมสำหรับ Dashboard
   */
  @Get('dashboard/stats')
  @ApiOperation({ summary: 'ดูสถิติ Dashboard (Admin)' })
  async getDashboardStats() {
    return this.adminStatsService.getDashboardStats();
  }

  /**
   * GET /api/admin/analytics/skills - ค่าเฉลี่ยคะแนนทักษะ 5 ด้านของทั้งแพลตฟอร์ม
   */
  @Get('analytics/skills')
  @ApiOperation({ summary: 'ดูค่าเฉลี่ยคะแนนทักษะของทั้งแพลตฟอร์ม (Admin)' })
  async getSkillsAnalytics() {
    return this.adminStatsService.getSkillsAnalytics();
  }
}
