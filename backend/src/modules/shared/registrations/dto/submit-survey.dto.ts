import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class SurveyAnswerDto {
  @ApiProperty({ description: 'ID คำถาม (EventSurveyQuestion)' })
  @IsInt()
  questionId: number;

  @ApiPropertyOptional({ description: 'คะแนน — ใช้เมื่อคำถามเป็นชนิด rating' })
  @IsOptional()
  @IsInt()
  @Min(1)
  ratingValue?: number;

  @ApiPropertyOptional({ description: 'คำตอบแบบข้อความ — ใช้เมื่อคำถามเป็นชนิด text' })
  @IsOptional()
  @IsString()
  textValue?: string;
}

export class SubmitSurveyDto {
  @ApiProperty({ type: [SurveyAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SurveyAnswerDto)
  answers: SurveyAnswerDto[];
}
