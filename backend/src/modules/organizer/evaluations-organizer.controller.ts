import { Controller, Get, Patch, Post, Put, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EvaluationsService } from '../shared/registrations/evaluation.service';
import { EvaluationBatchService } from '../shared/registrations/evaluation-batch.service';
import { AssessmentsService } from '../shared/registrations/assessment.service';
import { EvaluationApprovalService } from '../shared/registrations/evaluation-approval.service';
import { UpdateEvaluationDto } from '../shared/registrations/dto/update-evaluation.dto';
import { SaveBatchEvaluationDto } from '../shared/registrations/dto/save-batch-evaluation.dto';
import { SetAssessmentModeDto } from '../shared/registrations/dto/set-assessment-mode.dto';
import { ApproveEvaluationDto } from '../shared/registrations/dto/approve-evaluation.dto';
import { ApproveReadyDto } from '../shared/registrations/dto/approve-ready.dto';
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
  constructor(
    private readonly evaluationsService: EvaluationsService,
    private readonly evaluationBatchService: EvaluationBatchService,
    private readonly assessmentsService: AssessmentsService,
    private readonly evaluationApprovalService: EvaluationApprovalService,
  ) {}

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
   * GET /api/evaluations/activity/:id - ดูผลการประเมินของกิจกรรม (เจ้าของกิจกรรม / Admin)
   */
  @Get('activity/:id')
  @ApiOperation({ summary: 'ดูผลการประเมินทั้งหมดในกิจกรรมนั้นๆ (เจ้าของกิจกรรม / Admin)' })
  async findByActivity(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: UserRole,
    @Param('id', ParseIntPipe) activityId: number,
  ) {
    return this.evaluationsService.findByActivity(userId, userRole, activityId);
  }

  /**
   * GET /api/evaluations/activity/:id/batch - หน้าประเมินรายฝ่าย (กิจกรรมสตาฟฟ์ Tier 3 เท่านั้น)
   */
  @Get('activity/:id/batch')
  @ApiOperation({ summary: 'ดูสถานะการประเมินรายฝ่าย: คะแนนฐาน + ข้อยกเว้นรายคน (Organizer / Admin)' })
  async getBatch(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: UserRole,
    @Param('id', ParseIntPipe) activityId: number,
  ) {
    return this.evaluationBatchService.getBatch(userId, userRole, activityId);
  }

  /**
   * PUT /api/evaluations/activity/:id/batch - บันทึกคะแนนฐานรายฝ่าย + ข้อยกเว้นรายคน (ส่งสถานะทั้งชุด)
   */
  @Put('activity/:id/batch')
  @ApiOperation({ summary: 'บันทึกการประเมินรายฝ่ายและข้อยกเว้นรายคน (Organizer / Admin)' })
  async saveBatch(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: UserRole,
    @Param('id', ParseIntPipe) activityId: number,
    @Body() dto: SaveBatchEvaluationDto,
  ) {
    return this.evaluationBatchService.saveBatch(userId, userRole, activityId, dto);
  }

  /**
   * GET /api/evaluations/activity/:id/assessment - โหมดประเมินรอบด้าน (ตนเอง/เพื่อน) + ความคืบหน้าการส่ง
   */
  @Get('activity/:id/assessment')
  @ApiOperation({ summary: 'ดูสถานะโหมดประเมินรอบด้านและความคืบหน้าการส่ง (เจ้าของกิจกรรม / Admin)' })
  async getAssessment(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: UserRole,
    @Param('id', ParseIntPipe) activityId: number,
  ) {
    return this.assessmentsService.getOrganizerState(userId, userRole, activityId);
  }

  /**
   * PUT /api/evaluations/activity/:id/assessment - เปิด/ปิดโหมดประเมินรอบด้าน (เฉพาะกิจกรรมสตาฟฟ์ Tier 3)
   */
  @Put('activity/:id/assessment')
  @ApiOperation({ summary: 'เปิด/ปิดโหมดประเมินรอบด้าน (เจ้าของกิจกรรม / Admin)' })
  async setAssessment(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: UserRole,
    @Param('id', ParseIntPipe) activityId: number,
    @Body() dto: SetAssessmentModeDto,
  ) {
    return this.assessmentsService.setEnabled(userId, userRole, activityId, dto.enabled);
  }

  /**
   * GET /api/evaluations/activity/:id/approval - หน้าอนุมัติผลประเมินรอบด้าน: คะแนนสุทธิ + flag ต่อคน
   */
  @Get('activity/:id/approval')
  @ApiOperation({ summary: 'ดูคะแนนสุทธิรอบด้านและรายที่ต้องตรวจสอบก่อนอนุมัติ (เจ้าของกิจกรรม / Admin)' })
  async getApproval(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: UserRole,
    @Param('id', ParseIntPipe) activityId: number,
  ) {
    return this.evaluationApprovalService.getApproval(userId, userRole, activityId);
  }

  /**
   * POST /api/evaluations/activity/:id/approval/approve-ready - อนุมัติทั้งหมดที่ไม่มีข้อขัดแย้ง
   */
  @Post('activity/:id/approval/approve-ready')
  @ApiOperation({ summary: 'อนุมัติทั้งหมดที่ไม่มีข้อขัดแย้ง — server ตัดสินใหม่ทุกครั้ง (เจ้าของกิจกรรม / Admin)' })
  async approveReady(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: UserRole,
    @Param('id', ParseIntPipe) activityId: number,
    @Body() dto: ApproveReadyDto,
  ) {
    return this.evaluationApprovalService.approveReady(userId, userRole, activityId, dto);
  }

  /**
   * POST /api/evaluations/registration/:registrationId/approval - อนุมัติ/แก้ผลรายคน (ต่างจากที่แนะนำต้องมีเหตุผล)
   */
  @Post('registration/:registrationId/approval')
  @ApiOperation({ summary: 'อนุมัติหรือแก้ผลประเมินรอบด้านรายคน (เจ้าของกิจกรรม / Admin)' })
  async approveOne(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: UserRole,
    @Param('registrationId', ParseIntPipe) registrationId: number,
    @Body() dto: ApproveEvaluationDto,
  ) {
    return this.evaluationApprovalService.approveOne(userId, userRole, registrationId, dto);
  }
}
