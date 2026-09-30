import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EvaluationStatus } from '../../../common/enums/status.enum';

export interface ApprovalWrite {
  evaluationId: number;
  /** คอลัมน์คะแนนของ Evaluation ที่จะเขียน (เฉพาะทักษะที่กิจกรรมเลือก) */
  scores: Record<string, number>;
  breakdown: Record<string, unknown>;
  overrideReason: string | null;
}

/** Prisma layer ของการอนุมัติผลประเมินรอบด้าน — logic อยู่ที่ EvaluationApprovalService */
@Injectable()
export class EvaluationApprovalRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** ใบงานที่ส่งแล้วของกิจกรรม พร้อมระดับ — วัตถุดิบของคะแนนสุทธิ (ตนเอง/เพื่อน) */
  findSubmittedScoresByActivity(activityId: number) {
    return this.prisma.assessmentAssignment.findMany({
      where: { activityId, submittedAt: { not: null } },
      select: {
        assessorRegistrationId: true,
        targetRegistrationId: true,
        source: true,
        scores: { select: { skillType: true, score: true } },
      },
    });
  }

  /** ผลอนุมัติที่ล็อกไว้แล้วของกิจกรรม (breakdown + เหตุผล) — แถวที่อนุมัติแล้วแสดงจากค่านี้ ไม่คำนวณใหม่ */
  async findApprovalsByActivity(activityId: number) {
    const rows = await this.prisma.evaluationApproval.findMany({
      where: { evaluation: { registration: { activityId } } },
      select: { breakdown: true, overrideReason: true, evaluation: { select: { registrationId: true } } },
    });
    return rows.map((r) => ({
      registrationId: r.evaluation.registrationId,
      breakdown: r.breakdown as Record<string, unknown>,
      overrideReason: r.overrideReason,
    }));
  }

  /**
   * อนุมัติหลายรายใน transaction เดียว — เขียนค่าสุดท้ายลง Evaluation + status=approved + upsert แถว audit
   * ทั้งชุดสำเร็จหรือล้มพร้อมกัน (ไม่ให้มีบางคนอนุมัติค้างครึ่งทาง)
   * อนุมัติซ้ำ (แก้ค่า) ได้: upsert ทับด้วยผู้อนุมัติ/เวลา/เหตุผลล่าสุด
   */
  approveMany(writes: ApprovalWrite[], approvedById: number) {
    return this.prisma.$transaction(async (tx) => {
      const approvedAt = new Date();
      for (const w of writes) {
        await tx.evaluation.update({
          where: { id: w.evaluationId },
          data: { ...w.scores, status: EvaluationStatus.APPROVED as any },
        });
        await tx.evaluationApproval.upsert({
          where: { evaluationId: w.evaluationId },
          create: {
            evaluationId: w.evaluationId,
            approvedById,
            approvedAt,
            breakdown: w.breakdown as any,
            overrideReason: w.overrideReason,
          },
          update: { approvedById, approvedAt, breakdown: w.breakdown as any, overrideReason: w.overrideReason },
        });
      }
    });
  }
}
