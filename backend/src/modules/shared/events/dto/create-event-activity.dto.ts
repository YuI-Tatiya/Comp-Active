import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsDateString,
  IsArray,
  ArrayMinSize,
  IsIn,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SoftSkillType } from '../../../../common/enums/soft-skill.enum';
import { ActivityQuestionType } from '../../../../common/enums/status.enum';

class SoftSkillRateDto {
  @ApiProperty({ enum: Object.values(SoftSkillType), example: SoftSkillType.TEAMWORK_COLLABORATION })
  @IsIn(Object.values(SoftSkillType))
  skillType: SoftSkillType;

  @ApiProperty({ example: 3, minimum: 0, maximum: 5, description: 'น้ำหนักคะแนนของทักษะนี้สำหรับกิจกรรมนี้ (0-5)' })
  @IsInt()
  @Min(0)
  @Max(5)
  rate: number;
}

class CreateActivityQuestionDto {
  @ApiProperty({ example: 'แพ้อาหารชนิดใดหรือไม่?', description: 'ข้อความคำถาม' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ enum: Object.values(ActivityQuestionType), example: ActivityQuestionType.TEXT })
  @IsIn(Object.values(ActivityQuestionType))
  type: ActivityQuestionType;

  @ApiPropertyOptional({ default: false, description: 'บังคับตอบหรือไม่' })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'ตัวเลือกคำตอบ — ใช้เมื่อ type เป็น single_choice หรือ multi_choice เท่านั้น',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];
}

export class CreateEventActivityDto {
  @ApiProperty({ example: 'ค่ายอาสาวันที่ 1', description: 'ชื่อกิจกรรม' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'คำอธิบายรูปแบบกิจกรรม' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: ['Volunteer', 'Technology'], description: 'หมวดหมู่ — เลือกได้มากกว่า 1' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  categories: string[];

  @ApiPropertyOptional({
    description: 'URL รูปภาพกิจกรรม (จาก /api/activities/upload-image) — ส่ง null เพื่อลบรูปเดิม',
  })
  @IsOptional()
  @ValidateIf((o) => o.imageUrl !== null)
  @IsString()
  imageUrl?: string | null;

  @ApiPropertyOptional({ description: 'URL ไฟล์แนบ (จาก /api/events/upload-attachment) — ส่ง null เพื่อลบไฟล์แนบเดิม' })
  @IsOptional()
  @ValidateIf((o) => o.attachmentUrl !== null)
  @IsString()
  attachmentUrl?: string | null;

  @ApiProperty({ example: '2026-03-15T09:00:00.000Z', description: 'วันที่และเวลาเริ่ม' })
  @IsDateString()
  startAt: string;

  @ApiProperty({ example: '2026-03-15T16:00:00.000Z', description: 'วันที่และเวลาสิ้นสุด' })
  @IsDateString()
  endAt: string;

  @ApiProperty({ example: 'ห้องประชุม 301', description: 'สถานที่จัด' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiPropertyOptional({
    example: 50,
    description: 'จำนวนที่รับสูงสุด — ไม่ระบุ = ไม่จำกัดจำนวน, ส่ง null เพื่อล้างจำนวนจำกัดเดิม',
  })
  @IsOptional()
  @ValidateIf((o) => o.capacity !== null)
  @IsInt()
  @Min(1)
  capacity?: number | null;

  @ApiPropertyOptional({ description: 'ออกใบจิตอาสาให้ผู้เข้าร่วมหรือไม่' })
  @IsOptional()
  @IsBoolean()
  issueVolunteerCertificate?: boolean;

  @ApiPropertyOptional({ example: 'ผู้ช่วยกิจกรรมพัฒนาชุมชน', description: 'ชื่อการทำงาน (ใช้เมื่อออกใบจิตอาสา)' })
  @IsOptional()
  @ValidateIf((o) => o.volunteerRole !== null)
  @IsString()
  volunteerRole?: string | null;

  @ApiPropertyOptional({ type: [SoftSkillRateDto], description: 'Soft Skills ที่กิจกรรมนี้ให้คะแนน พร้อมน้ำหนัก 0-5' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SoftSkillRateDto)
  softSkillRates?: SoftSkillRateDto[];

  @ApiPropertyOptional({ type: [CreateActivityQuestionDto], description: 'คำถามเพิ่มเติมตอนลงทะเบียนกิจกรรมนี้' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateActivityQuestionDto)
  questions?: CreateActivityQuestionDto[];
}
