import { Controller, Get, Post, Delete, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RegistrationsService } from '../shared/registrations/registrations.service';
import { CreateRegistrationDto } from '../shared/registrations/dto/create-registration.dto';
import { SubmitSurveyDto } from '../shared/registrations/dto/submit-survey.dto';
import type { Viewer } from '../shared/events/event-visibility.util';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Registrations')
@Controller('api/registrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@ApiBearerAuth()
export class RegistrationsStudentController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  /**
   * POST /api/registrations - ลงทะเบียนเข้าร่วมกิจกรรม (Student)
   */
  @Post()
  @ApiOperation({ summary: 'ลงทะเบียนเข้าร่วมกิจกรรม (Student)' })
  async create(
    @CurrentUser('id') studentId: number,
    @CurrentUser() viewer: Viewer,
    @Body() createDto: CreateRegistrationDto,
  ) {
    return this.registrationsService.create(studentId, createDto.activityId, viewer, createDto.answers);
  }

  /**
   * DELETE /api/registrations/:id - ยกเลิกการลงทะเบียน (Student)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'ยกเลิกการลงทะเบียน (Student)' })
  async cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') studentId: number) {
    await this.registrationsService.cancel(id, studentId);
    return { message: 'ยกเลิกการลงทะเบียนสำเร็จ' };
  }

  /**
   * GET /api/registrations/my - ดูประวัติการลงทะเบียน (Student)
   */
  @Get('my')
  @ApiOperation({ summary: 'ดูประวัติการลงทะเบียน (Student)' })
  async findMy(@CurrentUser('id') studentId: number) {
    return this.registrationsService.findByStudent(studentId);
  }

  /**
   * GET /api/registrations/:id/survey-questions - ดูคำถามแบบสำรวจของงาน (Student, ต้องเช็คอินแล้ว)
   */
  @Get(':id/survey-questions')
  @ApiOperation({ summary: 'ดูคำถามแบบสำรวจความพึงพอใจ (Student)' })
  async getSurveyQuestions(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') studentId: number) {
    return this.registrationsService.getSurveyQuestions(id, studentId);
  }

  /**
   * POST /api/registrations/:id/survey - ส่งแบบสำรวจความพึงพอใจ (Student, ครั้งเดียว)
   */
  @Post(':id/survey')
  @ApiOperation({ summary: 'ส่งแบบสำรวจความพึงพอใจ (Student)' })
  async submitSurvey(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') studentId: number,
    @Body() dto: SubmitSurveyDto,
  ) {
    return this.registrationsService.submitSurvey(id, studentId, dto.answers);
  }
}
