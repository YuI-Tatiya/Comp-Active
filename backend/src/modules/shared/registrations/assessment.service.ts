import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AssessmentsRepository } from './assessment.repository';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';
import { pairPeers } from './assessment-pairing.util';
import { Tier3Candidate, assessTier3Eligibility } from './tier3-eligibility.util';
import { UserRole } from '../../../common/enums/role.enum';
import { ActivityStatus, AssessmentSource, AttendanceStatus } from '../../../common/enums/status.enum';

/** จำนวนเพื่อนที่ประเมินแต่ละคน (และจำนวนเพื่อนที่แต่ละคนต้องประเมิน) — ตามดีไซน์ "≥2 คนต่อคน" */
const PEERS_PER_PERSON = 2;

interface AssignmentRow {
  assessorRegistrationId: number;
  targetRegistrationId: number;
  source: string;
  submittedAt: Date | null;
}

interface AttendedRow {
  id: number;
  dutyRole: string | null;
  student: { name: string };
}

interface AssessmentActivity extends Tier3Candidate {
  id: number;
  organizerId: number;
  status: string;
  peerAssessmentEnabled: boolean;
}

export interface AssessmentProgress {
  self: { submitted: number; total: number };
  peer: { submitted: number; total: number };
}

export interface OrganizerAssessmentState {
  eligible: boolean;
  reason?: string;
  enabled: boolean;
  /** กิจกรรมจบแล้วหรือยัง — ใบงานถูกสร้างและนักศึกษาเริ่มส่งได้หลังจบเท่านั้น */
  completed: boolean;
  /** เฉพาะจำนวน ไม่มีคะแนนดิบ/ตัวตนผู้ให้ — เพื่อนต้องไม่ถูกเปิดเผยว่าใครให้ใคร (ภาพรวมคะแนนเป็นของ Phase 3) */
  progress: AssessmentProgress | null;
  pending: { registrationId: number; name: string; selfDone: boolean; peerGiven: number; peerTotal: number }[];
}

export interface StudentAssessmentTask {
  assignmentId: number;
  source: string;
  /** ชื่อเพื่อนที่ต้องประเมิน — เฉพาะชื่อ ไม่คืนรหัสนักศึกษา/อีเมล; ใบประเมินตนเองเป็น null */
  targetName: string | null;
  targetDutyRole: string | null;
  submitted: boolean;
  /** ระดับที่ตัวเองส่งไปแล้ว (null ถ้ายังไม่ส่ง) */
  myScores: Record<string, number> | null;
}

/**
 * ประเมินรอบด้าน (360°) ฝั่งนักศึกษา — ประเมินตนเอง + เพื่อนที่ระบบจับคู่ให้ เฉพาะกิจกรรม Tier 3 ที่ผู้จัดเปิดโหมดไว้
 *
 * ขั้นนี้ "เก็บข้อมูลอย่างเดียว": ไม่เขียน/อ่านตาราง Evaluation จึงไม่กระทบคะแนนจริง อันดับ และเหรียญ
 * ข้อมูลดิบแยกตามแหล่งและตามผู้ให้ ไว้ให้ขั้นอนุมัติคำนวณคะแนนสุทธิและตรวจย้อนหลังได้
 */
@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);

  constructor(private readonly assessmentsRepository: AssessmentsRepository) {}

  // ─── ฝั่งผู้จัด ─────────────────────────────────────────────────────────────────

  /** ตรวจสิทธิ์ที่ชั้น service ตามกติกาของโปรเจกต์ — role เป็น organizer อย่างเดียวไม่พอ ต้องเป็นเจ้าของกิจกรรมนั้นด้วย */
  private async loadOwnedActivity(callerId: number, callerRole: UserRole, activityId: number) {
    const activity = await this.assessmentsRepository.findActivityForAssessment(activityId);
    if (!activity) throw new NotFoundException('ไม่พบกิจกรรม');
    if (callerRole !== UserRole.ADMIN && activity.organizerId !== callerId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์จัดการการประเมินของกิจกรรมนี้');
    }
    return activity as AssessmentActivity;
  }

  async getOrganizerState(callerId: number, callerRole: UserRole, activityId: number): Promise<OrganizerAssessmentState> {
    const activity = await this.loadOwnedActivity(callerId, callerRole, activityId);
    return this.buildState(activity, activity.peerAssessmentEnabled);
  }

  async setEnabled(
    callerId: number,
    callerRole: UserRole,
    activityId: number,
    enabled: boolean,
  ): Promise<OrganizerAssessmentState> {
    const activity = await this.loadOwnedActivity(callerId, callerRole, activityId);

    // ปิดโหมดได้เสมอ (แม้กิจกรรมหลุดเงื่อนไขไปแล้วเพราะผู้จัดแก้ระยะเวลาภายหลัง) แต่เปิดได้เฉพาะ Tier 3
    if (enabled) {
      const { eligible, reason } = assessTier3Eligibility(activity);
      if (!eligible) throw new BadRequestException(reason);
    }

    await this.assessmentsRepository.setEnabled(activityId, enabled);
    this.logger.log(`Assessment mode ${enabled ? 'enabled' : 'disabled'}: activity ID ${activityId}`);

    return this.buildState(activity, enabled);
  }

  private async buildState(activity: AssessmentActivity, enabled: boolean): Promise<OrganizerAssessmentState> {
    const completed = activity.status === ActivityStatus.COMPLETED;
    const { eligible, reason } = assessTier3Eligibility(activity);
    const empty = { progress: null, pending: [] };

    if (!eligible) return { eligible, reason, enabled: false, completed, ...empty };
    if (!enabled || !completed) return { eligible, enabled, completed, ...empty };

    const { attended, assignments } = await this.ensurePairings(activity.id);

    const selfRows = assignments.filter((a) => a.source === AssessmentSource.SELF);
    const peerRows = assignments.filter((a) => a.source === AssessmentSource.PEER);
    const submitted = (rows: AssignmentRow[]) => rows.filter((a) => a.submittedAt !== null).length;

    const pending = attended
      .map((member) => {
        const selfDone = selfRows.some((a) => a.assessorRegistrationId === member.id && a.submittedAt !== null);
        const given = peerRows.filter((a) => a.assessorRegistrationId === member.id);
        const peerGiven = submitted(given);
        return { registrationId: member.id, name: member.student.name, selfDone, peerGiven, peerTotal: given.length };
      })
      .filter((m) => !m.selfDone || m.peerGiven < m.peerTotal);

    return {
      eligible,
      enabled,
      completed,
      progress: {
        self: { submitted: submitted(selfRows), total: selfRows.length },
        peer: { submitted: submitted(peerRows), total: peerRows.length },
      },
      pending,
    };
  }

  /**
   * สร้างใบงานให้ครบ (idempotent) — ใบประเมินตนเองให้ทุกคนที่เช็คอิน และจับคู่เพื่อนให้เฉพาะคนที่ยังไม่อยู่ในคู่ใดเลย
   * (รอบแรก = ทุกคน; คนเช็คอินทีหลังจะถูกจับคู่กันเองเมื่อมีตั้งแต่ k+1 คน ส่วนคู่เดิมไม่ถูกแตะ)
   *
   * เรียกแบบ lazy ตอนมีคนเปิดดู (ไม่ผูกกับ markCompleted) เพื่อไม่ให้การปิดกิจกรรมพึ่งเรื่องนี้ และครอบคลุมเคส
   * "เปิดโหมดหลังกิจกรรมจบ" / "เช็คอินทีหลัง" โดยอัตโนมัติ — การจับคู่ใช้ seed จาก activityId จึงได้ผลเหมือนกันทุกครั้ง
   * ถ้าสองคำขอมาพร้อมกัน สร้างซ้ำได้แถวชุดเดียวกัน แล้ว skipDuplicates ข้ามให้เอง
   */
  async ensurePairings(activityId: number): Promise<{ attended: AttendedRow[]; assignments: AssignmentRow[] }> {
    const attended = (await this.assessmentsRepository.findAttendedRegistrations(activityId)) as AttendedRow[];
    const existing = (await this.assessmentsRepository.findAssignmentsByActivity(activityId)) as AssignmentRow[];

    const hasSelf = new Set(
      existing.filter((a) => a.source === AssessmentSource.SELF).map((a) => a.assessorRegistrationId),
    );
    const alreadyPaired = new Set(
      existing
        .filter((a) => a.source === AssessmentSource.PEER)
        .flatMap((a) => [a.assessorRegistrationId, a.targetRegistrationId]),
    );

    const created: AssignmentRow[] = [];
    const rows: { activityId: number; assessorRegistrationId: number; targetRegistrationId: number; source: 'self' | 'peer' }[] = [];

    for (const member of attended) {
      if (hasSelf.has(member.id)) continue;
      rows.push({ activityId, assessorRegistrationId: member.id, targetRegistrationId: member.id, source: 'self' });
    }

    const unpaired = attended
      .filter((member) => !alreadyPaired.has(member.id))
      .map((member) => ({ registrationId: member.id, dutyRole: member.dutyRole }));
    for (const pair of pairPeers(unpaired, PEERS_PER_PERSON, activityId)) {
      rows.push({
        activityId,
        assessorRegistrationId: pair.assessorId,
        targetRegistrationId: pair.targetId,
        source: 'peer',
      });
    }

    if (rows.length > 0) {
      await this.assessmentsRepository.createAssignments(rows);
      for (const r of rows) {
        created.push({
          assessorRegistrationId: r.assessorRegistrationId,
          targetRegistrationId: r.targetRegistrationId,
          source: r.source,
          submittedAt: null,
        });
      }
    }

    return { attended, assignments: [...existing, ...created] };
  }

  // ─── ฝั่งนักศึกษา ───────────────────────────────────────────────────────────────

  async getMyTasks(studentId: number, registrationId: number) {
    const registration = await this.assessmentsRepository.findRegistrationForStudent(registrationId);

    // 404 ไม่ใช่ 403 — ไม่บอกว่าใบลงทะเบียนนี้มีอยู่จริงแก่คนที่ไม่ใช่เจ้าของ (แบบเดียวกับแบบสำรวจ)
    if (!registration || registration.studentId !== studentId) {
      throw new NotFoundException('ไม่พบรายการลงทะเบียน');
    }
    if (registration.attendance !== AttendanceStatus.ATTENDED) {
      throw new BadRequestException('ต้องเช็คอินเข้าร่วมกิจกรรมก่อนจึงจะประเมินได้');
    }

    const { activity } = registration;
    if (!activity.peerAssessmentEnabled) return { enabled: false, open: false, skills: [], tasks: [] };

    const skills = activity.softSkills.map((s) => s.skillType as string);
    if (activity.status !== ActivityStatus.COMPLETED) return { enabled: true, open: false, skills, tasks: [] };

    await this.ensurePairings(activity.id);
    const rows = await this.assessmentsRepository.findAssignmentsByAssessor(registrationId);

    const tasks: StudentAssessmentTask[] = rows.map((row) => {
      const isSelf = row.source === AssessmentSource.SELF;
      const submitted = row.submittedAt !== null;
      return {
        assignmentId: row.id,
        source: row.source,
        targetName: isSelf ? null : row.target.student.name,
        targetDutyRole: isSelf ? null : row.target.dutyRole,
        submitted,
        myScores: submitted ? Object.fromEntries(row.scores.map((s) => [s.skillType as string, s.score])) : null,
      };
    });
    // ตนเองก่อน แล้วเพื่อน (ลำดับใน DB คงเดิมภายในแต่ละกลุ่ม)
    tasks.sort((a, b) => Number(a.source !== AssessmentSource.SELF) - Number(b.source !== AssessmentSource.SELF));

    return { enabled: true, open: true, skills, tasks };
  }

  async submit(studentId: number, assignmentId: number, dto: SubmitAssessmentDto) {
    const assignment = await this.assessmentsRepository.findAssignmentForSubmit(assignmentId);

    if (!assignment || assignment.assessor.studentId !== studentId) {
      throw new NotFoundException('ไม่พบใบงานประเมิน');
    }
    if (!assignment.activity.peerAssessmentEnabled) {
      throw new BadRequestException('กิจกรรมนี้ปิดการประเมินรอบด้านอยู่');
    }
    if (assignment.activity.status !== ActivityStatus.COMPLETED) {
      throw new BadRequestException('ยังไม่เปิดให้ประเมิน — รอผู้จัดจบกิจกรรมก่อน');
    }
    if (assignment.submittedAt) throw new BadRequestException('คุณส่งใบประเมินนี้ไปแล้ว');

    // ต้องให้ระดับครบ "ทุก" ทักษะที่กิจกรรมเลือก ไม่ซ้ำ ไม่เกิน — ระดับเป็น 2/3/5 ตรวจที่ DTO แล้ว
    const expected = new Set(assignment.activity.softSkills.map((s) => s.skillType as string));
    const given = dto.scores.map((s) => s.skillType as string);
    if (new Set(given).size !== given.length) throw new BadRequestException('ให้ระดับทักษะเดียวกันซ้ำในใบเดียวไม่ได้');
    const unknown = given.filter((skill) => !expected.has(skill));
    if (unknown.length > 0) throw new BadRequestException(`กิจกรรมนี้ไม่ได้ประเมินทักษะ ${unknown.join(', ')}`);
    if (given.length !== expected.size) throw new BadRequestException('กรุณาให้ระดับให้ครบทุกทักษะที่กิจกรรมนี้ประเมิน');

    const saved = await this.assessmentsRepository.submitAssignment(assignmentId, dto.scores);
    // false = อีกคำขอหนึ่งปิดใบงานนี้ไปก่อนแล้ว (ส่งซ้ำ/ส่งพร้อมกัน)
    if (!saved) throw new BadRequestException('คุณส่งใบประเมินนี้ไปแล้ว');

    this.logger.log(`Assessment submitted: assignment ID ${assignmentId}`);
    return { message: 'ส่งแบบประเมินสำเร็จ' };
  }
}
