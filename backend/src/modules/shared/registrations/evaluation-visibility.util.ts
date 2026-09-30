import { EvaluationStatus } from '../../../common/enums/status.enum';

/**
 * ผู้อ่านคะแนน Evaluation ฝั่งนักศึกษา/สาธารณะ/แอดมิน ต้องกรองด้วยค่านี้ — กิจกรรมที่เปิดโหมดประเมินรอบด้าน (360°)
 * จะซ่อนคะแนนจากนักศึกษาจนกว่าผู้จัดจะอนุมัติ ผู้อ่านฝั่งผู้จัดไม่กรอง (ต้องเห็นแถวที่รออนุมัติ)
 */
export const APPROVED_ONLY = { status: EvaluationStatus.APPROVED as any };

/** คอลัมน์คะแนน 12 ด้านของ Evaluation (ต้องตรงกับ SKILL_TYPE_TO_FIELD — มีเทสต์เทียบให้) */
export const EVALUATION_SCORE_FIELDS = [
  'communication',
  'timeManagement',
  'flexibilityAdaptability',
  'teamworkCollaboration',
  'analyticCriticalThinking',
  'decisionMaking',
  'creativity',
  'complexProblemSolving',
  'curiosityLifelongLearning',
  'negotiationPersuasion',
  'leadership',
  'positiveAttitude',
] as const;

/**
 * แถวที่ยังไม่อนุมัติ: "ไม่ทำให้แถวหาย" แต่ปิดคะแนนเป็น 0 และตัด comment
 * เพราะหน้านักศึกษาใช้การมีอยู่ของ evaluation แทน "เช็คอินแล้ว/ประเมินแล้ว" ที่หลายจุด (แท็บ, isActiveRegistration,
 * ชั่วโมงจิตอาสา, ป้าย) ถ้าทำให้หายไปเลยตรรกะเหล่านั้นจะเพี้ยน — ปิดที่ server เพื่อให้แม้ frontend ลืมเช็คก็ไม่มีคะแนนรั่ว
 */
export function maskUnapprovedEvaluation<T extends { status: string; comment: string | null } | null>(evaluation: T): T {
  if (!evaluation || evaluation.status === EvaluationStatus.APPROVED) return evaluation;

  const masked: Record<string, unknown> = { ...evaluation, comment: null };
  for (const field of EVALUATION_SCORE_FIELDS) masked[field] = 0;
  return masked as T;
}
