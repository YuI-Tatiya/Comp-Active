import { BadRequestException } from '@nestjs/common';
import { RegistrationType } from '../enums/status.enum';

export interface RegistrationTypeInput {
  registrationType?: RegistrationType;
  dutyRoleOptions?: string[];
  dutyShiftOptions?: string[];
  teamSizeMin?: number | null;
  teamSizeMax?: number | null;
  competitionCategoryOptions?: string[];
}

export interface PreparedRegistrationTypeFields {
  registrationType: RegistrationType;
  dutyRoleOptions: string[];
  dutyShiftOptions: string[];
  teamSizeMin: number | null;
  teamSizeMax: number | null;
  competitionCategoryOptions: string[];
}

const cleanList = (arr?: string[]) => (arr ?? []).map((s) => s.trim()).filter(Boolean);

/** เตรียม+ตรวจสอบฟิลด์ registrationType ของกิจกรรม — ใช้ร่วมกันทั้ง EventsService (nested, ใส่ errorPrefix)
 *  และ ActivitiesService (เดี่ยว, ไม่ใส่ prefix) กันค่าไม่ตรงประเภทหลุดเข้า DB (เช่น teamName บนกิจกรรม participant) */
export function prepareRegistrationTypeFields(
  input: RegistrationTypeInput,
  errorPrefix = '',
): PreparedRegistrationTypeFields {
  const registrationType = input.registrationType ?? RegistrationType.PARTICIPANT;

  if (registrationType === RegistrationType.STAFF_VOLUNTEER) {
    const dutyRoleOptions = cleanList(input.dutyRoleOptions);
    if (dutyRoleOptions.length === 0) {
      throw new BadRequestException(
        `${errorPrefix}กรุณาระบุตัวเลือกบทบาท/หน้าที่อย่างน้อย 1 รายการสำหรับประเภทสตาฟฟ์/จิตอาสา`,
      );
    }
    return {
      registrationType,
      dutyRoleOptions,
      dutyShiftOptions: cleanList(input.dutyShiftOptions),
      teamSizeMin: null,
      teamSizeMax: null,
      competitionCategoryOptions: [],
    };
  }

  if (registrationType === RegistrationType.CONTESTANT) {
    if (input.teamSizeMin != null && input.teamSizeMax != null && input.teamSizeMin > input.teamSizeMax) {
      throw new BadRequestException(`${errorPrefix}จำนวนสมาชิกทีมขั้นต่ำต้องไม่มากกว่าขั้นสูงสุด`);
    }
    return {
      registrationType,
      dutyRoleOptions: [],
      dutyShiftOptions: [],
      teamSizeMin: input.teamSizeMin ?? null,
      teamSizeMax: input.teamSizeMax ?? null,
      competitionCategoryOptions: cleanList(input.competitionCategoryOptions),
    };
  }

  return {
    registrationType: RegistrationType.PARTICIPANT,
    dutyRoleOptions: [],
    dutyShiftOptions: [],
    teamSizeMin: null,
    teamSizeMax: null,
    competitionCategoryOptions: [],
  };
}
