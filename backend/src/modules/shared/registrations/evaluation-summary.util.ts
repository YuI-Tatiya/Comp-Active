import { EVALUATION_SCORE_FIELDS } from './evaluation-visibility.util';

export type SkillField = (typeof EVALUATION_SCORE_FIELDS)[number];
export type SkillTotals = Record<SkillField, number>;

export function emptyTotals(): SkillTotals {
  return Object.fromEntries(EVALUATION_SCORE_FIELDS.map((f) => [f, 0])) as SkillTotals;
}

/**
 * รวมคะแนน 12 ทักษะของแถว Evaluation — ใช้ร่วมกันระหว่างแดชบอร์ด (getMySkills) และเอกสารรับรอง
 * เพื่อให้ตัวเลขใน PDF ตรงกับหน้าจอเสมอ (ผู้เรียกต้องกรองแถวที่อนุมัติแล้วมาก่อน)
 */
export function summarizeEvaluations(rows: SkillTotals[]) {
  const total = emptyTotals();
  for (const row of rows) {
    for (const field of EVALUATION_SCORE_FIELDS) total[field] += row[field];
  }

  const count = rows.length;
  const average = emptyTotals();
  for (const field of EVALUATION_SCORE_FIELDS) {
    average[field] = count === 0 ? 0 : Number((total[field] / count).toFixed(2));
  }

  const totalScore = EVALUATION_SCORE_FIELDS.reduce((sum, field) => sum + total[field], 0);
  return { count, total, average, totalScore };
}
