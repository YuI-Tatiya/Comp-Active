import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsIn,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateEventActivityDto } from './create-event-activity.dto';
import { CreateSurveyQuestionDto } from './create-survey-question.dto';
import { EventVisibility } from '../../../../common/enums/status.enum';

export class CreateEventDto {
  @ApiProperty({ example: 'ค่ายอาสาพัฒนาชนบท ปี 2569', description: 'ชื่องาน' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'วัตถุประสงค์งาน / อธิบายกฎและกติกาของงาน' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'URL รูปภาพงาน (จาก /api/activities/upload-image)' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ default: true, description: 'เปิดเป็น public หรือไม่' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ example: '2026-04-01T23:59:59.000Z', description: 'วันปิดรับสมัคร' })
  @IsOptional()
  @IsDateString()
  registrationCloseAt?: string;

  @ApiProperty({ type: [CreateEventActivityDto], description: 'รายละเอียดกิจกรรมย่อยแต่ละกิจกรรมในงานนี้' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateEventActivityDto)
  activities: CreateEventActivityDto[];

  @ApiPropertyOptional({ type: [CreateSurveyQuestionDto], description: 'คำถามแบบสำรวจความพึงพอใจหลังกิจกรรม' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSurveyQuestionDto)
  surveyQuestions?: CreateSurveyQuestionDto[];

  @ApiPropertyOptional({
    enum: Object.values(EventVisibility),
    default: EventVisibility.EVERYONE,
    description: 'restricted = เห็นเฉพาะนักศึกษาที่ตรงเงื่อนไขสาขา/ชั้นปี/รหัสนักศึกษาด้านล่าง',
  })
  @IsOptional()
  @IsIn(Object.values(EventVisibility))
  visibility?: EventVisibility;

  @ApiPropertyOptional({
    type: [String],
    description: 'รหัสสาขาที่มีสิทธิ์เห็น (ใช้เมื่อ visibility เป็น restricted) — ว่าง = ทุกสาขา',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  visibilityPrograms?: string[];

  @ApiPropertyOptional({
    type: [Number],
    description: 'ชั้นปีที่มีสิทธิ์เห็น (ใช้เมื่อ visibility เป็น restricted) — ว่าง = ทุกชั้นปี',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  visibilityYears?: number[];

  @ApiPropertyOptional({
    description:
      'ตัวกรองรหัสนักศึกษาเพิ่มเติม (ใช้เมื่อ visibility เป็น restricted) — ดูรูปแบบใน student-id-range.util.ts',
  })
  @IsOptional()
  @IsString()
  visibilityStudentIdFilter?: string;
}
