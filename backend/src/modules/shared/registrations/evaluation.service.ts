import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { EvaluationsRepository } from './evaluation.repository';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { UserRole } from '../../../common/enums/role.enum';
import { EvaluationStatus } from '../../../common/enums/status.enum';
import { summarizeEvaluations } from './evaluation-summary.util';

/** SoftSkillType (snake_case, ตรงกับ ActivitySoftSkill.skillType) -> field บน Evaluation (camelCase) */
export const SKILL_TYPE_TO_FIELD: Record<string, string> = {
  communication: 'communication',
  time_management: 'timeManagement',
  flexibility_adaptability: 'flexibilityAdaptability',
  teamwork_collaboration: 'teamworkCollaboration',
  analytic_critical_thinking: 'analyticCriticalThinking',
  decision_making: 'decisionMaking',
  creativity: 'creativity',
  complex_problem_solving: 'complexProblemSolving',
  curiosity_lifelong_learning: 'curiosityLifelongLearning',
  negotiation_persuasion: 'negotiationPersuasion',
  leadership: 'leadership',
  positive_attitude: 'positiveAttitude',
};

@Injectable()
export class EvaluationsService {
  private readonly logger = new Logger(EvaluationsService.name);

  constructor(private readonly evaluationsRepository: EvaluationsRepository) {}

  /**
   * เรียกตอนเช็คอินภายใน $transaction เดียวกับการอัปเดต Registration (ดู RegistrationsService.checkIn)
   * สร้างคะแนนอัตโนมัติจาก ActivitySoftSkill.rate ของกิจกรรมนั้น (ทักษะที่ไม่ได้ตั้งค่าไว้ = 0)
   * ไม่ทำอะไรถ้ามีคะแนนอยู่แล้ว กันเช็คอินซ้ำทับของเดิม/การแก้ไขด้วยมือ
   */
  async autoCreateForCheckIn(
    tx: any,
    registrationId: number,
    organizerId: number,
    softSkills: { skillType: string; rate: number }[],
    /** ฝ่ายของผู้เช็คอิน — ถ้าผู้จัดตั้งคะแนนฐานของฝ่ายนั้นไว้แล้ว (Batch Evaluation) ใช้แทนค่าเริ่มต้นของกิจกรรม */
    context?: { activityId: number; dutyRole?: string | null; pendingApproval?: boolean },
  ) {
    const existing = await this.evaluationsRepository.findByRegistrationIdTx(tx, registrationId);
    if (existing) return existing;

    const scores: Record<string, number> = {
      communication: 0,
      timeManagement: 0,
      flexibilityAdaptability: 0,
      teamworkCollaboration: 0,
      analyticCriticalThinking: 0,
      decisionMaking: 0,
      creativity: 0,
      complexProblemSolving: 0,
      curiosityLifelongLearning: 0,
      negotiationPersuasion: 0,
      leadership: 0,
      positiveAttitude: 0,
    };
    for (const { skillType, rate } of softSkills) {
      const field = SKILL_TYPE_TO_FIELD[skillType];
      if (field) scores[field] = rate;
    }

    if (context?.dutyRole) {
      const selected = new Set(softSkills.map((s) => s.skillType));
      const baselines = await this.evaluationsRepository.findBaselinesForDutyRoleTx(tx, context.activityId, context.dutyRole);
      for (const b of baselines) {
        const field = SKILL_TYPE_TO_FIELD[b.skillType];
        if (field && selected.has(b.skillType)) scores[field] = b.score;
      }
    }

    // กิจกรรมที่เปิดโหมดประเมินรอบด้าน: คะแนนรอผู้จัดอนุมัติ นักศึกษายังไม่เห็น (ดู evaluation-visibility.util)
    const status = context?.pendingApproval ? EvaluationStatus.PENDING_APPROVAL : EvaluationStatus.APPROVED;
    const evaluation = await this.evaluationsRepository.createTx(tx, registrationId, organizerId, scores, status);
    this.logger.log(`Evaluation auto-created for registration ID: ${registrationId}`);
    return evaluation;
  }

  /** แก้ไขคะแนนที่ระบบให้อัตโนมัติ — เฉพาะผู้จัดกิจกรรมนั้น (หรือ Admin) */
  async override(callerId: number, callerRole: UserRole, registrationId: number, dto: UpdateEvaluationDto) {
    const registration = await this.evaluationsRepository.findRegistrationWithActivity(registrationId);

    if (!registration) throw new NotFoundException('ไม่พบข้อมูลการลงทะเบียน');

    if (callerRole !== UserRole.ADMIN && registration.activity.organizerId !== callerId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขคะแนนของกิจกรรมนี้');
    }

    const existing = await this.evaluationsRepository.findByRegistrationId(registrationId);
    if (!existing) throw new NotFoundException('ยังไม่มีคะแนนสำหรับรายการนี้ — ต้องเช็คอินก่อนจึงจะแก้ไขได้');
    // ค่าที่ผ่านการอนุมัติรอบด้านแล้วถูกล็อก — แก้ได้ทางเดียวคือหน้าอนุมัติผล (มีเหตุผลและ audit) ห้ามอ้อมด้วยเส้นทางนี้
    if ((existing as { approval?: unknown }).approval) {
      throw new BadRequestException('ผลนี้ผ่านการอนุมัติรอบด้านแล้ว แก้ไขได้ที่แท็บ "อนุมัติผล" เท่านั้น');
    }

    return this.evaluationsRepository.update(registrationId, dto as Record<string, any>);
  }

  /**
   * อันดับของนักศึกษาเทียบกับนักศึกษาทั้งระบบ — เรียงจากคะแนน Soft Skills รวมสูงสุดไปต่ำสุด
   * คนคะแนนสูงสุด = อันดับ 1, คะแนนเท่ากัน = อันดับเดียวกัน (standard competition ranking)
   */
  private async getRank(studentId: number) {
    const rows = await this.evaluationsRepository.findAllScoresWithStudent();

    const totalsByStudent = new Map<number, number>();
    for (const row of rows) {
      const sum =
        row.communication +
        row.timeManagement +
        row.flexibilityAdaptability +
        row.teamworkCollaboration +
        row.analyticCriticalThinking +
        row.decisionMaking +
        row.creativity +
        row.complexProblemSolving +
        row.curiosityLifelongLearning +
        row.negotiationPersuasion +
        row.leadership +
        row.positiveAttitude;
      const studentTotal = row.registration.studentId;
      totalsByStudent.set(studentTotal, (totalsByStudent.get(studentTotal) ?? 0) + sum);
    }

    const myTotal = totalsByStudent.get(studentId) ?? 0;
    const higherCount = [...totalsByStudent.values()].filter((total) => total > myTotal).length;
    const totalStudents = await this.evaluationsRepository.countStudents();

    return { rank: higherCount + 1, totalStudents };
  }

  async getMySkills(studentId: number) {
    const evaluations = await this.evaluationsRepository.findByStudentWithActivity(studentId);
    const { rank, totalStudents } = await this.getRank(studentId);

    if (evaluations.length === 0) {
      return {
        count: 0,
        average: {
          communication: 0,
          timeManagement: 0,
          flexibilityAdaptability: 0,
          teamworkCollaboration: 0,
          analyticCriticalThinking: 0,
          decisionMaking: 0,
          creativity: 0,
          complexProblemSolving: 0,
          curiosityLifelongLearning: 0,
          negotiationPersuasion: 0,
          leadership: 0,
          positiveAttitude: 0,
        },
        totalScore: 0,
        points: 0,
        level: 1,
        rank,
        totalStudents,
        badges: [],
      };
    }

    const { count, average, totalScore } = summarizeEvaluations(evaluations);
    // สเกลคะแนนต่อทักษะเปลี่ยนจาก 0-10 เป็น 0-5 (x20 แทน x10) เพื่อคงจังหวะเลเวลอัพเท่าเดิม
    const points = totalScore * 20;
    const level = Math.floor(points / 5000) + 1;

    const badges: { name: string; icon: string; description: string }[] = [];
    if (count >= 1) badges.push({ name: 'First Step', icon: '🌱', description: 'เข้าร่วมกิจกรรมครั้งแรก' });
    if (count >= 5) badges.push({ name: 'Active Student', icon: '🔥', description: 'เข้าร่วมกิจกรรมมากกว่า 5 ครั้ง' });
    if (average.leadership >= 4)
      badges.push({ name: 'Born Leader', icon: '👑', description: 'มีทักษะความเป็นผู้นำโดดเด่น' });
    if (average.teamworkCollaboration >= 4)
      badges.push({ name: 'Team Player', icon: '🤝', description: 'ทำงานร่วมกับผู้อื่นได้ดีเยี่ยม' });

    return {
      count,
      average,
      totalScore,
      points,
      level,
      rank,
      totalStudents,
      badges,
      history: evaluations.map((ev) => ({
        id: ev.id,
        activityName: ev.registration.activity.name,
        date: ev.createdAt,
        scores: {
          communication: ev.communication,
          timeManagement: ev.timeManagement,
          flexibilityAdaptability: ev.flexibilityAdaptability,
          teamworkCollaboration: ev.teamworkCollaboration,
          analyticCriticalThinking: ev.analyticCriticalThinking,
          decisionMaking: ev.decisionMaking,
          creativity: ev.creativity,
          complexProblemSolving: ev.complexProblemSolving,
          curiosityLifelongLearning: ev.curiosityLifelongLearning,
          negotiationPersuasion: ev.negotiationPersuasion,
          leadership: ev.leadership,
          positiveAttitude: ev.positiveAttitude,
        },
      })),
    };
  }

  /** ผลประเมินทั้งกิจกรรม — เฉพาะเจ้าของกิจกรรม (หรือ Admin) ไม่ใช่แค่มี role organizer */
  async findByActivity(callerId: number, callerRole: UserRole, activityId: number) {
    const organizerId = await this.evaluationsRepository.findActivityOrganizerId(activityId);

    if (organizerId === null) throw new NotFoundException('ไม่พบกิจกรรม');
    if (callerRole !== UserRole.ADMIN && organizerId !== callerId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ดูผลการประเมินของกิจกรรมนี้');
    }

    return this.evaluationsRepository.findByActivity(activityId);
  }
}
