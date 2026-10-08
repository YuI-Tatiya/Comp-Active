// backend/src/modules/student/skill-transcripts-student.controller.ts
import { Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkillTranscriptsService } from '../shared/skill-transcripts/skill-transcripts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Skill Transcripts')
@Controller('api/skill-transcripts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@ApiBearerAuth()
export class SkillTranscriptsStudentController {
  constructor(private readonly transcriptsService: SkillTranscriptsService) {}

  /** POST /api/skill-transcripts - ออกเอกสารรับรองผล Soft Skills ฉบับใหม่ (Student) */
  @Post()
  @ApiOperation({ summary: 'ออกเอกสารรับรองผล Soft Skills (Student)' })
  issue(@CurrentUser('id') studentId: number) {
    return this.transcriptsService.issue(studentId);
  }

  /** GET /api/skill-transcripts/mine - รายการเอกสารที่ตัวเองออก (Student) — ต้องประกาศก่อน route ที่มี :code */
  @Get('mine')
  @ApiOperation({ summary: 'ดูเอกสารรับรองที่ตัวเองออก (Student)' })
  listMine(@CurrentUser('id') studentId: number) {
    return this.transcriptsService.listMine(studentId);
  }

  /** PATCH /api/skill-transcripts/:code/revoke - ยกเลิกเอกสาร (Student, เจ้าของเท่านั้น — ตรวจใน service) */
  @Patch(':code/revoke')
  @ApiOperation({ summary: 'ยกเลิกเอกสารรับรอง (Student)' })
  revoke(@CurrentUser('id') studentId: number, @Param('code') code: string) {
    return this.transcriptsService.revoke(studentId, code);
  }
}
