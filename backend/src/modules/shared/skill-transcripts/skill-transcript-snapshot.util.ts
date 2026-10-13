// skill-transcript-snapshot.util.ts
import { summarizeEvaluations, SkillTotals } from '../registrations/evaluation-summary.util';
import { EVALUATION_SCORE_FIELDS } from '../registrations/evaluation-visibility.util';

export interface SkillTranscriptSnapshot {
  version: 1;
  holder: { name: string; studentId: string | null };
  summary: { totalScore: number; activityCount: number; overallAverage: number };
  averages: SkillTotals;
  activities: { name: string; date: string; totalScore: number }[];
}

export type TranscriptEvaluationRow = SkillTotals & {
  registration: { activity: { name: string; date: Date } };
};

const round2 = (n: number) => Number(n.toFixed(2));

/**
 * ประกอบสแนปช็อตของเอกสารรับรอง — ผู้ถือเก็บเฉพาะ name + studentId (ตั้งใจไม่รับ field อื่นเข้ามาเลย
 * เพราะเอกสารเปิดดูได้โดยทุกคนที่มีรหัส) ผู้เรียกต้องส่งเฉพาะแถวที่อนุมัติแล้ว
 */
export function buildTranscriptSnapshot(
  holder: { name: string; studentId: string | null },
  rows: TranscriptEvaluationRow[],
): SkillTranscriptSnapshot {
  const { count, average, totalScore } = summarizeEvaluations(rows);

  const activities = rows
    .map((r) => ({
      name: r.registration.activity.name,
      date: r.registration.activity.date.toISOString(),
      totalScore: EVALUATION_SCORE_FIELDS.reduce((sum, f) => sum + r[f], 0),
    }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return {
    version: 1,
    holder: { name: holder.name, studentId: holder.studentId },
    summary: {
      totalScore,
      activityCount: count,
      overallAverage: count === 0 ? 0 : round2(totalScore / (count * EVALUATION_SCORE_FIELDS.length)),
    },
    averages: average,
    activities,
  };
}
