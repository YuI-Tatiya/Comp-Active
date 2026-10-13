import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

/** หนึ่งข้อความในประวัติสนทนา — ฝั่ง client เป็นคนเก็บ ส่งกลับมาทุกครั้งเพราะ backend ไม่เก็บ session แชท */
export class ChatHistoryItemDto {
  @IsIn(['user', 'model'])
  role: 'user' | 'model';

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;
}

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  /** จำกัดจำนวนไว้กันพิมพ์ยาวจนย้อนไปหลายสิบข้อความแล้วกิน token/ค่าใช้จ่ายเกินจำเป็น — ฝั่ง UI ก็ตัดไว้ไม่ให้ยาวเกินนี้อยู่แล้ว */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryItemDto)
  history?: ChatHistoryItemDto[];
}
