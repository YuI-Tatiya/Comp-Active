import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { BatchSkillScoreDto } from './save-batch-evaluation.dto';

export class SubmitAssessmentDto {
  @ApiProperty({
    type: [BatchSkillScoreDto],
    description: 'ระดับที่ให้ต่อทักษะ — ต้องครบทุกทักษะที่กิจกรรมเลือกประเมิน (server ตรวจชุดทักษะอีกครั้ง)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchSkillScoreDto)
  scores: BatchSkillScoreDto[];
}
