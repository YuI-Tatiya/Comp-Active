import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ACADEMIC_ERRORS,
  EDUCATION_LEVELS,
  EducationLevelCode,
  PASSWORD_ERRORS,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  PROFILE_ERRORS,
  PROGRAM_CODES,
  STUDENT_ID_FACULTY_CODE,
  STUDENT_ID_REGEX,
  THAI_MOBILE_REGEX,
  USERNAME_REGEX,
} from '../../../../common/constants';

const EDUCATION_LEVEL_CODES = EDUCATION_LEVELS.map((l) => l.code);

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'ชื่อ-นามสกุล' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'org-event2026',
    description: 'ชื่อผู้ใช้สำหรับเข้าสู่ระบบ (เฉพาะ organizer) — พิมพ์เล็กล้วน 3-32 ตัวอักษร',
  })
  @IsString()
  @IsOptional()
  @Matches(USERNAME_REGEX, { message: PROFILE_ERRORS.USERNAME_INVALID })
  username?: string;

  @ApiPropertyOptional({
    example: '653380123-4',
    description: `รหัสนักศึกษา — ตำแหน่งที่ 3-6 ต้องเป็น ${STUDENT_ID_FACULTY_CODE}`,
  })
  @IsString()
  @IsOptional()
  @Matches(STUDENT_ID_REGEX, { message: ACADEMIC_ERRORS.STUDENT_ID_INVALID })
  studentId?: string;

  @ApiPropertyOptional({ example: '0812345678', description: 'เบอร์มือถือ 10 หลัก' })
  @IsString()
  @IsOptional()
  @Matches(THAI_MOBILE_REGEX, { message: ACADEMIC_ERRORS.PHONE_INVALID })
  phone?: string;

  @ApiPropertyOptional({ enum: EDUCATION_LEVEL_CODES, description: 'ระดับการศึกษา' })
  @IsOptional()
  @IsIn(EDUCATION_LEVEL_CODES, { message: ACADEMIC_ERRORS.LEVEL_REQUIRED })
  educationLevel?: EducationLevelCode;

  @ApiPropertyOptional({ enum: PROGRAM_CODES, description: 'code สาขาวิชา' })
  @IsOptional()
  @IsIn(PROGRAM_CODES, { message: ACADEMIC_ERRORS.PROGRAM_MISMATCH })
  program?: string;

  @ApiPropertyOptional({ description: 'รหัสผ่านใหม่' })
  @IsString()
  @IsOptional()
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_ERRORS.WEAK })
  @MaxLength(PASSWORD_MAX_LENGTH, { message: PASSWORD_ERRORS.TOO_LONG })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_ERRORS.WEAK })
  newPassword?: string;

  @ApiPropertyOptional({ description: 'รหัสผ่านปัจจุบัน (สำหรับยืนยัน)' })
  @IsString()
  @IsOptional()
  currentPassword?: string;
}
