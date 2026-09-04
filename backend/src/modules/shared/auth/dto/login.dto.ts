import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({
    example: "student@kkumail.com",
    description: "อีเมล (นักศึกษา) หรือ Username (ผู้จัดกิจกรรม)",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  identifier: string;

  @ApiProperty({ example: "password123", description: "รหัสผ่าน" })
  @IsString()
  @IsNotEmpty()
  // ตั้งใจไม่ใส่ MinLength: หน้า login ไม่ควรบอกใบ้นโยบายรหัสผ่าน และผู้ใช้เดิม
  // ที่ตั้งรหัสไว้ก่อนนโยบายใหม่ต้องยังเข้าระบบได้ ส่วน MaxLength กัน CPU DoS จาก bcrypt
  @MaxLength(128)
  password: string;
}
