import { IsInt, IsString, IsNotEmpty } from 'class-validator';

export class CheckInSelfDto {
  @IsInt()
  activityId: number;

  /** โทเค็นหมุนรหัสจาก QR ปัจจุบัน (checkin-token.util.ts) — ไม่ใช่ความลับระยะยาว แค่พิสูจน์ว่าสแกนช่วงที่ยังไม่หมดอายุ */
  @IsString()
  @IsNotEmpty()
  token: string;
}
