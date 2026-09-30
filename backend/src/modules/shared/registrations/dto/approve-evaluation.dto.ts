import { ArrayMinSize, IsArray, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BatchSkillScoreDto } from './save-batch-evaluation.dto';

export class ApproveEvaluationDto {
  @ApiPropertyOptional({
    type: [BatchSkillScoreDto],
    description: 'ค่าสุดท้ายต่อทักษะ — ไม่ส่ง = ยอมรับค่าที่ระบบแนะนำ; ส่งแล้วต้องครบทุกทักษะที่กิจกรรมเลือก',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchSkillScoreDto)
  scores?: BatchSkillScoreDto[];

  @ApiPropertyOptional({ description: 'เหตุผล — บังคับเมื่อค่าที่เลือกต่างจากที่ระบบแนะนำ', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
