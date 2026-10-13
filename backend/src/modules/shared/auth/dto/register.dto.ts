import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ACADEMIC_ERRORS,
  EDUCATION_LEVELS,
  EducationLevelCode,
  PROGRAM_CODES,
  STUDENT_EMAIL_DOMAIN,
  STUDENT_ID_FACULTY_CODE,
  STUDENT_ID_REGEX,
  THAI_MOBILE_REGEX,
  TITLE_CODES,
  TITLE_ERRORS,
  TitleCode,
  PASSWORD_ERRORS,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
} from "../../../../common/constants";

const EDUCATION_LEVEL_CODES = EDUCATION_LEVELS.map((l) => l.code);

export class RegisterDto {
  @ApiProperty({ example: "mr", enum: TITLE_CODES, description: "คำนำหน้าชื่อ" })
  @IsIn(TITLE_CODES, { message: TITLE_ERRORS.REQUIRED })
  title: TitleCode;

  @ApiProperty({ example: "สมชาย ใจดี", description: "ชื่อ-นามสกุล" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: "653380123-4",
    description: `รหัสนักศึกษา — ตำแหน่งที่ 3-6 ต้องเป็น ${STUDENT_ID_FACULTY_CODE} (รหัสวิทยาลัยการคอมพิวเตอร์)`,
  })
  @IsString()
  @IsOptional()
  @Matches(STUDENT_ID_REGEX, { message: ACADEMIC_ERRORS.STUDENT_ID_INVALID })
  studentId?: string;

  @ApiProperty({
    example: `student@${STUDENT_EMAIL_DOMAIN}`,
    description: `อีเมล (ต้องใช้ @${STUDENT_EMAIL_DOMAIN} เท่านั้น)`,
  })
  @IsEmail()
  @IsNotEmpty()
  @Matches(new RegExp(`@${STUDENT_EMAIL_DOMAIN.replace(".", "\\.")}$`, "i"), {
    message: `กรุณาใช้อีเมล @${STUDENT_EMAIL_DOMAIN} เท่านั้น`,
  })
  email: string;

  @ApiProperty({ example: "0812345678", description: "เบอร์มือถือ 10 หลัก" })
  @IsString()
  @IsNotEmpty()
  @Matches(THAI_MOBILE_REGEX, { message: ACADEMIC_ERRORS.PHONE_INVALID })
  phone: string;

  @ApiProperty({
    example: "bachelor",
    enum: EDUCATION_LEVEL_CODES,
    description: "ระดับการศึกษา",
  })
  @IsIn(EDUCATION_LEVEL_CODES, { message: ACADEMIC_ERRORS.LEVEL_REQUIRED })
  educationLevel: EducationLevelCode;

  @ApiProperty({
    example: "cs",
    enum: PROGRAM_CODES,
    description: "code สาขาวิชา (ต้องอยู่ในระดับการศึกษาที่เลือก)",
  })
  @IsIn(PROGRAM_CODES, { message: ACADEMIC_ERRORS.PROGRAM_MISMATCH })
  program: string;

  @ApiProperty({
    example: "Passw0rd2026",
    description: `รหัสผ่าน (อย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร มีทั้งตัวอักษรและตัวเลข)`,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_ERRORS.WEAK })
  @MaxLength(PASSWORD_MAX_LENGTH, { message: PASSWORD_ERRORS.TOO_LONG })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_ERRORS.WEAK })
  password: string;
}
