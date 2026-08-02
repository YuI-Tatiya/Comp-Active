import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EvaluationsService } from '../shared/registrations/evaluation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Evaluations')
@Controller('api/evaluations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@ApiBearerAuth()
export class EvaluationsStudentController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  /**
   * GET /api/evaluations/my-skills - ดูคะแนนทักษะของตนเอง (Student)
   */
  @Get('my-skills')
  @ApiOperation({ summary: 'ดูคะแนนทักษะและ Gamification ของตนเอง (Student)' })
  async getMySkills(@CurrentUser('id') userId: number) {
    return this.evaluationsService.getMySkills(userId);
  }
}
