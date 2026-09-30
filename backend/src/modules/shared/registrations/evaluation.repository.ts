import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRole } from '../../../common/enums/role.enum';
import { STUDENT_BASIC_SELECT } from '../../../common/constants/user-select';
import { APPROVED_ONLY } from './evaluation-visibility.util';

@Injectable()
export class EvaluationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findRegistrationWithActivity(registrationId: number) {
    return this.prisma.registration.findUnique({ where: { id: registrationId }, include: { activity: true } });
  }

  findByRegistrationId(registrationId: number) {
    return this.prisma.evaluation.findUnique({ where: { registrationId }, include: { approval: { select: { id: true } } } });
  }

  update(registrationId: number, scores: Record<string, any>) {
    return this.prisma.evaluation.update({ where: { registrationId }, data: scores });
  }

  create(registrationId: number, evaluatorId: number, scores: Record<string, any>) {
    return this.prisma.evaluation.create({ data: { registrationId, evaluatorId, ...scores } });
  }

  /** ใช้ตอนเช็คอิน — ต้องอยู่ใน $transaction เดียวกับการอัปเดต Registration ผ่าน tx client ที่ส่งมา */
  findByRegistrationIdTx(tx: any, registrationId: number) {
    return tx.evaluation.findUnique({ where: { registrationId } });
  }

  /** status ระบุตอนสร้างเสมอ: กิจกรรมที่เปิดโหมดประเมินรอบด้านสร้างเป็น pending_approval (ซ่อนจากนักศึกษาจนกว่าผู้จัดอนุมัติ) */
  createTx(tx: any, registrationId: number, evaluatorId: number, scores: Record<string, any>, status: string) {
    return tx.evaluation.create({ data: { registrationId, evaluatorId, ...scores, status } });
  }

  /** คะแนนฐานของฝ่ายหนึ่ง — ใช้ตอนเช็คอินให้คนที่มาทีหลังได้ค่าตรงกับฝ่ายตัวเอง */
  findBaselinesForDutyRoleTx(tx: any, activityId: number, dutyRole: string) {
    return tx.evaluationBaseline.findMany({ where: { activityId, dutyRole } });
  }

  // ─── Batch Evaluation ────────────────────────────────────────────────────────

  /** ข้อมูลกิจกรรมที่ใช้ตัดสินสิทธิ์ใช้ Batch (ประเภท/ระยะเวลา/โครงการ) + ทักษะที่เลือกไว้ */
  findActivityForBatch(activityId: number) {
    return this.prisma.activity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        organizerId: true,
        registrationType: true,
        startAt: true,
        endAt: true,
        dutyRoleOptions: true,
        softSkills: { select: { skillType: true, rate: true } },
        // จำนวนกิจกรรมย่อยของงานแม่ — ใช้ตัดสินว่าเป็น "โครงการ" (>1) เหมือนตอนสร้างกิจกรรม
        event: { select: { _count: { select: { activities: true } } } },
      },
    });
  }

  findAttendedForBatch(activityId: number) {
    return this.prisma.registration.findMany({
      where: { activityId, attendance: 'attended' as any },
      select: {
        id: true,
        dutyRole: true,
        student: { select: { name: true, studentId: true } },
        // approval ใช้บอกว่าแถวนี้ผ่านการอนุมัติ 360° แล้ว (ถูกล็อก) — ดึงแค่ id ไม่ดึง breakdown
        evaluation: { include: { approval: { select: { id: true } } } },
        evaluationExceptions: { select: { skillType: true, score: true, reason: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  findBaselinesByActivity(activityId: number) {
    return this.prisma.evaluationBaseline.findMany({ where: { activityId } });
  }

  /**
   * บันทึกสถานะ Batch ทั้งชุดใน transaction เดียว — ฐาน/ข้อยกเว้นถูกแทนที่ทั้งหมด แล้วเขียนคะแนนที่คำนวณแล้วลง Evaluation
   * ห้ามแยกเป็นหลายคำสั่งนอก transaction: ถ้าล้มครึ่งทางจะได้คะแนนที่ไม่ตรงกับฐาน/ข้อยกเว้นที่เก็บไว้
   */
  replaceBatchState(
    activityId: number,
    updatedById: number,
    baselines: { dutyRole: string; skillType: string; score: number }[],
    exceptions: { registrationId: number; skillType: string; score: number; reason: string }[],
    evaluationUpdates: { registrationId: number; scores: Record<string, number> }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.evaluationBaseline.deleteMany({ where: { activityId } });
      if (baselines.length) {
        await tx.evaluationBaseline.createMany({
          data: baselines.map((b) => ({ activityId, dutyRole: b.dutyRole, skillType: b.skillType as any, score: b.score })),
        });
      }

      await tx.evaluationException.deleteMany({ where: { registration: { activityId } } });
      if (exceptions.length) {
        await tx.evaluationException.createMany({
          data: exceptions.map((e) => ({
            registrationId: e.registrationId,
            skillType: e.skillType as any,
            score: e.score,
            reason: e.reason,
            updatedById,
          })),
        });
      }

      for (const u of evaluationUpdates) {
        await tx.evaluation.update({ where: { registrationId: u.registrationId }, data: u.scores });
      }
    });
  }

  /** คะแนนของนักศึกษาเอง — เฉพาะที่อนุมัติแล้ว (กิจกรรม 360° ซ่อนคะแนนจนกว่าผู้จัดจะอนุมัติ) */
  findByStudentWithActivity(studentId: number) {
    return this.prisma.evaluation.findMany({
      where: { registration: { studentId }, ...APPROVED_ONLY },
      include: { registration: { include: { activity: true } } },
    });
  }

  async findActivityOrganizerId(activityId: number): Promise<number | null> {
    const activity = await this.prisma.activity.findUnique({ where: { id: activityId }, select: { organizerId: true } });
    return activity?.organizerId ?? null;
  }

  /** เลือก field ของนักศึกษาผ่าน allow-list — ดูเหตุผลใน common/constants/user-select.ts */
  findByActivity(activityId: number) {
    return this.prisma.evaluation.findMany({
      where: { registration: { activityId } },
      include: { registration: { include: { student: { select: STUDENT_BASIC_SELECT } } } },
    });
  }

  /** ทุกแถวคะแนน พร้อม studentId เจ้าของ — ใช้คำนวณอันดับเทียบกับนักศึกษาทั้งระบบ */
  findAllScoresWithStudent() {
    return this.prisma.evaluation.findMany({
      where: APPROVED_ONLY,
      select: {
        communication: true,
        timeManagement: true,
        flexibilityAdaptability: true,
        teamworkCollaboration: true,
        analyticCriticalThinking: true,
        decisionMaking: true,
        creativity: true,
        complexProblemSolving: true,
        curiosityLifelongLearning: true,
        negotiationPersuasion: true,
        leadership: true,
        positiveAttitude: true,
        registration: { select: { studentId: true } },
      },
    });
  }

  countStudents() {
    return this.prisma.user.count({ where: { role: UserRole.STUDENT } });
  }

  aggregateSkills() {
    return this.prisma.evaluation.aggregate({
      where: APPROVED_ONLY,
      _avg: {
        communication: true,
        timeManagement: true,
        flexibilityAdaptability: true,
        teamworkCollaboration: true,
        analyticCriticalThinking: true,
        decisionMaking: true,
        creativity: true,
        complexProblemSolving: true,
        curiosityLifelongLearning: true,
        negotiationPersuasion: true,
        leadership: true,
        positiveAttitude: true,
      },
      _count: true,
    });
  }
}
