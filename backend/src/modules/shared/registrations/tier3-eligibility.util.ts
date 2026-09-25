import { RegistrationType } from '../../../common/enums/status.enum';
import { diffHours } from '../../../common/utils/time.util';
import { maxSoftSkillLevel } from '../../../common/utils/soft-skill-cap.util';

/** ข้อมูลกิจกรรมที่ใช้ตัดสินว่าเข้าเงื่อนไขการประเมินแบบ Tier 3 หรือไม่ */
export interface Tier3Candidate {
  registrationType: string;
  startAt: Date | null;
  endAt: Date | null;
  softSkills: { skillType: string; rate: number }[];
  event: { _count: { activities: number } } | null;
}

export interface Tier3Assessment {
  eligible: boolean;
  reason?: string;
  cap: 2 | 3 | 5;
}

/**
 * กิจกรรม Tier 3 = สตาฟฟ์/จิตอาสาที่ปลดล็อกระดับสูงสุด (5) — ยาวกว่า 3 วัน หรืออยู่ในโครงการหลายกิจกรรม
 * เป็นเงื่อนไขเดียวที่ใช้กับทั้งการประเมินรายฝ่าย (Batch) และการประเมินรอบด้าน (ตนเอง/เพื่อน)
 * server เป็นแหล่งความจริง — frontend แค่แสดงผลตามที่ได้รับ
 */
export function assessTier3Eligibility(activity: Tier3Candidate): Tier3Assessment {
  if (activity.registrationType !== RegistrationType.STAFF_VOLUNTEER) {
    return { eligible: false, cap: 2, reason: 'ใช้ได้เฉพาะกิจกรรมประเภทสตาฟฟ์/จิตอาสา' };
  }
  if (!activity.startAt || !activity.endAt) {
    return { eligible: false, cap: 2, reason: 'กิจกรรมนี้ไม่มีวันเวลาเริ่ม-สิ้นสุดที่แน่ชัด จึงคำนวณระดับสูงสุดไม่ได้' };
  }
  const durationHours = diffHours(activity.startAt, activity.endAt);
  const isProject = (activity.event?._count.activities ?? 0) > 1;
  const cap = maxSoftSkillLevel(durationHours, activity.registrationType, isProject);
  if (cap !== 5) {
    return {
      eligible: false,
      cap,
      reason:
        'กิจกรรมนี้ให้คะแนนอัตโนมัติตอนเช็คอิน — การประเมินรายฝ่ายและรอบด้านใช้กับสตาฟฟ์ที่ยาวกว่า 3 วัน หรืออยู่ในโครงการหลายกิจกรรม',
    };
  }
  if (activity.softSkills.length === 0) {
    return { eligible: false, cap, reason: 'กิจกรรมนี้ยังไม่ได้เลือกทักษะที่ประเมิน' };
  }
  return { eligible: true, cap };
}
