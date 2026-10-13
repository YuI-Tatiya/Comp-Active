import { diffHours } from '../../../common/utils/time.util';
import { maxSoftSkillLevel } from '../../../common/utils/soft-skill-cap.util';

/** ข้อมูลกิจกรรมที่ใช้ตัดสินว่าเข้าเงื่อนไขการประเมินแบบ Tier 3 หรือไม่ */
export interface Tier3Candidate {
  startAt: Date | null;
  endAt: Date | null;
  softSkills: { skillType: string; rate: number }[];
}

export interface Tier3Assessment {
  eligible: boolean;
  reason?: string;
  cap: 1 | 2 | 3;
}

/**
 * กิจกรรม Tier 3 = กิจกรรมที่ปลดล็อกระดับสูงสุด (3) ตาม maxSoftSkillLevel — ยาว 2 วันขึ้นไป (48 ชั่วโมง)
 * ใช้ได้กับทุกประเภทการรับสมัคร เป็นเงื่อนไขเดียวที่ใช้กับทั้งการประเมินรายฝ่าย (Batch) และการประเมินรอบด้าน (ตนเอง/เพื่อน)
 * server เป็นแหล่งความจริง — frontend แค่แสดงผลตามที่ได้รับ
 */
export function assessTier3Eligibility(activity: Tier3Candidate): Tier3Assessment {
  if (!activity.startAt || !activity.endAt) {
    return { eligible: false, cap: 1, reason: 'กิจกรรมนี้ไม่มีวันเวลาเริ่ม-สิ้นสุดที่แน่ชัด จึงคำนวณระดับสูงสุดไม่ได้' };
  }
  const durationHours = diffHours(activity.startAt, activity.endAt);
  const cap = maxSoftSkillLevel(durationHours);
  if (cap !== 3) {
    return {
      eligible: false,
      cap,
      reason: 'กิจกรรมนี้ให้คะแนนอัตโนมัติตอนเช็คอิน — การประเมินรายฝ่ายและรอบด้านใช้กับกิจกรรมที่ยาว 2 วันขึ้นไป',
    };
  }
  if (activity.softSkills.length === 0) {
    return { eligible: false, cap, reason: 'กิจกรรมนี้ยังไม่ได้เลือกทักษะที่ประเมิน' };
  }
  return { eligible: true, cap };
}
