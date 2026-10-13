import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class IssueCertificateDto {
  @ApiPropertyOptional({
    example: 6,
    description: 'ชั่วโมงจิตอาสาที่ต้องการระบุแทนค่าเริ่มต้นของกิจกรรม — ไม่ระบุ = ใช้ค่าที่คำนวณจากกิจกรรม',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999.99)
  volunteerHours?: number;
}
