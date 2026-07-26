import { IsInt, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveOrganizerRequestDto {
  @ApiProperty({ example: 90, description: 'จำนวนวันที่ให้สิทธิ์ Organizer' })
  @IsInt()
  @Min(1)
  @Max(3650)
  validDays: number;
}
