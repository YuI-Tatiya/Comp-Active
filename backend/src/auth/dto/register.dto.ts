import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/role.enum';

export class RegisterDto {
  @ApiProperty({ example: 'สมชาย ใจดี', description: 'ชื่อ-นามสกุล' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: '6510110001',
    description: 'รหัสนักศึกษา (สำหรับ role student)',
  })
  @IsString()
  @IsOptional()
  studentId?: string;

  @ApiProperty({ example: 'user@example.com', description: 'อีเมล' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: 'รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.STUDENT,
    description: 'บทบาท',
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiPropertyOptional({ description: 'Google ID (ถ้าสมัครผ่าน Google)' })
  @IsString()
  @IsOptional()
  googleId?: string;
}
