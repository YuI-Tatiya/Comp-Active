import { Controller, Get, Patch, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ActivitiesService } from '../shared/activities/activities.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Activities')
@Controller('api/activities')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class ActivitiesAdminController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  /**
   * GET /api/activities/pending - ดูกิจกรรมที่รอการอนุมัติ (Admin)
   */
  @Get('pending')
  @ApiOperation({ summary: 'ดูกิจกรรมที่รอการอนุมัติ (Admin)' })
  async findPendingApproval() {
    return this.activitiesService.findPendingApproval();
  }

  /**
   * GET /api/activities/pending-cancel - ดูรายการรอยกเลิก (Admin)
   */
  @Get('pending-cancel')
  @ApiOperation({ summary: 'ดูรายการรอยกเลิก (Admin)' })
  async findPendingCancellation() {
    return this.activitiesService.findPendingCancellation();
  }

  /**
   * PATCH /api/activities/:id/approve - อนุมัติกิจกรรม (Admin)
   */
  @Patch(':id/approve')
  @ApiOperation({ summary: 'อนุมัติกิจกรรม (Admin)' })
  async approve(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.approve(id);
  }

  /**
   * PATCH /api/activities/:id/reject - ปฏิเสธกิจกรรม (Admin)
   */
  @Patch(':id/reject')
  @ApiOperation({ summary: 'ปฏิเสธกิจกรรม (Admin)' })
  async reject(@Param('id', ParseIntPipe) id: number, @Body('reason') reason: string) {
    return this.activitiesService.reject(id, reason);
  }

  /**
   * PATCH /api/activities/:id/approve-cancel - อนุมัติการยกเลิกกิจกรรม (Admin)
   */
  @Patch(':id/approve-cancel')
  @ApiOperation({ summary: 'อนุมัติการยกเลิกกิจกรรม (Admin)' })
  async approveCancellation(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.approveCancellation(id);
  }
}
