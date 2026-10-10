/** ระดับที่บันทึกจริงของป้าย ผ่าน/ดี/ดีเยี่ยม — ต้องตรงกับ SOFT_SKILL_TIERS ฝั่ง frontend */
export const SOFT_SKILL_TIER_VALUES = [1, 2, 3] as const;

/**
 * เพดานระดับ Soft Skills ตามระยะเวลากิจกรรม — กันไม่ให้กิจกรรมสั้นๆ ได้คะแนนระดับสูง
 * (เช่น อบรม 2 ชม. ไม่มีทางพิสูจน์ "ภาวะผู้นำ" ได้จริง) ไม่ว่าผู้จัดจะตั้งใจให้คะแนนสูงแค่ไหนก็ตาม
 * ใช้ได้กับกิจกรรมทุกประเภทการรับสมัครเหมือนกันหมด (ไม่แยกสตาฟฟ์/ผู้เข้าร่วมทั่วไป — คุมด้วยระยะเวลาอย่างเดียว)
 *
 * durationHours ≤ 4   → เพดานระดับ 1 (ผ่าน)
 * durationHours < 48  → เพดานระดับ 2 (+ ดี)
 * durationHours ≥ 48  → เพดานระดับ 3 (+ ดีเยี่ยม) — "2 วันขึ้นไป"
 */
export function maxSoftSkillLevel(durationHours: number): 1 | 2 | 3 {
  if (durationHours <= 4) return 1;
  if (durationHours >= 48) return 3;
  return 2;
}
