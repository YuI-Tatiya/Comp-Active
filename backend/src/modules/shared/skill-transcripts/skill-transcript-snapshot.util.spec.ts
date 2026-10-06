// skill-transcript-snapshot.util.spec.ts
import { buildTranscriptSnapshot, TranscriptEvaluationRow } from './skill-transcript-snapshot.util';
import { EVALUATION_SCORE_FIELDS } from '../registrations/evaluation-visibility.util';

const scores = (n: number) => Object.fromEntries(EVALUATION_SCORE_FIELDS.map((f) => [f, n])) as Record<(typeof EVALUATION_SCORE_FIELDS)[number], number>;
const row = (n: number, name: string, date: string): TranscriptEvaluationRow => ({
  ...scores(n),
  registration: { activity: { name, date: new Date(date) } },
});

describe('buildTranscriptSnapshot', () => {
  const holder = { name: 'สมชาย ใจดี', studentId: '643380001-1' };

  it('คำนวณสรุป ค่าเฉลี่ย และรายการกิจกรรม (ใหม่ → เก่า)', () => {
    const snap = buildTranscriptSnapshot(holder, [
      row(2, 'กิจกรรม A', '2026-01-10'),
      row(4, 'กิจกรรม B', '2026-03-05'),
    ]);

    expect(snap.version).toBe(1);
    expect(snap.holder).toEqual(holder);
    expect(snap.summary).toEqual({ totalScore: 72, activityCount: 2, overallAverage: 3 });
    expect(snap.averages.communication).toBe(3);
    expect(snap.activities.map((a) => a.name)).toEqual(['กิจกรรม B', 'กิจกรรม A']);
    expect(snap.activities[0]).toEqual({ name: 'กิจกรรม B', date: '2026-03-05T00:00:00.000Z', totalScore: 48 });
  });

  it('ไม่มีอีเมล เบอร์โทร หรืออันดับใน snapshot (ความเป็นส่วนตัว)', () => {
    const json = JSON.stringify(buildTranscriptSnapshot({ ...holder, email: 'a@b.c', phone: '0812345678' } as never, [row(1, 'X', '2026-01-01')]));
    expect(json).not.toMatch(/email|phone|rank|a@b\.c|0812345678/);
  });

  it('เก็บชื่อกิจกรรมตามจริง ไม่ตัด ไม่ escape (การ escape เป็นหน้าที่ของตอนเรนเดอร์)', () => {
    const name = '<b>งาน</b> "พิเศษ" ' + 'ก'.repeat(300);
    const snap = buildTranscriptSnapshot(holder, [row(1, name, '2026-01-01')]);
    expect(snap.activities[0].name).toBe(name);
  });
});
