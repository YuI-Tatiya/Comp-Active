import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EvaluationsRepository } from './evaluation.repository';
import { AssessmentsRepository } from './assessment.repository';
import { EvaluationApprovalRepository, ApprovalWrite } from './evaluation-approval.repository';
import { SKILL_TYPE_TO_FIELD } from './evaluation.service';
import { ApproveEvaluationDto } from './dto/approve-evaluation.dto';
import { ApproveReadyDto } from './dto/approve-ready.dto';
import { Tier3Candidate, assessTier3Eligibility } from './tier3-eligibility.util';
import { ApprovalFlag, Tier, computeSkillNet, flagsFor, resolveOrganizerScore } from './net-score.util';
import { UserRole } from '../../../common/enums/role.enum';
import { ActivityStatus, AssessmentSource } from '../../../common/enums/status.enum';

interface ApprovalActivity extends Tier3Candidate {
  id: number;
  organizerId: number;
  status: string;
  peerAssessmentEnabled: boolean;
}

export interface ApprovalSkillView {
  skillType: string;
  organizer: number;
  self: number | null;
  peer: number | null;
  peerCount: number;
  recommended: number;
  /** ค่าที่ล็อกไว้แล้ว (เฉพาะแถวที่อนุมัติแล้ว) */
  final: number | null;
}

export interface ApprovalRow {
  registrationId: number;
  name: string;
  dutyRole: string | null;
  approved: boolean;
  flags: ApprovalFlag[];
  overrideReason: string | null;
  skills: ApprovalSkillView[];
}

export interface ApprovalDashboard {
  /** false = ยังอนุมัติผลไม่ได้ (ไม่เข้าเงื่อนไข/ยังไม่เปิดโหมด/ยังไม่จบกิจกรรม) — บอกเหตุผลให้หน้าจอแสดง */
  available: boolean;
  reason?: string;
  cap: number;
  skills: string[];
  summary: { total: number; approved: number; ready: number; flagged: number };
  rows: ApprovalRow[];
}

type FrozenBreakdown = Record<
  string,
  { organizer: number; self: number | null; peer: number | null; peerCount: number; recommended: number; final: number }
>;

interface LiveRow {
  registrationId: number;
  evaluationId: number;
  name: string;
  dutyRole: string | null;
  flags: ApprovalFlag[];
  skills: (ReturnType<typeof computeSkillNet> & { skillType: string })[];
  approval: { breakdown: FrozenBreakdown; overrideReason: string | null } | null;
}

/**
 * อนุมัติผลประเมินรอบด้าน (360°) — คำนวณคะแนนสุทธิจากผู้จัด + ตนเอง + เพื่อน แล้วให้ผู้จัดตรวจก่อนปล่อยให้นักศึกษาเห็น
 * รายที่ระบบ flag ไว้ต้องตรวจเอง; "อนุมัติทั้งหมด" ทำเฉพาะรายที่ไม่มีข้อขัดแย้ง (และคำนวณ flag ใหม่ตอนรับคำขอเสมอ)
 * ค่าที่อนุมัติแล้วถูกล็อก: Batch Evaluation ไม่ทับ และแก้ได้ทางเดียวคืออนุมัติซ้ำพร้อมเหตุผล
 */
@Injectable()
export class EvaluationApprovalService {
  private readonly logger = new Logger(EvaluationApprovalService.name);

  constructor(
    private readonly evaluationsRepository: EvaluationsRepository,
    private readonly assessmentsRepository: AssessmentsRepository,
    private readonly approvalRepository: EvaluationApprovalRepository,
  ) {}

  /** ตรวจสิทธิ์ที่ชั้น service ตามกติกาของโปรเจกต์ — role เป็น organizer อย่างเดียวไม่พอ ต้องเป็นเจ้าของกิจกรรมนั้นด้วย */
  private async loadOwnedActivity(callerId: number, callerRole: UserRole, activityId: number) {
    const activity = await this.assessmentsRepository.findActivityForAssessment(activityId);
    if (!activity) throw new NotFoundException('ไม่พบกิจกรรม');
    if (callerRole !== UserRole.ADMIN && activity.organizerId !== callerId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์อนุมัติผลประเมินของกิจกรรมนี้');
    }
    return activity as ApprovalActivity;
  }

  /** เงื่อนไขที่ต้องผ่านก่อนอนุมัติได้ — ไม่ผ่านคืนเหตุผลให้หน้าจอบอกทางไปต่อ */
  private availability(activity: ApprovalActivity): { available: boolean; reason?: string; cap: 2 | 3 | 5 } {
    const { eligible, reason, cap } = assessTier3Eligibility(activity);
    if (!eligible) return { available: false, reason, cap };
    if (!activity.peerAssessmentEnabled) {
      return { available: false, cap, reason: 'ยังไม่ได้เปิดโหมดประเมินรอบด้าน — เปิดได้ที่แท็บ "ประเมินรายฝ่าย"' };
    }
    if (activity.status !== ActivityStatus.COMPLETED) {
      return { available: false, cap, reason: 'ต้องกดจบกิจกรรมก่อน นักศึกษาจึงจะส่งแบบประเมินและอนุมัติผลได้' };
    }
    return { available: true, cap };
  }

  async getApproval(callerId: number, callerRole: UserRole, activityId: number): Promise<ApprovalDashboard> {
    const activity = await this.loadOwnedActivity(callerId, callerRole, activityId);
    const { available, reason, cap } = this.availability(activity);
    const skills = activity.softSkills.map((s) => s.skillType as string);

    if (!available) {
      return { available, reason, cap, skills, summary: { total: 0, approved: 0, ready: 0, flagged: 0 }, rows: [] };
    }

    const live = await this.computeRows(activity, cap);
    const rows = live.map((row) => this.toView(row, skills));

    // ต้องตรวจสอบก่อน → พร้อมอนุมัติ → อนุมัติแล้ว (ลำดับเดิมของผู้เข้าร่วมคงไว้ในแต่ละกลุ่ม)
    const group = (r: ApprovalRow) => (r.approved ? 2 : r.flags.length > 0 ? 0 : 1);
    rows.sort((a, b) => group(a) - group(b));

    return {
      available,
      cap,
      skills,
      summary: {
        total: rows.length,
        approved: rows.filter((r) => r.approved).length,
        ready: rows.filter((r) => !r.approved && r.flags.length === 0).length,
        flagged: rows.filter((r) => !r.approved && r.flags.length > 0).length,
      },
      rows,
    };
  }

  /** อนุมัติรายคน — ไม่ส่ง scores = ยอมรับที่ระบบแนะนำ; ส่งต่างจากที่แนะนำต้องมีเหตุผล; อนุมัติซ้ำ = แก้ค่า */
  async approveOne(callerId: number, callerRole: UserRole, registrationId: number, dto: ApproveEvaluationDto) {
    const registration = await this.evaluationsRepository.findRegistrationWithActivity(registrationId);
    if (!registration) throw new NotFoundException('ไม่พบรายการลงทะเบียน');

    const activity = await this.loadOwnedActivity(callerId, callerRole, registration.activityId);
    const { available, reason, cap } = this.availability(activity);
    if (!available) throw new BadRequestException(reason);

    const rows = await this.computeRows(activity, cap);
    const row = rows.find((r) => r.registrationId === registrationId);
    if (!row) throw new BadRequestException('ผู้เข้าร่วมคนนี้ยังไม่ได้เช็คอิน จึงยังไม่มีผลให้อนุมัติ');

    const skills = row.skills.map((s) => s.skillType);
    const recommended = Object.fromEntries(row.skills.map((s) => [s.skillType, s.recommended])) as Record<string, Tier>;

    let finals: Record<string, Tier> = recommended;
    if (dto.scores) {
      const given = dto.scores.map((s) => s.skillType as string);
      if (new Set(given).size !== given.length) throw new BadRequestException('ระบุทักษะซ้ำ');
      const unknown = given.filter((skill) => !skills.includes(skill));
      if (unknown.length > 0) throw new BadRequestException(`กิจกรรมนี้ไม่ได้ประเมินทักษะ ${unknown.join(', ')}`);
      if (given.length !== skills.length) throw new BadRequestException('กรุณาระบุค่าสุดท้ายให้ครบทุกทักษะ');
      // ระดับต้องเป็น 2/3/5 (ตรวจที่ DTO) และกิจกรรมที่ใช้โหมดนี้ได้เป็น Tier 3 ซึ่งเพดาน = 5 เสมอ จึงไม่ต้องตรวจเพดานซ้ำที่นี่
      finals = Object.fromEntries(dto.scores.map((s) => [s.skillType, s.score as Tier]));
    }

    const differs = skills.some((skill) => finals[skill] !== recommended[skill]);
    const overrideReason = differs ? (dto.reason ?? '').trim() : '';
    if (differs && !overrideReason) {
      throw new BadRequestException('ค่าที่เลือกต่างจากที่ระบบแนะนำ ต้องระบุเหตุผล');
    }

    await this.approvalRepository.approveMany([this.toWrite(row, finals, differs ? overrideReason : null)], callerId);
    this.logger.log(`Evaluation approved: registration ID ${registrationId}${differs ? ' (manual override)' : ''}`);

    return this.getApproval(callerId, callerRole, activity.id);
  }

  /**
   * อนุมัติทั้งหมดที่ไม่มีข้อขัดแย้ง — รับ id ที่ผู้จัดเห็นว่า "พร้อม" บนหน้าจอ แต่ตัดสินใหม่ที่ server ทุกครั้ง:
   * อนุมัติเฉพาะที่ยังไม่ติดธงและยังไม่อนุมัติ (ถ้ามีคนส่งแบบประเมินเข้ามาระหว่างที่หน้าจอค้างอยู่ จะไม่พลาดคนที่เพิ่งติดธง)
   */
  async approveReady(callerId: number, callerRole: UserRole, activityId: number, dto: ApproveReadyDto) {
    const activity = await this.loadOwnedActivity(callerId, callerRole, activityId);
    const { available, reason, cap } = this.availability(activity);
    if (!available) throw new BadRequestException(reason);

    const rows = await this.computeRows(activity, cap);
    const byId = new Map(rows.map((r) => [r.registrationId, r]));

    const writes: ApprovalWrite[] = [];
    const skipped: { registrationId: number; reason: 'not_found' | 'already_approved' | 'flagged' }[] = [];
    for (const id of new Set(dto.registrationIds)) {
      const row = byId.get(id);
      if (!row) skipped.push({ registrationId: id, reason: 'not_found' });
      else if (row.approval) skipped.push({ registrationId: id, reason: 'already_approved' });
      else if (row.flags.length > 0) skipped.push({ registrationId: id, reason: 'flagged' });
      else {
        const finals = Object.fromEntries(row.skills.map((s) => [s.skillType, s.recommended])) as Record<string, Tier>;
        writes.push(this.toWrite(row, finals, null));
      }
    }

    if (writes.length > 0) await this.approvalRepository.approveMany(writes, callerId);
    this.logger.log(`Evaluations approved in bulk: activity ${activityId} (${writes.length} approved, ${skipped.length} skipped)`);

    return { approved: writes.length, skipped };
  }

  // ─── การคำนวณ ───────────────────────────────────────────────────────────────────

  /** คำนวณคะแนนสุทธิและ flag ของผู้ที่เช็คอินทุกคนจากข้อมูลดิบปัจจุบัน (ไม่เขียนอะไร) */
  private async computeRows(activity: ApprovalActivity, cap: number): Promise<LiveRow[]> {
    const skills = activity.softSkills.map((s) => ({ skillType: s.skillType as string, rate: s.rate }));

    const [registrations, baselineRows, submitted, approvals] = await Promise.all([
      this.evaluationsRepository.findAttendedForBatch(activity.id),
      this.evaluationsRepository.findBaselinesByActivity(activity.id),
      this.approvalRepository.findSubmittedScoresByActivity(activity.id),
      this.approvalRepository.findApprovalsByActivity(activity.id),
    ]);

    const baselineOf = new Map(baselineRows.map((b) => [`${b.dutyRole}\u0000${b.skillType}`, b.score]));
    const approvalOf = new Map(approvals.map((a) => [a.registrationId, a]));

    // ระดับที่ตนเองให้ (registrationId → ทักษะ → ระดับ) และที่เพื่อนให้ผู้ถูกประเมิน (registrationId → ทักษะ → ระดับ[])
    const selfScores = new Map<number, Map<string, number>>();
    const peerScores = new Map<number, Map<string, number[]>>();
    for (const assignment of submitted) {
      if (assignment.source === AssessmentSource.SELF) {
        selfScores.set(
          assignment.targetRegistrationId,
          new Map(assignment.scores.map((s) => [s.skillType as string, s.score])),
        );
      } else {
        const perSkill = peerScores.get(assignment.targetRegistrationId) ?? new Map<string, number[]>();
        for (const s of assignment.scores) perSkill.set(s.skillType as string, [...(perSkill.get(s.skillType) ?? []), s.score]);
        peerScores.set(assignment.targetRegistrationId, perSkill);
      }
    }

    const rows: LiveRow[] = [];
    for (const r of registrations) {
      // ไม่มีแถว Evaluation = ยังไม่มีอะไรให้อนุมัติ (การเช็คอินสร้างแถวเสมอ จึงไม่ควรเกิด)
      if (!r.evaluation) continue;

      const exceptionOf = new Map(r.evaluationExceptions.map((e) => [e.skillType as string, e.score]));
      const nets = skills.map(({ skillType, rate }) => ({
        skillType,
        ...computeSkillNet(
          {
            organizer: resolveOrganizerScore({
              exception: exceptionOf.get(skillType),
              baseline: r.dutyRole ? baselineOf.get(`${r.dutyRole}\u0000${skillType}`) : undefined,
              rate,
            }),
            self: selfScores.get(r.id)?.get(skillType) ?? null,
            peers: peerScores.get(r.id)?.get(skillType) ?? [],
          },
          cap,
        ),
      }));

      const approval = approvalOf.get(r.id);
      rows.push({
        registrationId: r.id,
        evaluationId: r.evaluation.id,
        name: r.student.name,
        dutyRole: r.dutyRole,
        flags: flagsFor(nets, exceptionOf.size > 0, cap),
        skills: nets,
        approval: approval ? { breakdown: approval.breakdown as FrozenBreakdown, overrideReason: approval.overrideReason } : null,
      });
    }
    return rows;
  }

  /** แถวที่อนุมัติแล้วแสดงจากค่าที่ล็อกไว้ (ไม่คำนวณใหม่) ส่วนแถวอื่นแสดงผลการคำนวณสด */
  private toView(row: LiveRow, skills: string[]): ApprovalRow {
    if (row.approval) {
      return {
        registrationId: row.registrationId,
        name: row.name,
        dutyRole: row.dutyRole,
        approved: true,
        flags: [],
        overrideReason: row.approval.overrideReason,
        skills: skills.map((skillType) => {
          const frozen = row.approval!.breakdown[skillType];
          return {
            skillType,
            organizer: frozen?.organizer ?? 0,
            self: frozen?.self ?? null,
            peer: frozen?.peer ?? null,
            peerCount: frozen?.peerCount ?? 0,
            recommended: frozen?.recommended ?? 0,
            final: frozen?.final ?? null,
          };
        }),
      };
    }

    return {
      registrationId: row.registrationId,
      name: row.name,
      dutyRole: row.dutyRole,
      approved: false,
      flags: row.flags,
      overrideReason: null,
      skills: row.skills.map((s) => ({
        skillType: s.skillType,
        organizer: s.organizer,
        self: s.self,
        peer: s.peer,
        peerCount: s.peerCount,
        recommended: s.recommended,
        final: null,
      })),
    };
  }

  private toWrite(row: LiveRow, finals: Record<string, Tier>, overrideReason: string | null): ApprovalWrite {
    return {
      evaluationId: row.evaluationId,
      scores: Object.fromEntries(row.skills.map((s) => [SKILL_TYPE_TO_FIELD[s.skillType], finals[s.skillType]])),
      breakdown: Object.fromEntries(
        row.skills.map((s) => [
          s.skillType,
          {
            organizer: s.organizer,
            self: s.self,
            peer: s.peer,
            peerCount: s.peerCount,
            recommended: s.recommended,
            final: finals[s.skillType],
          },
        ]),
      ),
      overrideReason,
    };
  }
}
