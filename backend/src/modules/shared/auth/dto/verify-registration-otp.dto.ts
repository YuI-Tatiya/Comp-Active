import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class VerifyRegistrationOtpDto {
  @ApiProperty({
    example: "student@kkumail.com",
    description: "อีเมลที่ใช้สมัครสมาชิก",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: "123456",
    description: "รหัส OTP 6 หลักที่ได้รับทางอีเมล",
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: "รหัส OTP ต้องเป็นตัวเลข 6 หลัก" })
  otp: string;

  @ApiProperty({
    example: "Passw0rd2026",
    description:
      "รหัสผ่านที่ตั้งไว้ตอนสมัคร — ผูก OTP กับคนที่สมัครจริง ไม่ใช่แค่คนที่เข้ากล่องเมลได้",
  })
  @IsString()
  @IsNotEmpty()
  // ไม่ใส่ MinLength ด้วยเหตุผลเดียวกับ LoginDto; MaxLength กัน CPU DoS จาก bcrypt
  @MaxLength(128)
  password: string;
}
