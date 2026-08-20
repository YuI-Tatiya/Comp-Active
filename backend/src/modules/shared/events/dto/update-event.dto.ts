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
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateEventActivityDto } from './create-event-activity.dto';
import { SurveyQuestionType, EventVisibility } from '../../../../common/enums/status.enum';

class UpdateSurveyQuestionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiPropertyOptional({ enum: Object.values(SurveyQuestionType) })
  @IsIn(Object.values(SurveyQuestionType))
  type: SurveyQuestionType;

  @ApiPropertyOptional({ minimum: 2, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(10)
  scaleMax?: number;
}

/** เหมือน CreateEventActivityDto ทุกฟิลด์ แต่เพิ่ม id (ถ้ามี = แก้ไขของเดิม, ถ้าไม่มี = สร้างใหม่) */
export class UpdateEventActivityDto extends CreateEventActivityDto {
  @ApiPropertyOptional({ description: 'ไม่ระบุ = สร้างกิจกรรมย่อยใหม่ในงานนี้, ระบุ = แก้ไขกิจกรรมย่อยเดิม' })
  @IsOptional()
  @IsInt()
  id?: number;
}

export class UpdateEventDto {
  @ApiPropertyOptional({ example: 'ค่ายอาสาพัฒนาชนบท ปี 2569' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'URL รูปภาพงาน — ไม่ส่ง/ส่ง undefined = คงรูปเดิม' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  registrationCloseAt?: string;

  @ApiPropertyOptional({ type: [UpdateEventActivityDto], description: 'กิจกรรมย่อยทั้งหมดของงานนี้หลังแก้ไข — ที่ไม่ส่ง id จะถูกสร้างใหม่, ของเดิมที่ไม่อยู่ในรายการนี้จะถูกลบ (ถ้าไม่มีผู้ลงทะเบียน)' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateEventActivityDto)
  activities: UpdateEventActivityDto[];

  @ApiPropertyOptional({ type: [UpdateSurveyQuestionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSurveyQuestionDto)
  surveyQuestions?: UpdateSurveyQuestionDto[];

  @ApiPropertyOptional({ enum: Object.values(EventVisibility) })
  @IsOptional()
  @IsIn(Object.values(EventVisibility))
  visibility?: EventVisibility;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  visibilityPrograms?: string[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  visibilityYears?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  visibilityStudentIdFilter?: string;
}
