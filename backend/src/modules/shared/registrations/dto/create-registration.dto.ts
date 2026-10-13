import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsInt,
  Min,
  IsUrl,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class RegistrationAnswerDto {
  @ApiProperty({ description: 'ID คำถาม (ActivityQuestion)' })
  @IsInt()
  questionId: number;

  @ApiPropertyOptional({ description: 'คำตอบแบบข้อความ — ใช้เมื่อคำถามเป็นชนิด text' })
  @IsOptional()
  @IsString()
  textValue?: string;

  @ApiPropertyOptional({ type: [Number], description: 'ID ตัวเลือกที่เลือก — ใช้เมื่อคำถามเป็น single/multi choice' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  optionIds?: number[];
}

export class CreateRegistrationDto {
  @ApiProperty({ description: 'ID กิจกรรมที่ต้องการลงทะเบียน' })
  @IsNumber()
  @IsNotEmpty()
  activityId: number;

  @ApiPropertyOptional({ type: [RegistrationAnswerDto], description: 'คำตอบคำถามเพิ่มเติมของกิจกรรม (ถ้ามี)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistrationAnswerDto)
  answers?: RegistrationAnswerDto[];

  @ApiPropertyOptional({ description: 'ขอใบจิตอาสาเพื่อ กยศ. — มีผลเฉพาะกิจกรรมที่เปิดออกใบจิตอาสา' })
  @IsOptional()
  @IsBoolean()
  wantsCertLoanFund?: boolean;

  @ApiPropertyOptional({ description: 'ขอใบจิตอาสาเพื่อทุนการศึกษา — มีผลเฉพาะกิจกรรมที่เปิดออกใบจิตอาสา' })
  @IsOptional()
  @IsBoolean()
  wantsCertScholarship?: boolean;

  @ApiPropertyOptional({ description: 'บทบาท/หน้าที่ที่เลือก — ใช้เมื่อกิจกรรมเป็นประเภทสตาฟฟ์/จิตอาสา' })
  @IsOptional()
  @IsString()
  dutyRole?: string;

  @ApiPropertyOptional({ description: 'รอบ/กะเวลาที่เลือก — ใช้เมื่อกิจกรรมเป็นประเภทสตาฟฟ์/จิตอาสา' })
  @IsOptional()
  @IsString()
  dutyShift?: string;

  @ApiPropertyOptional({ description: 'ชื่อทีม — ใช้เมื่อกิจกรรมเป็นประเภทผู้สมัครแข่งขัน' })
  @IsOptional()
  @IsString()
  teamName?: string;

  @ApiPropertyOptional({ description: 'จำนวนสมาชิกทีม — ใช้เมื่อกิจกรรมเป็นประเภทผู้สมัครแข่งขัน' })
  @IsOptional()
  @IsInt()
  @Min(1)
  teamSize?: number;

  @ApiPropertyOptional({ description: 'ประเภท/รุ่นการแข่งขันที่เลือก' })
  @IsOptional()
  @IsString()
  competitionCategory?: string;

  @ApiPropertyOptional({ description: 'ลิงก์ผลงาน/ไฟล์ส่ง (URL)' })
  @IsOptional()
  @IsUrl()
  submissionLink?: string;
}
