import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveReadyDto {
  @ApiProperty({
    type: [Number],
    example: [12, 13, 14],
    description:
      'รายการที่ผู้จัดเห็นว่า "พร้อมอนุมัติ" บนหน้าจอ — เซิร์ฟเวอร์คำนวณใหม่ตอนรับคำขอและอนุมัติเฉพาะคนที่ยังไม่ติดธง (กันข้อมูลค้างหน้าเก่า)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsInt({ each: true })
  registrationIds: number[];
}
