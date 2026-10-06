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
  @Throttle({ default: { limit: 30, ttl: 60_000 } }) // 30 ครั้ง/นาที ต่อ IP — กันการไล่เดารหัส
  @ApiOperation({ summary: 'ตรวจสอบเอกสารรับรองผล Soft Skills (Public)' })
  verify(@Param('code') code: string) {
    return this.transcriptsService.verify(code);
  }
}
