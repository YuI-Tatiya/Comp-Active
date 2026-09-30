import { BadRequestException } from '@nestjs/common';
import { prepareRegistrationTypeFields } from './registration-type.util';
import { RegistrationType } from '../enums/status.enum';

describe('prepareRegistrationTypeFields', () => {
  it('defaults to participant with empty config when nothing is provided', () => {
    expect(prepareRegistrationTypeFields({})).toEqual({
      registrationType: RegistrationType.PARTICIPANT,
      dutyRoleOptions: [],
      dutyShiftOptions: [],
      teamSizeMin: null,
      teamSizeMax: null,
      competitionCategoryOptions: [],
    });
  });

  it('ignores staff_volunteer/contestant config values sent for a participant activity', () => {
    const result = prepareRegistrationTypeFields({
      registrationType: RegistrationType.PARTICIPANT,
      dutyRoleOptions: ['ลงทะเบียนหน้างาน'],
      teamSizeMin: 2,
    });
    expect(result.dutyRoleOptions).toEqual([]);
    expect(result.teamSizeMin).toBeNull();
  });

  describe('staff_volunteer', () => {
    it('trims and drops blank entries from dutyRoleOptions/dutyShiftOptions', () => {
      const result = prepareRegistrationTypeFields({
        registrationType: RegistrationType.STAFF_VOLUNTEER,
        dutyRoleOptions: [' ลงทะเบียนหน้างาน ', '', 'ดูแลอุปกรณ์'],
        dutyShiftOptions: ['กะเช้า', '  '],
      });
      expect(result.dutyRoleOptions).toEqual(['ลงทะเบียนหน้างาน', 'ดูแลอุปกรณ์']);
      expect(result.dutyShiftOptions).toEqual(['กะเช้า']);
    });

    it('throws when no duty role option is given', () => {
      expect(() => prepareRegistrationTypeFields({ registrationType: RegistrationType.STAFF_VOLUNTEER })).toThrow(
        BadRequestException,
      );
    });

    it('throws when dutyRoleOptions is only blank strings', () => {
      expect(() =>
        prepareRegistrationTypeFields({ registrationType: RegistrationType.STAFF_VOLUNTEER, dutyRoleOptions: ['  '] }),
      ).toThrow(BadRequestException);
    });

    it('prefixes the error message when errorPrefix is given', () => {
      expect(() =>
        prepareRegistrationTypeFields({ registrationType: RegistrationType.STAFF_VOLUNTEER }, 'กิจกรรมลำดับที่ 2: '),
      ).toThrow('กิจกรรมลำดับที่ 2: กรุณาระบุตัวเลือกบทบาท/หน้าที่อย่างน้อย 1 รายการสำหรับประเภทสตาฟฟ์/จิตอาสา');
    });

    it('clears contestant-only fields', () => {
      const result = prepareRegistrationTypeFields({
        registrationType: RegistrationType.STAFF_VOLUNTEER,
        dutyRoleOptions: ['ลงทะเบียนหน้างาน'],
      });
      expect(result.teamSizeMin).toBeNull();
      expect(result.teamSizeMax).toBeNull();
      expect(result.competitionCategoryOptions).toEqual([]);
    });
  });

  describe('contestant', () => {
    it('accepts a valid team size range and trims competitionCategoryOptions', () => {
      const result = prepareRegistrationTypeFields({
        registrationType: RegistrationType.CONTESTANT,
        teamSizeMin: 2,
        teamSizeMax: 5,
        competitionCategoryOptions: [' รุ่นเยาวชน ', ''],
      });
      expect(result.teamSizeMin).toBe(2);
      expect(result.teamSizeMax).toBe(5);
      expect(result.competitionCategoryOptions).toEqual(['รุ่นเยาวชน']);
    });

    it('throws when teamSizeMin is greater than teamSizeMax', () => {
      expect(() =>
        prepareRegistrationTypeFields({ registrationType: RegistrationType.CONTESTANT, teamSizeMin: 5, teamSizeMax: 2 }),
      ).toThrow(BadRequestException);
    });

    it('allows an unbounded team size (both min/max omitted)', () => {
      const result = prepareRegistrationTypeFields({ registrationType: RegistrationType.CONTESTANT });
      expect(result.teamSizeMin).toBeNull();
      expect(result.teamSizeMax).toBeNull();
    });

    it('clears staff_volunteer-only fields', () => {
      const result = prepareRegistrationTypeFields({
        registrationType: RegistrationType.CONTESTANT,
        teamSizeMin: 1,
        teamSizeMax: 4,
      });
      expect(result.dutyRoleOptions).toEqual([]);
      expect(result.dutyShiftOptions).toEqual([]);
    });
  });
});
