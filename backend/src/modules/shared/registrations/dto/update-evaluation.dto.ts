import { IsInt, Min, Max, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * ใช้แก้ไขคะแนนที่ระบบให้อัตโนมัติตอนเช็คอิน (จาก ActivitySoftSkill.rate) เท่านั้น
 * ไม่มี endpoint สร้างคะแนนแบบ manual แล้ว — ดู EvaluationsService.autoCreateForCheckIn()
 */
export class UpdateEvaluationDto {
  @ApiPropertyOptional({ description: 'คะแนนการสื่อสาร (0-5)', example: 4 })
  @IsInt()
  @Min(0)
  @Max(5)
  @IsOptional()
  communication?: number;

  @ApiPropertyOptional({ description: 'คะแนนการบริหารจัดการเวลา (0-5)', example: 4 })
  @IsInt()
  @Min(0)
  @Max(5)
  @IsOptional()
  timeManagement?: number;

  @ApiPropertyOptional({ description: 'คะแนนความยืดหยุ่นและปรับตัว (0-5)', example: 4 })
  @IsInt()
  @Min(0)
  @Max(5)
  @IsOptional()
  flexibilityAdaptability?: number;

  @ApiPropertyOptional({ description: 'คะแนนการทำงานร่วมกับผู้อื่น (0-5)', example: 4 })
  @IsInt()
  @Min(0)
  @Max(5)
  @IsOptional()
  teamworkCollaboration?: number;

  @ApiPropertyOptional({ description: 'คะแนนการคิดเชิงวิเคราะห์และเชิงวิพากษ์ (0-5)', example: 4 })
  @IsInt()
  @Min(0)
  @Max(5)
  @IsOptional()
  analyticCriticalThinking?: number;

  @ApiPropertyOptional({ description: 'คะแนนการตัดสินใจ (0-5)', example: 4 })
  @IsInt()
  @Min(0)
  @Max(5)
  @IsOptional()
  decisionMaking?: number;

  @ApiPropertyOptional({ description: 'คะแนนการคิดเชิงสร้างสรรค์ (0-5)', example: 4 })
  @IsInt()
  @Min(0)
  @Max(5)
  @IsOptional()
  creativity?: number;

  @ApiPropertyOptional({ description: 'คะแนนการแก้ไขปัญหาที่มีความซับซ้อน (0-5)', example: 4 })
  @IsInt()
  @Min(0)
  @Max(5)
  @IsOptional()
  complexProblemSolving?: number;

  @ApiPropertyOptional({ description: 'คะแนนการใฝ่เรียนรู้ตลอดเวลา (0-5)', example: 4 })
  @IsInt()
  @Min(0)
  @Max(5)
  @IsOptional()
  curiosityLifelongLearning?: number;

  @ApiPropertyOptional({ description: 'คะแนนการโน้มน้าวและต่อรอง (0-5)', example: 4 })
  @IsInt()
  @Min(0)
  @Max(5)
  @IsOptional()
  negotiationPersuasion?: number;

  @ApiPropertyOptional({ description: 'คะแนนภาวะผู้นำ (0-5)', example: 4 })
  @IsInt()
  @Min(0)
  @Max(5)
  @IsOptional()
  leadership?: number;

  @ApiPropertyOptional({ description: 'คะแนนทัศนคติเชิงบวก (0-5)', example: 4 })
  @IsInt()
  @Min(0)
  @Max(5)
  @IsOptional()
  positiveAttitude?: number;

  @ApiPropertyOptional({ description: 'ความคิดเห็นเพิ่มเติม' })
  @IsString()
  @IsOptional()
  comment?: string;
}
