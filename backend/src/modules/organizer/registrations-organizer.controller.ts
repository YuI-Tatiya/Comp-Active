import { Controller, Get, Patch, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RegistrationsService } from '../shared/registrations/registrations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Registrations')
@Controller('api/registrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ORGANIZER, UserRole.ADMIN)
@ApiBearerAuth()
export class RegistrationsOrganizerController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  /**
   * GET /api/registrations/activity/:id - ดูรายชื่อผู้สมัคร (เจ้าของกิจกรรม / Admin)
   */
  @Get('activity/:id')
  @ApiOperation({ summary: 'ดูรายชื่อผู้สมัครของกิจกรรม (เจ้าของกิจกรรม / Admin)' })
  async findByActivity(
    @Param('id', ParseIntPipe) activityId: number,
    @CurrentUser('id') callerId: number,
    @CurrentUser('role') callerRole: UserRole,
  ) {
    return this.registrationsService.findByActivity(callerId, callerRole, activityId);
  }

  /**
   * PATCH /api/registrations/:id/confirm - ยืนยันผู้เข้าร่วม (เจ้าของกิจกรรม / Admin)
   */
  @Patch(':id/confirm')
  @ApiOperation({ summary: 'ยืนยันผู้เข้าร่วม (เจ้าของกิจกรรม / Admin)' })
  async confirm(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') callerId: number,
    @CurrentUser('role') callerRole: UserRole,
  ) {
    return this.registrationsService.confirm(callerId, callerRole, id);
  }

  /**
   * PATCH /api/registrations/:id/check-in - เช็คอิน (เจ้าของกิจกรรม / Admin) — สำหรับเช็คอินแทนด้วยมือ เช่น ค้นหาด้วยรหัสนักศึกษา
   */
  @Patch(':id/check-in')
  @ApiOperation({ summary: 'เช็คอินเข้าร่วมกิจกรรมแทนผู้เข้าร่วม (เจ้าของกิจกรรม / Admin)' })
  async checkIn(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') callerId: number,
    @CurrentUser('role') callerRole: UserRole,
  ) {
    return this.registrationsService.checkIn(callerId, callerRole, id);
  }
}
