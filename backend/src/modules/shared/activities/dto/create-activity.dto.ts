import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsIn,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SoftSkillType } from '../../../../common/enums/soft-skill.enum';

export class CreateActivityDto {
  @ApiProperty({ example: 'อบรม React Workshop', description: 'ชื่อกิจกรรม' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'รายละเอียดกิจกรรม' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'workshop', description: 'หมวดหมู่' })
  @IsString()
  @IsNotEmpty()
  category: string;

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

  @ApiPropertyOptional({
    example: ['React', 'Frontend'],
    description: 'แท็ก',
  })
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

  @ApiPropertyOptional({
    example: ['นักศึกษาชั้นปีที่ 2 ขึ้นไป'],
    description: 'เงื่อนไขการเข้าร่วม',
  })
  @IsArray()
  @IsOptional()
  conditions?: string[];

  @ApiPropertyOptional({
    example: ['ได้รับเกียรติบัตร', 'ชั่วโมงอาสาสมัคร 8 ชั่วโมง'],
    description: 'สิทธิประโยชน์',
  })
  @IsArray()
  @IsOptional()
  benefits?: string[];

  @ApiPropertyOptional({
    example: 'https://example.com/image.jpg',
    description: 'URL รูปภาพโปสเตอร์กิจกรรม',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
