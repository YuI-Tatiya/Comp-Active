import { IsEmail, IsNotEmpty, IsString, Matches } from "class-validator";
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
}
