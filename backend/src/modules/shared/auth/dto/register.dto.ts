import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { STUDENT_EMAIL_DOMAIN } from '../../../../common/constants';

export class RegisterDto {
  @ApiProperty({ example: 'สมชาย ใจดี', description: 'ชื่อ-นามสกุล' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: '6510110001',
    description: 'รหัสนักศึกษา',
  })
  @IsString()
  @IsOptional()
  studentId?: string;

  @ApiProperty({
    example: `student@${STUDENT_EMAIL_DOMAIN}`,
    description: `อีเมล (ต้องใช้ @${STUDENT_EMAIL_DOMAIN} เท่านั้น)`,
  })
  @IsEmail()
  @IsNotEmpty()
  @Matches(new RegExp(`@${STUDENT_EMAIL_DOMAIN.replace('.', '\\.')}$`, 'i'), {
    message: `กรุณาใช้อีเมล @${STUDENT_EMAIL_DOMAIN} เท่านั้น`,
  })
  email: string;

  @ApiProperty({ example: 'password123', description: 'รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
