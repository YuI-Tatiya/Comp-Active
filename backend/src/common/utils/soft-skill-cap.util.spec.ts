import { maxSoftSkillLevel } from './soft-skill-cap.util';

describe('maxSoftSkillLevel', () => {
  it('caps short (≤4h) activities at level 1', () => {
    expect(maxSoftSkillLevel(1)).toBe(1);
    expect(maxSoftSkillLevel(4)).toBe(1);
  });

  it('caps activities longer than 4h but under 2 days (< 48h) at level 2', () => {
    expect(maxSoftSkillLevel(4.01)).toBe(2);
    expect(maxSoftSkillLevel(47.99)).toBe(2);
  });

  it('unlocks level 3 for activities 2 days or longer (≥48h), regardless of registration type', () => {
    expect(maxSoftSkillLevel(48)).toBe(3);
    expect(maxSoftSkillLevel(72.01)).toBe(3);
    expect(maxSoftSkillLevel(100)).toBe(3);
  });
});
