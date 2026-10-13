import { summarizeEvaluations, emptyTotals } from './evaluation-summary.util';
import { EVALUATION_SCORE_FIELDS } from './evaluation-visibility.util';

const row = (n: number, overrides: Record<string, number> = {}) => ({
  ...emptyTotals(),
  ...Object.fromEntries(EVALUATION_SCORE_FIELDS.map((f) => [f, n])),
  ...overrides,
});

describe('summarizeEvaluations', () => {
  it('ไม่มีแถว → ทุกค่าเป็น 0 และ count = 0', () => {
    const result = summarizeEvaluations([]);
    expect(result.count).toBe(0);
    expect(result.totalScore).toBe(0);
    expect(result.average).toEqual(emptyTotals());
    expect(result.total).toEqual(emptyTotals());
  });

  it('รวมต่อทักษะและรวมทุกทักษะ', () => {
    const result = summarizeEvaluations([row(2), row(4)]);
    expect(result.count).toBe(2);
    expect(result.total.communication).toBe(6);
    expect(result.totalScore).toBe(72);
    expect(result.average.leadership).toBe(3);
  });

  it('ปัดค่าเฉลี่ยทศนิยม 2 ตำแหน่ง', () => {
    // 1 + 0 + 0 = 1 / 3 = 0.3333...
    const result = summarizeEvaluations([row(0, { creativity: 1 }), row(0), row(0)]);
    expect(result.average.creativity).toBe(0.33);
  });
});
