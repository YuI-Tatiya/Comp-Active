import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** เปิด/ปิดการเช็คอินด้วยตัวเองผ่าน QR หน้างาน — ปิดแล้วนักศึกษาสแกนเช็คอินไม่ได้ทันที จนกว่าจะเปิดใหม่ */
export class SetSelfCheckInDto {
  @ApiProperty({ example: true, description: 'true = เปิดเช็คอิน (QR เริ่มหมุนรหัส), false = ปิดเช็คอินทันที' })
  @IsBoolean()
  enabled: boolean;
}
