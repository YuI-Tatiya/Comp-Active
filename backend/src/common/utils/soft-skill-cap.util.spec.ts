import { maxSoftSkillLevel } from './soft-skill-cap.util';
import { RegistrationType } from '../enums/status.enum';

describe('maxSoftSkillLevel', () => {
  it('caps short (≤4h) non-project activities at level 2', () => {
    expect(maxSoftSkillLevel(1, RegistrationType.PARTICIPANT, false)).toBe(2);
    expect(maxSoftSkillLevel(4, RegistrationType.STAFF_VOLUNTEER, false)).toBe(2);
  });

  it('caps 1-2 day activities (≤48h) at level 3', () => {
    expect(maxSoftSkillLevel(4.01, RegistrationType.PARTICIPANT, false)).toBe(3);
    expect(maxSoftSkillLevel(48, RegistrationType.STAFF_VOLUNTEER, false)).toBe(3);
  });

  it('unlocks level 5 for staff_volunteer activities over 72h', () => {
    expect(maxSoftSkillLevel(72.01, RegistrationType.STAFF_VOLUNTEER, false)).toBe(5);
  });

  it('unlocks level 5 for a staff_volunteer sub-activity of a multi-activity project, even if that sub-activity is short on its own (≤4h)', () => {
    // ต้องเช็คเงื่อนไข isProject ก่อน duration เสมอ — บั๊กที่เคยเจอคือ early-return ของ ≤4h ตัดหน้า isProject ไปก่อน
    expect(maxSoftSkillLevel(3, RegistrationType.STAFF_VOLUNTEER, true)).toBe(5);
  });

  it('does NOT unlock level 5 for long activities that are not staff_volunteer, even inside a project', () => {
    expect(maxSoftSkillLevel(100, RegistrationType.PARTICIPANT, true)).toBe(3);
    expect(maxSoftSkillLevel(100, RegistrationType.CONTESTANT, true)).toBe(3);
  });

  it('does NOT unlock level 5 for staff_volunteer activities that are short and standalone (not a project)', () => {
    expect(maxSoftSkillLevel(48, RegistrationType.STAFF_VOLUNTEER, false)).toBe(3);
  });
});
