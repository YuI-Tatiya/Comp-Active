import { IsInt, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExtendValidityDto {
  @ApiProperty({ example: 30, description: 'จำนวนวันที่ต่ออายุเพิ่ม' })
  @IsInt()
  @Min(1)
  @Max(3650)
  validDays: number;
}
