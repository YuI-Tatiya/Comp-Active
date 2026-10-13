import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { EvaluationsRepository } from './evaluation.repository';
import { SKILL_TYPE_TO_FIELD } from './evaluation.service';
import { SaveBatchEvaluationDto } from './dto/save-batch-evaluation.dto';
import { UserRole } from '../../../common/enums/role.enum';
import { Tier3Assessment, Tier3Candidate, assessTier3Eligibility } from './tier3-eligibility.util';
import { resolveOrganizerScore } from './net-score.util';

interface BatchActivity extends Tier3Candidate {
  organizerId: number;
  dutyRoleOptions: string[];
}

/**
 * หน้า Batch Evaluation — ผู้จัดตั้งคะแนนฐานรายฝ่าย (dutyRole) ในคลิกเดียว แล้วแก้เฉพาะข้อยกเว้นรายคน (ต้องมีเหตุผล)
 * ใช้เฉพาะกิจกรรม Tier 3 (ปลดล็อกระดับสูงสุดตาม maxSoftSkillLevel — ยาว 2 วันขึ้นไป) — กิจกรรมอื่นยังให้คะแนนอัตโนมัติตอนเช็คอินเหมือนเดิม
 *
 * คะแนนต่อคนต่อทักษะ = ข้อยกเว้น ?? ฐานของฝ่าย ?? ค่าเริ่มต้นของกิจกรรม (ActivitySoftSkill.rate)
 * แล้วเขียนลงคอลัมน์ของ Evaluation เท่านั้น จึงไม่กระทบผู้อ่านคะแนนเดิม (getMySkills/อันดับ/badge)
 */
@Injectable()
export class EvaluationBatchService {
  private readonly logger = new Logger(EvaluationBatchService.name);

  constructor(private readonly evaluationsRepository: EvaluationsRepository) {}

  /** ตรวจสิทธิ์ที่ชั้น service ตามกติกาของโปรเจกต์ — role เป็น organizer อย่างเดียวไม่พอ ต้องเป็นเจ้าของกิจกรรมนั้นด้วย */
  private async loadOwnedActivity(callerId: number, callerRole: UserRole, activityId: number): Promise<BatchActivity> {
    const activity = await this.evaluationsRepository.findActivityForBatch(activityId);
    if (!activity) throw new NotFoundException('ไม่พบกิจกรรม');
    if (callerRole !== UserRole.ADMIN && activity.organizerId !== callerId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ประเมินกิจกรรมนี้');
    }
    return activity as BatchActivity;
  }

  /** server เป็นแหล่งความจริงว่ากิจกรรมนี้ใช้ Batch ได้หรือไม่ — frontend แค่แสดงผลตามที่ได้รับ */
  private assess(activity: BatchActivity): Tier3Assessment {
    return assessTier3Eligibility(activity);
  }

  async getBatch(callerId: number, callerRole: UserRole, activityId: number) {
    const activity = await this.loadOwnedActivity(callerId, callerRole, activityId);
    const assessment = this.assess(activity);
    const skills = activity.softSkills.map((s) => s.skillType);

    if (!assessment.eligible) {
      return {
        eligible: false,
        reason: assessment.reason,
        cap: assessment.cap,
        skills,
        defaults: {},
        groups: [],
        withoutDutyRole: 0,
        approvedCount: 0,
      };
    }

    const defaults: Record<string, number> = Object.fromEntries(activity.softSkills.map((s) => [s.skillType, s.rate]));
    const [registrations, baselineRows] = await Promise.all([
      this.evaluationsRepository.findAttendedForBatch(activityId),
      this.evaluationsRepository.findBaselinesByActivity(activityId),
    ]);

    const baselineByGroup = new Map<string, Record<string, number>>();
    for (const b of baselineRows) {
      const group = baselineByGroup.get(b.dutyRole) ?? {};
      group[b.skillType] = b.score;
      baselineByGroup.set(b.dutyRole, group);
    }

    const membersByGroup = new Map<string, any[]>();
    let withoutDutyRole = 0;
    for (const r of registrations) {
      if (!r.dutyRole) {
        withoutDutyRole += 1;
        continue;
      }
      const current: Record<string, number> = {};
      for (const skill of skills) current[skill] = (r.evaluation as any)?.[SKILL_TYPE_TO_FIELD[skill]] ?? 0;
      const exceptions: Record<string, { score: number; reason: string }> = {};
      for (const e of r.evaluationExceptions) exceptions[e.skillType] = { score: e.score, reason: e.reason };

      const list = membersByGroup.get(r.dutyRole) ?? [];
      list.push({ registrationId: r.id, name: r.student.name, studentId: r.student.studentId, current, exceptions });
      membersByGroup.set(r.dutyRole, list);
    }

    // เรียงฝ่ายตามลำดับที่ผู้จัดกำหนดใน dutyRoleOptions ก่อน ฝ่ายที่ไม่อยู่ในรายการ (ข้อมูลเก่า) ต่อท้าย
    const orderOf = (dutyRole: string) => {
      const i = activity.dutyRoleOptions.indexOf(dutyRole);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    const groups = [...membersByGroup.entries()]
      .sort(([a], [b]) => orderOf(a) - orderOf(b) || a.localeCompare(b))
      .map(([dutyRole, members]) => ({
        dutyRole,
        baseline: Object.fromEntries(skills.map((s) => [s, baselineByGroup.get(dutyRole)?.[s] ?? defaults[s]])),
        members,
      }));

    // คนที่ผู้จัดอนุมัติผลรอบด้านแล้วถูกล็อก — บันทึกที่นี่ไม่ทับค่าสุดท้ายของพวกเขา (แจ้งในหน้าจอ)
    const approvedCount = registrations.filter((r) => (r.evaluation as any)?.approval).length;

    return { eligible: true, cap: assessment.cap, skills, defaults, groups, withoutDutyRole, approvedCount };
  }

  async saveBatch(callerId: number, callerRole: UserRole, activityId: number, dto: SaveBatchEvaluationDto) {
    const activity = await this.loadOwnedActivity(callerId, callerRole, activityId);
    const assessment = this.assess(activity);
    if (!assessment.eligible) throw new BadRequestException(assessment.reason);

    const skillSet = new Set(activity.softSkills.map((s) => s.skillType));
    const defaults: Record<string, number> = Object.fromEntries(activity.softSkills.map((s) => [s.skillType, s.rate]));
    const registrations = await this.evaluationsRepository.findAttendedForBatch(activityId);
    const registrationById = new Map(registrations.map((r) => [r.id, r]));
    const knownDutyRoles = new Set([...activity.dutyRoleOptions, ...registrations.map((r) => r.dutyRole).filter(Boolean)] as string[]);

    const checkScores = (scores: { skillType: string; score: number }[], where: string) => {
      const seen = new Set<string>();
      for (const s of scores) {
        if (!skillSet.has(s.skillType)) throw new BadRequestException(`${where}: ทักษะ ${s.skillType} ไม่ได้อยู่ในชุดที่กิจกรรมนี้เลือกประเมิน`);
        if (s.score > assessment.cap) {
          throw new BadRequestException(`${where}: กิจกรรมนี้ให้คะแนนได้ไม่เกินระดับ ${assessment.cap}`);
        }
        if (seen.has(s.skillType)) throw new BadRequestException(`${where}: ระบุทักษะ ${s.skillType} ซ้ำ`);
        seen.add(s.skillType);
      }
    };

    const baselines: { dutyRole: string; skillType: string; score: number }[] = [];
    const seenGroups = new Set<string>();
    for (const g of dto.groups) {
      if (!knownDutyRoles.has(g.dutyRole)) throw new BadRequestException(`ไม่พบฝ่าย "${g.dutyRole}" ในกิจกรรมนี้`);
      if (seenGroups.has(g.dutyRole)) throw new BadRequestException(`ระบุฝ่าย "${g.dutyRole}" ซ้ำ`);
      seenGroups.add(g.dutyRole);
      checkScores(g.scores, `ฝ่าย "${g.dutyRole}"`);
      for (const s of g.scores) baselines.push({ dutyRole: g.dutyRole, skillType: s.skillType, score: s.score });
    }

    const exceptions: { registrationId: number; skillType: string; score: number; reason: string }[] = [];
    const seenRegistrations = new Set<number>();
    for (const e of dto.exceptions) {
      if (!registrationById.has(e.registrationId)) {
        throw new BadRequestException(`ไม่พบผู้เข้าร่วมที่เช็คอินแล้วหมายเลข ${e.registrationId} ในกิจกรรมนี้`);
      }
      if (seenRegistrations.has(e.registrationId)) throw new BadRequestException(`ระบุข้อยกเว้นของผู้เข้าร่วมหมายเลข ${e.registrationId} ซ้ำ`);
      seenRegistrations.add(e.registrationId);
      const reason = e.reason.trim();
      if (!reason) throw new BadRequestException('ข้อยกเว้นทุกรายการต้องระบุเหตุผล');
      checkScores(e.scores, `ข้อยกเว้นของผู้เข้าร่วมหมายเลข ${e.registrationId}`);
      for (const s of e.scores) exceptions.push({ registrationId: e.registrationId, skillType: s.skillType, score: s.score, reason });
    }

    const baselineKey = (dutyRole: string, skillType: string) => `${dutyRole}\u0000${skillType}`;
    const exceptionKey = (registrationId: number, skillType: string) => `${registrationId}\u0000${skillType}`;
    const baselineMap = new Map(baselines.map((b) => [baselineKey(b.dutyRole, b.skillType), b.score]));
    const exceptionMap = new Map(exceptions.map((e) => [exceptionKey(e.registrationId, e.skillType), e.score]));

    const evaluationUpdates: { registrationId: number; scores: Record<string, number> }[] = [];
    for (const r of registrations) {
      if (!r.evaluation) continue;
      // ค่าที่ผ่านการอนุมัติ 360° แล้วถูกล็อก — แก้ได้ทางเดียวคือ endpoint อนุมัติ (มีเหตุผลและ audit)
      if ((r.evaluation as any).approval) continue;
      const scores: Record<string, number> = {};
      for (const skill of skillSet) {
        scores[SKILL_TYPE_TO_FIELD[skill]] = resolveOrganizerScore({
          exception: exceptionMap.get(exceptionKey(r.id, skill)),
          baseline: r.dutyRole ? baselineMap.get(baselineKey(r.dutyRole, skill)) : undefined,
          rate: defaults[skill],
        });
      }
      evaluationUpdates.push({ registrationId: r.id, scores });
    }

    await this.evaluationsRepository.replaceBatchState(activityId, callerId, baselines, exceptions, evaluationUpdates);
    this.logger.log(
      `Batch evaluation saved: activity ${activityId} (${baselines.length} baselines, ${exceptions.length} exceptions, ${evaluationUpdates.length} evaluations)`,
    );

    return this.getBatch(callerId, callerRole, activityId);
  }
}
