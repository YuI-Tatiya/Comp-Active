import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizerRequestDto {
  @ApiProperty({ example: 'สมชาย ใจดี' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'somchai@kkumail.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '0812345678' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: 'สโมสรนักศึกษาวิทยาลัยการคอมพิวเตอร์' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  department: string;

  @ApiProperty({ example: 'ต้องการจัดกิจกรรมพัฒนาทักษะด้านเทคโนโลยีให้นักศึกษา' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ example: 'จัดค่าย Programming มาแล้ว 3 ครั้ง' })
  @IsString()
  @IsOptional()
  experience?: string;
}
