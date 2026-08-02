import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdminInviteDto {
  @ApiProperty({ example: 'newadmin@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
