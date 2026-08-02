import { Controller, Get, Post, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EvaluationsService } from '../shared/registrations/evaluation.service';
import { CreateEvaluationDto } from '../shared/registrations/dto/create-evaluation.dto';
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
   * POST /api/evaluations - สร้างหรืออัปเดตการประเมิน (Organizer)
   */
  @Post()
  @ApiOperation({ summary: 'ประเมินผลทักษะให้นักศึกษา (Organizer / Admin)' })
  async create(@CurrentUser('id') userId: number, @Body() createDto: CreateEvaluationDto) {
    return this.evaluationsService.create(userId, createDto);
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
