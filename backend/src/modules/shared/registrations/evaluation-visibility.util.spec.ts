import { APPROVED_ONLY, EVALUATION_SCORE_FIELDS, maskUnapprovedEvaluation } from './evaluation-visibility.util';
import { SKILL_TYPE_TO_FIELD } from './evaluation.service';

function evaluation(status: string) {
  return {
    id: 7,
    registrationId: 3,
    evaluatorId: 1,
    status,
    comment: 'ผู้จัดเขียนไว้',
    createdAt: new Date('2027-01-01T00:00:00.000Z'),
    ...Object.fromEntries(EVALUATION_SCORE_FIELDS.map((field) => [field, 5])),
  };
}

describe('APPROVED_ONLY', () => {
  it('กรองเฉพาะแถวที่อนุมัติแล้ว (ใช้กับผู้อ่านฝั่งนักศึกษา/สาธารณะ/แอดมิน)', () => {
    expect(APPROVED_ONLY).toEqual({ status: 'approved' });
  });
});

describe('EVALUATION_SCORE_FIELDS', () => {
  it('ครบทุกคอลัมน์คะแนนของ Evaluation (กันลืมเมื่อเพิ่มทักษะใหม่ — ไม่งั้นคะแนนจะรั่วผ่านการปิดบัง)', () => {
    expect([...EVALUATION_SCORE_FIELDS].sort()).toEqual(Object.values(SKILL_TYPE_TO_FIELD).sort());
  });
});

describe('maskUnapprovedEvaluation', () => {
  it('แถวที่ยังไม่อนุมัติ: คงแถวไว้ (frontend ใช้ "มี evaluation" แทน "เช็คอินแล้ว") แต่คะแนนทุกด้านเป็น 0 และไม่มี comment', () => {
    const masked: any = maskUnapprovedEvaluation(evaluation('pending_approval'));

    expect(masked).not.toBeNull();
    expect(masked.id).toBe(7);
    expect(masked.status).toBe('pending_approval');
    expect(masked.comment).toBeNull();
    for (const field of EVALUATION_SCORE_FIELDS) expect(masked[field]).toBe(0);
  });

  it('แถวที่อนุมัติแล้ว: คืนตามเดิมทุกค่า', () => {
    const original = evaluation('approved');
    expect(maskUnapprovedEvaluation(original)).toEqual(original);
  });

  it('ไม่แก้ object ต้นฉบับ (ผู้เรียกอื่นอาจถือ reference เดียวกัน)', () => {
    const original = evaluation('pending_approval');
    maskUnapprovedEvaluation(original);
    expect((original as any).leadership).toBe(5);
    expect(original.comment).toBe('ผู้จัดเขียนไว้');
  });

  it('ไม่มีแถว (ยังไม่เช็คอิน) → null', () => {
    expect(maskUnapprovedEvaluation(null)).toBeNull();
  });
});
