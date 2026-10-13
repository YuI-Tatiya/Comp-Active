import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * เปิด/ปิดรับสมัครชั่วคราว — คนละอย่างกับ markCompleted (จบกิจกรรมถาวร) และ requestCancellation
 * (ยกเลิกถาวร ต้องมีเหตุผล แจ้งอีเมลผู้ลงทะเบียน) ตัวนี้แค่สลับ ActivityStatus.open/closed แบบย้อนกลับได้
 * ไม่รับ "completed" ตรงนี้เพราะกิจกรรมที่จบแล้วต้องผ่าน /complete เท่านั้น ไม่ใช่สลับไปมาจากเมนูนี้
 */
export class SetActivityStatusDto {
  @ApiProperty({ example: 'closed', enum: ['open', 'closed'], description: 'เปิด/ปิดรับสมัครชั่วคราว' })
  @IsIn(['open', 'closed'])
  status: 'open' | 'closed';
}
