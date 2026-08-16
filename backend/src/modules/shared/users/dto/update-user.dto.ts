import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  ACADEMIC_ERRORS,
  EDUCATION_LEVELS,
  EducationLevelCode,
  PROGRAM_CODES,
  STUDENT_ID_FACULTY_CODE,
  STUDENT_ID_REGEX,
  THAI_MOBILE_REGEX,
} from "../../../../common/constants";

const EDUCATION_LEVEL_CODES = EDUCATION_LEVELS.map((l) => l.code);

export class UpdateUserDto {
  @ApiPropertyOptional({ description: "ชื่อ-นามสกุล" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: "653380123-4",
    description: `รหัสนักศึกษา — ตำแหน่งที่ 3-6 ต้องเป็น ${STUDENT_ID_FACULTY_CODE}`,
  })
  @IsString()
  @IsOptional()
  @Matches(STUDENT_ID_REGEX, { message: ACADEMIC_ERRORS.STUDENT_ID_INVALID })
  studentId?: string;

  @ApiPropertyOptional({
    example: "0812345678",
    description: "เบอร์มือถือ 10 หลัก",
  })
  @IsString()
  @IsOptional()
  @Matches(THAI_MOBILE_REGEX, { message: ACADEMIC_ERRORS.PHONE_INVALID })
  phone?: string;

  @ApiPropertyOptional({
    enum: EDUCATION_LEVEL_CODES,
    description: "ระดับการศึกษา",
  })
  @IsOptional()
  @IsIn(EDUCATION_LEVEL_CODES, { message: ACADEMIC_ERRORS.LEVEL_REQUIRED })
  educationLevel?: EducationLevelCode;

  @ApiPropertyOptional({ enum: PROGRAM_CODES, description: "code สาขาวิชา" })
  @IsOptional()
  @IsIn(PROGRAM_CODES, { message: ACADEMIC_ERRORS.PROGRAM_MISMATCH })
  program?: string;

  @ApiPropertyOptional({ description: "รหัสผ่านใหม่" })
  @IsString()
  @IsOptional()
  @MinLength(6)
  newPassword?: string;

  @ApiPropertyOptional({ description: "รหัสผ่านปัจจุบัน (สำหรับยืนยัน)" })
  @IsString()
  @IsOptional()
  currentPassword?: string;
}
