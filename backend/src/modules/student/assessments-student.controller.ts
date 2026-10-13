import { Controller, Get, Post, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AssessmentsService } from '../shared/registrations/assessment.service';
import { SubmitAssessmentDto } from '../shared/registrations/dto/submit-assessment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Assessments')
@Controller('api/assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@ApiBearerAuth()
export class AssessmentsStudentController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  /**
   * GET /api/assessments/registration/:registrationId - ใบงานประเมินตนเอง/เพื่อนของฉันในกิจกรรมนี้ (Student, ต้องเช็คอินแล้ว)
   */
  @Get('registration/:registrationId')
  @ApiOperation({ summary: 'ดูใบงานประเมินตนเองและเพื่อน (Student)' })
  async getMyTasks(
    @Param('registrationId', ParseIntPipe) registrationId: number,
    @CurrentUser('id') studentId: number,
  ) {
    return this.assessmentsService.getMyTasks(studentId, registrationId);
  }

  /**
   * POST /api/assessments/:assignmentId - ส่งใบประเมิน 1 ใบ (Student, ครั้งเดียวต่อใบ)
   */
  @Post(':assignmentId')
  @ApiOperation({ summary: 'ส่งใบประเมินตนเอง/เพื่อน (Student)' })
  async submit(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @CurrentUser('id') studentId: number,
    @Body() dto: SubmitAssessmentDto,
  ) {
    return this.assessmentsService.submit(studentId, assignmentId, dto);
  }
}
