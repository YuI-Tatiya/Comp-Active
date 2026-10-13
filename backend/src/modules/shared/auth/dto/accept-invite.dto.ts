import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import {
  ADMIN_PASSWORD_MIN_LENGTH,
  ADMIN_PASSWORD_PATTERN,
  PASSWORD_ERRORS,
  PASSWORD_MAX_LENGTH,
} from "../../../../common/constants";

export class AcceptInviteDto {
  @ApiProperty({ description: "Token ที่ได้รับจากลิงก์ในอีเมล" })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: "C0mpActive!2026",
    description: `รหัสผ่าน Admin (อย่างน้อย ${ADMIN_PASSWORD_MIN_LENGTH} ตัวอักษร พิมพ์เล็ก+พิมพ์ใหญ่+ตัวเลข+อักขระพิเศษ)`,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(ADMIN_PASSWORD_MIN_LENGTH, { message: PASSWORD_ERRORS.ADMIN_WEAK })
  @MaxLength(PASSWORD_MAX_LENGTH, { message: PASSWORD_ERRORS.TOO_LONG })
  @Matches(ADMIN_PASSWORD_PATTERN, { message: PASSWORD_ERRORS.ADMIN_WEAK })
  password: string;
}
