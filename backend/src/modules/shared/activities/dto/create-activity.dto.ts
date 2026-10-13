import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsInt,
  IsOptional,
  IsArray,
  ArrayMinSize,
  IsIn,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SoftSkillType } from '../../../../common/enums/soft-skill.enum';
import { RegistrationType } from '../../../../common/enums/status.enum';
import { CreateSurveyQuestionDto } from '../../events/dto/create-survey-question.dto';

export class CreateActivityDto {
  @ApiProperty({ example: 'อบรม React Workshop', description: 'ชื่อกิจกรรม' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'รายละเอียดกิจกรรม' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: ['workshop', 'technology'], description: 'หมวดหมู่ — เลือกได้มากกว่า 1' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  categories: string[];

  @ApiProperty({ example: '2026-03-15', description: 'วันที่จัดกิจกรรม' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: '09:00', description: 'เวลาเริ่ม' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: '16:00', description: 'เวลาสิ้นสุด' })
  @IsString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({ example: 'ห้อง 101 ตึก IT', description: 'สถานที่' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiPropertyOptional({ example: 50, description: 'จำนวนที่นั่ง — ไม่ระบุ/null = ไม่จำกัดจำนวน' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number | null;

  @ApiPropertyOptional({ example: ['React', 'Frontend'], description: 'แท็ก' })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    example: [SoftSkillType.TEAMWORK_COLLABORATION, SoftSkillType.COMMUNICATION],
    description: 'Soft Skills ที่ได้รับจากกิจกรรม',
    enum: SoftSkillType,
    isArray: true,
  })
  @IsArray()
  @IsOptional()
  @IsIn(Object.values(SoftSkillType), { each: true })
  softSkills?: SoftSkillType[];

  @ApiPropertyOptional({ example: ['นักศึกษาชั้นปีที่ 2 ขึ้นไป'], description: 'เงื่อนไขการเข้าร่วม' })
  @IsArray()
  @IsOptional()
  conditions?: string[];

  @ApiPropertyOptional({ example: ['ได้รับเกียรติบัตร', 'ชั่วโมงอาสาสมัคร 8 ชั่วโมง'], description: 'สิทธิประโยชน์' })
  @IsArray()
  @IsOptional()
  benefits?: string[];

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg', description: 'URL รูปภาพโปสเตอร์กิจกรรม' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    type: [CreateSurveyQuestionDto],
    description: 'คำถามแบบสำรวจความพึงพอใจหลังกิจกรรม — เฉพาะกิจกรรมเดี่ยวที่ไม่ได้อยู่ในงานไหน',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSurveyQuestionDto)
  surveyQuestions?: CreateSurveyQuestionDto[];

  @ApiPropertyOptional({
    enum: Object.values(RegistrationType),
    default: RegistrationType.PARTICIPANT,
    description: 'ประเภทการรับสมัคร',
  })
  @IsOptional()
  @IsIn(Object.values(RegistrationType))
  registrationType?: RegistrationType;

  @ApiPropertyOptional({
    type: [String],
    description: 'ตัวเลือกบทบาท/หน้าที่ — ใช้เมื่อ registrationType เป็น staff_volunteer',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dutyRoleOptions?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'ตัวเลือกรอบ/กะเวลา — ใช้เมื่อ registrationType เป็น staff_volunteer',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dutyShiftOptions?: string[];

  @ApiPropertyOptional({ description: 'จำนวนสมาชิกทีมขั้นต่ำ — ใช้เมื่อ registrationType เป็น contestant' })
  @IsOptional()
  @ValidateIf((o) => o.teamSizeMin !== null)
  @IsInt()
  @Min(1)
  teamSizeMin?: number | null;

  @ApiPropertyOptional({ description: 'จำนวนสมาชิกทีมสูงสุด — ใช้เมื่อ registrationType เป็น contestant' })
  @IsOptional()
  @ValidateIf((o) => o.teamSizeMax !== null)
  @IsInt()
  @Min(1)
  teamSizeMax?: number | null;

  @ApiPropertyOptional({
    type: [String],
    description: 'ตัวเลือกประเภท/รุ่นการแข่งขัน — ใช้เมื่อ registrationType เป็น contestant',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  competitionCategoryOptions?: string[];
}
