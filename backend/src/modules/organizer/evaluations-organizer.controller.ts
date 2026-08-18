import { Controller, Get, Patch, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EvaluationsService } from '../shared/registrations/evaluation.service';
import { UpdateEvaluationDto } from '../shared/registrations/dto/update-evaluation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Evaluations')
@Controller('api/evaluations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ORGANIZER, UserRole.ADMIN)
@ApiBearerAuth()
export class EvaluationsOrganizerController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  /**
   * PATCH /api/evaluations/:registrationId - แก้ไขคะแนนที่ระบบให้อัตโนมัติตอนเช็คอิน (Organizer / Admin)
   */
  @Patch(':registrationId')
  @ApiOperation({ summary: 'แก้ไขคะแนน Soft Skills ที่ระบบให้อัตโนมัติ (Organizer / Admin)' })
  async override(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: UserRole,
    @Param('registrationId', ParseIntPipe) registrationId: number,
    @Body() dto: UpdateEvaluationDto,
  ) {
    return this.evaluationsService.override(userId, userRole, registrationId, dto);
  }

  /**
   * GET /api/evaluations/activity/:id - ดูผลการประเมินของกิจกรรม (Organizer)
   */
  @Get('activity/:id')
  @ApiOperation({ summary: 'ดูผลการประเมินทั้งหมดในกิจกรรมนั้นๆ (Organizer)' })
  async findByActivity(@Param('id', ParseIntPipe) activityId: number) {
    return this.evaluationsService.findByActivity(activityId);
  }
}
