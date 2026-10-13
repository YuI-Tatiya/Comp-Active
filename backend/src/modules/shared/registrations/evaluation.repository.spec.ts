import { EvaluationsRepository } from './evaluation.repository';

describe('EvaluationsRepository — ผู้อ่านคะแนนฝั่งนักศึกษา/สาธารณะ/แอดมินต้องเห็นเฉพาะแถวที่อนุมัติแล้ว', () => {
  let prisma: { evaluation: { findMany: jest.Mock; aggregate: jest.Mock } };
  let repo: EvaluationsRepository;

  beforeEach(() => {
    prisma = { evaluation: { findMany: jest.fn().mockResolvedValue([]), aggregate: jest.fn().mockResolvedValue({}) } };
    repo = new EvaluationsRepository(prisma as any);
  });

  it('findByStudentWithActivity (คะแนนของฉัน/เหรียญ/ประวัติ) กรอง approved และยังกรองตามเจ้าของ', async () => {
    await repo.findByStudentWithActivity(42);
    expect(prisma.evaluation.findMany.mock.calls[0][0].where).toEqual({
      registration: { studentId: 42 },
      status: 'approved',
    });
  });

  it('findAllScoresWithStudent (อันดับ) กรอง approved', async () => {
    await repo.findAllScoresWithStudent();
    expect(prisma.evaluation.findMany.mock.calls[0][0].where).toEqual({ status: 'approved' });
  });

  it('aggregateSkills (สถิติแอดมิน) กรอง approved', async () => {
    await repo.aggregateSkills();
    expect(prisma.evaluation.aggregate.mock.calls[0][0].where).toEqual({ status: 'approved' });
  });

  it('findByActivity (ฝั่งผู้จัด) ไม่กรอง — ผู้จัดต้องเห็นแถวที่รออนุมัติ', async () => {
    await repo.findByActivity(5);
    expect(prisma.evaluation.findMany.mock.calls[0][0].where).toEqual({ registration: { activityId: 5 } });
  });
});
