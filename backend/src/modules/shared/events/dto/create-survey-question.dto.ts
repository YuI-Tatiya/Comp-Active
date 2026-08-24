import { IsString, IsNotEmpty, IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SurveyQuestionType } from '../../../../common/enums/status.enum';

/**
 * ใช้ร่วมกันทั้งแบบสำรวจระดับ "งาน" (CreateEventDto) และระดับ "กิจกรรมเดี่ยว" (CreateActivityDto)
 * — เดิมประกาศซ้ำในไฟล์เดียว แยกมาไว้ที่นี่กันไม่ให้กฎ validate สองที่ไหลออกจากกัน
 */
export class CreateSurveyQuestionDto {
  @ApiProperty({ example: 'กิจกรรมนี้เป็นประโยชน์ต่อคุณมากน้อยเพียงใด?', description: 'ข้อความคำถาม' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ enum: Object.values(SurveyQuestionType), example: SurveyQuestionType.RATING })
  @IsIn(Object.values(SurveyQuestionType))
  type: SurveyQuestionType;

  @ApiPropertyOptional({ default: 5, minimum: 2, maximum: 10, description: 'คะแนนเต็ม — ใช้เมื่อ type เป็น rating เท่านั้น' })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(10)
  scaleMax?: number;
}
