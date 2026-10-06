// skill-transcripts-public.controller.ts
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { SkillTranscriptsService } from './skill-transcripts.service';

@ApiTags('Skill Transcripts')
@Controller('api/skill-transcripts')
export class SkillTranscriptsPublicController {
  constructor(private readonly transcriptsService: SkillTranscriptsService) {}

  /**
   * GET /api/skill-transcripts/verify/:code - ตรวจสอบเอกสารรับรองผล Soft Skills (Public)
   * รหัสผิดรูปแบบตอบ not_found (ไม่ใช่ 400) — ผู้ตรวจเห็นผลเหมือนรหัสที่ไม่มีอยู่
   */
  @Get('verify/:code')
  @UseGuards(ThrottlerGuard)
  // 120 ครั้ง/นาที ต่อ IP — ทั้งวิทยาลัยใช้ IP เดียวกัน (NAT) และหน้าพิมพ์ของนักศึกษาก็เรียก endpoint นี้ จึงต้องไม่ต่ำเกินไป
  // การไล่เดารหัสยังเป็นไปไม่ได้ในทางปฏิบัติ (รหัส 80 บิต) และ nginx จำกัดอัตราต่อ IP อีกชั้น
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @ApiOperation({ summary: 'ตรวจสอบเอกสารรับรองผล Soft Skills (Public)' })
  verify(@Param('code') code: string) {
    return this.transcriptsService.verify(code);
  }
}
