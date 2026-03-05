import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EvaluationsService } from './evaluations.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/role.enum';

@ApiTags('Evaluations')
@Controller('api/evaluations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  /**
   * POST /api/evaluations - สร้างหรืออัปเดตการประเมิน (Organizer)
   */
  @Post()
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'ประเมินผลทักษะให้นักศึกษา (Organizer / Admin)' })
  async create(
    @CurrentUser('id') userId: number,
    @Body() createDto: CreateEvaluationDto,
  ) {
    return this.evaluationsService.create(userId, createDto);
  }

  /**
   * GET /api/evaluations/my-skills - ดูคะแนนทักษะของตนเอง (Student)
   */
  @Get('my-skills')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'ดูคะแนนทักษะและ Gamification ของตนเอง (Student)' })
  async getMySkills(@CurrentUser('id') userId: number) {
    return this.evaluationsService.getMySkills(userId);
  }

  /**
   * GET /api/evaluations/activity/:id - ดูผลการประเมินของกิจกรรม (Organizer)
   */
  @Get('activity/:id')
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'ดูผลการประเมินทั้งหมดในกิจกรรมนั้นๆ (Organizer)' })
  async findByActivity(@Param('id', ParseIntPipe) activityId: number) {
    return this.evaluationsService.findByActivity(activityId);
  }
}
