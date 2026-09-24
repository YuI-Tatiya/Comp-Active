import { RegistrationType } from '../enums/status.enum';

/**
 * เพดานระดับ Soft Skills ตามระยะเวลากิจกรรม — กันไม่ให้กิจกรรมสั้นๆ ได้คะแนนระดับสูง
 * (เช่น อบรม 2 ชม. ไม่มีทางพิสูจน์ "ภาวะผู้นำ" ได้จริง) ไม่ว่าผู้จัดจะตั้งใจให้คะแนนสูงแค่ไหนก็ตาม
 *
 * durationHours ≤ 4   → เพดานระดับ 2 (Awareness/Understanding)
 * durationHours ≤ 48  → เพดานระดับ 3 (+ Application)
 * durationHours > 72  หรือเป็นกิจกรรมย่อยในโครงการหลายกิจกรรม (isProject) และเป็นสตาฟฟ์/จิตอาสา → เพดานระดับ 5
 * นอกนั้น → เพดานระดับ 3 (ยาวแต่ไม่ใช่สตาฟฟ์/โครงการ ยังไม่ปลดล็อกระดับสูงสุด)
 */
export function maxSoftSkillLevel(durationHours: number, registrationType: string, isProject: boolean): 2 | 3 | 5 {
  // เช็คเงื่อนไขปลดล็อกระดับสูงสุดก่อนเสมอ — "ทำโครงการ" ต้องปลดล็อกได้แม้กิจกรรมย่อยตัวนั้นจะสั้น
  // (ความรับผิดชอบมาจากภาพรวมของโครงการ ไม่ใช่ระยะเวลาของกิจกรรมย่อยแต่ละตัวเดี่ยวๆ)
  if (registrationType === RegistrationType.STAFF_VOLUNTEER && (durationHours > 72 || isProject)) return 5;
  if (durationHours <= 4) return 2;
  if (durationHours <= 48) return 3;
  return 3;
}
