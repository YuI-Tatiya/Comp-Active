import { IsArray, IsIn, IsInt, IsNotEmpty, IsString, MaxLength, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { SoftSkillType } from '../../../../common/enums/soft-skill.enum';
import { SOFT_SKILL_TIER_VALUES } from '../../../../common/utils/soft-skill-cap.util';

export class BatchSkillScoreDto {
  @ApiProperty({ enum: Object.values(SoftSkillType), example: SoftSkillType.LEADERSHIP })
  @IsIn(Object.values(SoftSkillType))
  skillType: SoftSkillType;

  @ApiProperty({ enum: SOFT_SKILL_TIER_VALUES, example: 2, description: 'ผ่าน=1, ดี=2, ดีเยี่ยม=3' })
  @IsInt()
  @IsIn([...SOFT_SKILL_TIER_VALUES])
  score: number;
}

class BatchGroupDto {
  @ApiProperty({ example: 'ฝ่ายลงทะเบียนหน้างาน', description: 'ชื่อฝ่าย (dutyRole) ตามตัวเลือกที่กิจกรรมกำหนด' })
  @IsString()
  @IsNotEmpty()
  dutyRole: string;

  @ApiProperty({ type: [BatchSkillScoreDto], description: 'คะแนนฐานของฝ่ายต่อทักษะ' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchSkillScoreDto)
  scores: BatchSkillScoreDto[];
}

class BatchExceptionDto {
  @ApiProperty({ description: 'ID การลงทะเบียนของนักศึกษาที่เป็นข้อยกเว้น' })
  @IsInt()
  registrationId: number;

  @ApiProperty({ type: [BatchSkillScoreDto], description: 'ทักษะที่คะแนนต่างจากฐานของฝ่าย' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchSkillScoreDto)
  scores: BatchSkillScoreDto[];

  @ApiProperty({ example: 'รับผิดชอบเกินหน้าที่', description: 'เหตุผลของข้อยกเว้น — บังคับเสมอ (ใช้ตรวจสอบย้อนหลัง)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

/**
 * บันทึกหน้า Batch Evaluation แบบ declarative — ส่งสถานะทั้งหมดของกิจกรรมมาทุกครั้ง
 * ระบบแทนที่ฐาน/ข้อยกเว้นเดิมทั้งชุดแล้วคำนวณคะแนนของทุกคนที่เช็คอินใหม่
 */
export class SaveBatchEvaluationDto {
  @ApiProperty({ type: [BatchGroupDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchGroupDto)
  groups: BatchGroupDto[];

  @ApiProperty({ type: [BatchExceptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchExceptionDto)
  exceptions: BatchExceptionDto[];
}
