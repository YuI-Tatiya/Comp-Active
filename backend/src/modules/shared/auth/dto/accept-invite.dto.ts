import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInviteDto {
  @ApiProperty({ description: 'Token ที่ได้รับจากลิงก์ในอีเมล' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'password123', description: 'รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
