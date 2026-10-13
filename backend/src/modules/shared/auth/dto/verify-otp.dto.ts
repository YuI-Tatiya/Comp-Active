import { IsNotEmpty, IsString, Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * ของเดิมรับ OTP ด้วย `@Body('otp') otp: string` ดิบ ๆ ซึ่ง ValidationPipe ตรวจไม่ถึง
 * (whitelist/forbidNonWhitelisted ทำงานกับ DTO เท่านั้น) ผู้โจมตีจึงส่งค่าอะไรก็ได้
 * เข้ามา รวมถึง object/array ที่ทำให้ตรรกะเปรียบเทียบทำงานผิดเพี้ยน
 */
export class VerifyOtpDto {
  @ApiProperty({
    example: "123456",
    description: "รหัส OTP 6 หลักที่ได้รับทางอีเมล",
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: "รหัส OTP ต้องเป็นตัวเลข 6 หลัก" })
  otp: string;
}
