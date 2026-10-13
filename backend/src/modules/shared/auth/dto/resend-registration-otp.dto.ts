import { IsEmail, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ResendRegistrationOtpDto {
  @ApiProperty({
    example: "student@kkumail.com",
    description: "อีเมลที่ใช้สมัครสมาชิกไว้แต่ยังไม่ยืนยัน",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
