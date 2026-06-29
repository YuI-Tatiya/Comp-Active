import { IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRegistrationDto {
  @ApiProperty({ description: 'ID กิจกรรมที่ต้องการลงทะเบียน' })
  @IsNumber()
  @IsNotEmpty()
  activityId: number;
}
