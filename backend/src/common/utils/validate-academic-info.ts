import { BadRequestException } from '@nestjs/common';
import { ACADEMIC_ERRORS, EducationLevelCode, isProgramInLevel } from '../constants';

export interface AcademicInfoInput {
  educationLevel?: EducationLevelCode | null;
  program?: string | null;
}

/**
 * ตรวจว่า program อยู่ในระดับการศึกษาที่เลือกจริง
 * (class-validator ตรวจข้ามฟิลด์แบบนี้ไม่ได้)
 *
 * ใช้ร่วมกันระหว่าง AuthService.register() และ UsersService.updateProfile()
 * เพื่อไม่ให้กฎแตกเป็นสองชุด
 */
export function validateAcademicInfo(input: AcademicInfoInput): void {
  const { educationLevel, program } = input;

  // ไม่ได้ส่งมาเลยสักตัว = ไม่ได้ตั้งใจแก้ส่วนนี้ (กรณี updateProfile ที่แก้แค่ชื่อ)
  if (!educationLevel && !program) return;

  if (!educationLevel) {
    throw new BadRequestException(ACADEMIC_ERRORS.LEVEL_REQUIRED);
  }
  if (!program || !isProgramInLevel(program, educationLevel)) {
    throw new BadRequestException(ACADEMIC_ERRORS.PROGRAM_MISMATCH);
  }
}
