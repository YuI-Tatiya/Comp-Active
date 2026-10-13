import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveEventDraftDto {
  // payload เป็น state ดิบของ wizard ฝั่ง frontend ล้วนๆ (ดู lib/event-draft.ts) — backend เก็บเป็น
  // opaque JSON ไม่ตรวจฟิลด์ข้างใน เพราะฉบับร่างไม่ใช่ Event จริง ไม่ต้องผ่าน CreateEventDto
  @ApiProperty({ type: Object, description: 'state ของ wizard สร้างงาน ณ ขณะบันทึกฉบับร่าง' })
  @IsObject()
  payload: Record<string, unknown>;
}
