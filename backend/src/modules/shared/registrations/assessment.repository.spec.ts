import { AssessmentsRepository } from './assessment.repository';

describe('AssessmentsRepository.setEnabled — สลับสวิตช์และสถานะคะแนนใน transaction เดียว', () => {
  let tx: { activity: { update: jest.Mock }; evaluation: { updateMany: jest.Mock } };
  let repo: AssessmentsRepository;

  beforeEach(() => {
    tx = { activity: { update: jest.fn() }, evaluation: { updateMany: jest.fn() } };
    const prisma = { $transaction: jest.fn(async (cb: any) => cb(tx)) };
    repo = new AssessmentsRepository(prisma as any);
  });

  it('เปิดโหมด: แถวที่ approved และยังไม่เคยผ่านการอนุมัติ 360° กลายเป็น pending_approval (ค่าที่อนุมัติแล้วคงเดิม)', async () => {
    await repo.setEnabled(7, true);

    expect(tx.activity.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { peerAssessmentEnabled: true } });
    expect(tx.evaluation.updateMany).toHaveBeenCalledWith({
      where: { registration: { activityId: 7 }, status: 'approved', approval: { is: null } },
      data: { status: 'pending_approval' },
    });
  });

  it('ปิดโหมด: แถว pending_approval กลับเป็น approved เพื่อให้นักศึกษาเห็นคะแนนที่ผู้จัดตั้งไว้ (ไม่ค้างซ่อนตลอดกาล)', async () => {
    await repo.setEnabled(7, false);

    expect(tx.activity.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { peerAssessmentEnabled: false } });
    expect(tx.evaluation.updateMany).toHaveBeenCalledWith({
      where: { registration: { activityId: 7 }, status: 'pending_approval' },
      data: { status: 'approved' },
    });
  });

  it('ทั้งสองอย่างอยู่ใน transaction เดียว', async () => {
    const prisma = { $transaction: jest.fn(async (cb: any) => cb(tx)) };
    await new AssessmentsRepository(prisma as any).setEnabled(7, true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
