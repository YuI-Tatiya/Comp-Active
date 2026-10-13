import { IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AdminLoginDto {
  @ApiProperty({ example: "admin@example.com", description: "อีเมล Admin" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: "password123", description: "รหัสผ่าน" })
  @IsString()
  @IsNotEmpty()
  // เหตุผลเดียวกับ login.dto — ไม่บอกใบ้นโยบาย และคุมความยาวกัน CPU DoS จาก bcrypt
  @MaxLength(128)
  password: string;
}
