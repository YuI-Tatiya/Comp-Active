import { Controller, Get, Patch, Body, Param, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizerRequestsService } from '../shared/admin-dashboard/organizer-request.service';
import { ApproveOrganizerRequestDto } from '../shared/admin-dashboard/dto/approve-organizer-request.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Organizer Requests')
@Controller('api/organizer-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class OrganizerRequestAdminController {
  constructor(private readonly service: OrganizerRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'ดูคำขอทั้งหมด (Admin)' })
  findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'อนุมัติคำขอ (Admin)' })
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveOrganizerRequestDto,
    @CurrentUser('id') adminId: number,
  ) {
    return this.service.approve(id, dto.validDays, adminId);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'ปฏิเสธคำขอ (Admin)' })
  reject(@Param('id', ParseIntPipe) id: number, @Body('reason') reason: string) {
    return this.service.reject(id, reason);
  }

  @Get('pending-count')
  @ApiOperation({ summary: 'จำนวนคำขอที่รออนุมัติ (Admin)' })
  countPending() {
    return this.service.countPending();
  }
}
