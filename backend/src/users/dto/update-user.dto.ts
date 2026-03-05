import { IsOptional, IsString } from 'class-validator';
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
}
