import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AttendanceStatus } from '../../../common/enums/status.enum';

/** Prisma layer ของการประเมินรอบด้าน (ตนเอง/เพื่อน) — logic อยู่ที่ AssessmentsService */
@Injectable()
export class AssessmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** ข้อมูลกิจกรรมที่ใช้ตัดสินสิทธิ์ (Tier 3), เจ้าของ, สถานะจบ และสวิตช์โหมด */
  findActivityForAssessment(activityId: number) {
    return this.prisma.activity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        organizerId: true,
        status: true,
        peerAssessmentEnabled: true,
        registrationType: true,
        startAt: true,
        endAt: true,
        softSkills: { select: { skillType: true, rate: true } },
        // จำนวนกิจกรรมย่อยของงานแม่ — ใช้ตัดสินว่าเป็น "โครงการ" (>1) เหมือนตอนสร้างกิจกรรม
        event: { select: { _count: { select: { activities: true } } } },
      },
    });
  }

  /**
   * สลับสวิตช์โหมดประเมินรอบด้าน พร้อมสถานะคะแนนของกิจกรรมนั้นใน transaction เดียว — ต้องไปด้วยกันเสมอ ไม่งั้นนักศึกษา
   * จะเห็น/ไม่เห็นคะแนนผิดจากโหมดที่ผู้จัดเลือก
   * - เปิด: แถวที่ approved และ "ยังไม่เคยผ่านการอนุมัติ 360°" → pending_approval (ค่าที่อนุมัติแล้วคงเดิม)
   * - ปิด: แถว pending_approval → approved คืนคะแนนที่ผู้จัดตั้งไว้ให้นักศึกษาทันที (ทางออกแบบนุ่มถ้าผู้จัดเปลี่ยนใจ/ลืมอนุมัติ)
   */
  setEnabled(activityId: number, enabled: boolean) {
    return this.prisma.$transaction(async (tx) => {
      await tx.activity.update({ where: { id: activityId }, data: { peerAssessmentEnabled: enabled } });

      if (enabled) {
        await tx.evaluation.updateMany({
          where: { registration: { activityId }, status: 'approved' as any, approval: { is: null } },
          data: { status: 'pending_approval' as any },
        });
      } else {
        await tx.evaluation.updateMany({
          where: { registration: { activityId }, status: 'pending_approval' as any },
          data: { status: 'approved' as any },
        });
      }
    });
  }

  /** ผู้ที่เช็คอินแล้วเท่านั้นที่ได้รับ/ให้การประเมิน */
  findAttendedRegistrations(activityId: number) {
    return this.prisma.registration.findMany({
      where: { activityId, attendance: AttendanceStatus.ATTENDED as any },
      select: { id: true, dutyRole: true, student: { select: { name: true } } },
      orderBy: { id: 'asc' },
    });
  }

  findAssignmentsByActivity(activityId: number) {
    return this.prisma.assessmentAssignment.findMany({
      where: { activityId },
      select: { id: true, assessorRegistrationId: true, targetRegistrationId: true, source: true, submittedAt: true },
    });
  }

  /** idempotent — คู่ (assessor, target) ที่มีอยู่แล้วถูกข้าม ทำให้เรียกซ้ำ/พร้อมกันได้อย่างปลอดภัย */
  createAssignments(
    rows: { activityId: number; assessorRegistrationId: number; targetRegistrationId: number; source: 'self' | 'peer' }[],
  ) {
    return this.prisma.assessmentAssignment.createMany({ data: rows, skipDuplicates: true });
  }

  /** ตรวจว่า registration เป็นของนักศึกษาคนนี้ + ข้อมูลกิจกรรมที่ต้องใช้ตัดสินว่าเปิดประเมินได้หรือยัง */
  findRegistrationForStudent(registrationId: number) {
    return this.prisma.registration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        studentId: true,
        attendance: true,
        activity: {
          select: { id: true, status: true, peerAssessmentEnabled: true, softSkills: { select: { skillType: true } } },
        },
      },
    });
  }

  /** ใบงานของผู้ประเมินคนนี้ — คืนชื่อผู้ถูกประเมิน (ไม่ใช่รหัสนักศึกษา/อีเมล) และระดับที่ตัวเองส่งไปแล้ว */
  findAssignmentsByAssessor(assessorRegistrationId: number) {
    return this.prisma.assessmentAssignment.findMany({
      where: { assessorRegistrationId },
      select: {
        id: true,
        source: true,
        submittedAt: true,
        scores: { select: { skillType: true, score: true } },
        target: { select: { dutyRole: true, student: { select: { name: true } } } },
      },
      orderBy: { id: 'asc' },
    });
  }

  findAssignmentForSubmit(assignmentId: number) {
    return this.prisma.assessmentAssignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        submittedAt: true,
        assessor: { select: { studentId: true } },
        activity: {
          select: { status: true, peerAssessmentEnabled: true, softSkills: { select: { skillType: true } } },
        },
      },
    });
  }

  /**
   * ส่งใบงานครั้งเดียว — ปิดใบงาน (submittedAt) กับเขียนระดับใน transaction เดียว
   * `updateMany where submittedAt = null` ทำให้ส่งซ้ำ/ส่งพร้อมกันได้ผลสำเร็จแค่ครั้งเดียว (คืน false ถ้าถูกส่งไปก่อนแล้ว)
   */
  submitAssignment(assignmentId: number, scores: { skillType: string; score: number }[]) {
    return this.prisma.$transaction(async (tx) => {
      const closed = await tx.assessmentAssignment.updateMany({
        where: { id: assignmentId, submittedAt: null },
        data: { submittedAt: new Date() },
      });
      if (closed.count === 0) return false;

      await tx.assessmentScore.createMany({
        data: scores.map((s) => ({ assignmentId, skillType: s.skillType as any, score: s.score })),
      });
      return true;
    });
  }
}
