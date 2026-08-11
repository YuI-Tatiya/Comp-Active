import { BadRequestException } from "@nestjs/common";
import {
  ACADEMIC_ERRORS,
  EducationLevelCode,
  isProgramInLevel,
  isYearValidForLevel,
} from "../constants";

export interface AcademicInfoInput {
  educationLevel?: EducationLevelCode | null;
  program?: string | null;
  yearLevel?: number | null;
}

/**
 * ตรวจความสอดคล้องข้ามฟิลด์ของข้อมูลการศึกษา
 * (class-validator ตรวจได้ทีละฟิลด์ จึงต้องมีตัวนี้แยกออกมา)
 *
 * ใช้ร่วมกันระหว่าง AuthService.register() และ UsersService.updateProfile()
 * เพื่อไม่ให้กฎแตกเป็นสองชุด
 */
export function validateAcademicInfo(input: AcademicInfoInput): void {
  const { educationLevel, program, yearLevel } = input;

  // ไม่ได้ส่งมาเลยสักตัว = ไม่ได้ตั้งใจแก้ส่วนนี้ (กรณี updateProfile ที่แก้แค่ชื่อ)
  if (!educationLevel && !program && yearLevel == null) return;

  if (!educationLevel) {
    throw new BadRequestException(ACADEMIC_ERRORS.LEVEL_REQUIRED);
  }
  if (!program || !isProgramInLevel(program, educationLevel)) {
    throw new BadRequestException(ACADEMIC_ERRORS.PROGRAM_MISMATCH);
  }
  if (yearLevel == null || !isYearValidForLevel(yearLevel, educationLevel)) {
    throw new BadRequestException(ACADEMIC_ERRORS.YEAR_INVALID);
  }
}
