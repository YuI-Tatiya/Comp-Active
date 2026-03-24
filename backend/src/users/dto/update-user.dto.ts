import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'ชื่อ-นามสกุล' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'รหัสนักศึกษา' })
  @IsString()
  @IsOptional()
  studentId?: string;

  @ApiPropertyOptional({ description: 'รหัสผ่านใหม่' })
  @IsString()
  @IsOptional()
  @MinLength(6)
  newPassword?: string;

  @ApiPropertyOptional({ description: 'รหัสผ่านปัจจุบัน (สำหรับยืนยัน)' })
  @IsString()
  @IsOptional()
  currentPassword?: string;
}
