import { Controller, Get, Patch, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RegistrationsService } from '../shared/registrations/registrations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Registrations')
@Controller('api/registrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ORGANIZER, UserRole.ADMIN)
@ApiBearerAuth()
export class RegistrationsOrganizerController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  /**
   * GET /api/registrations/activity/:id - ดูรายชื่อผู้สมัคร (Organizer)
   */
  @Get('activity/:id')
  @ApiOperation({ summary: 'ดูรายชื่อผู้สมัครของกิจกรรม (Organizer)' })
  async findByActivity(@Param('id', ParseIntPipe) activityId: number) {
    return this.registrationsService.findByActivity(activityId);
  }

  /**
   * PATCH /api/registrations/:id/confirm - ยืนยันผู้เข้าร่วม (Organizer)
   */
  @Patch(':id/confirm')
  @ApiOperation({ summary: 'ยืนยันผู้เข้าร่วม (Organizer)' })
  async confirm(@Param('id', ParseIntPipe) id: number) {
    return this.registrationsService.confirm(id);
  }

  /**
   * PATCH /api/registrations/:id/check-in - เช็คอิน (Organizer)
   */
  @Patch(':id/check-in')
  @ApiOperation({ summary: 'เช็คอินเข้าร่วมกิจกรรม (Organizer)' })
  async checkIn(@Param('id', ParseIntPipe) id: number) {
    return this.registrationsService.checkIn(id);
  }
}
