import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EvaluationsRepository } from './evaluation.repository';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { UserRole } from '../../../common/enums/role.enum';

/** SoftSkillType (snake_case, ตรงกับ ActivitySoftSkill.skillType) -> field บน Evaluation (camelCase) */
const SKILL_TYPE_TO_FIELD: Record<string, string> = {
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

    const evaluation = await this.evaluationsRepository.createTx(tx, registrationId, organizerId, scores);
    this.logger.log(`Evaluation auto-created for registration ID: ${registrationId}`);
    return evaluation;
  }

  /** แก้ไขคะแนนที่ระบบให้อัตโนมัติ — เฉพาะผู้จัดกิจกรรมนั้น (หรือ Admin) */
  async override(callerId: number, callerRole: UserRole, registrationId: number, dto: UpdateEvaluationDto) {
    const registration = await this.evaluationsRepository.findRegistrationWithActivity(registrationId);

    if (!registration) throw new NotFoundException('ไม่พบข้อมูลการลงทะเบียน');

    if (callerRole !== UserRole.ADMIN && registration.activity.organizerId !== callerId) {
      throw new BadRequestException('คุณไม่มีสิทธิ์แก้ไขคะแนนของกิจกรรมนี้');
    }

    const existing = await this.evaluationsRepository.findByRegistrationId(registrationId);
    if (!existing) throw new NotFoundException('ยังไม่มีคะแนนสำหรับรายการนี้ — ต้องเช็คอินก่อนจึงจะแก้ไขได้');

    return this.evaluationsRepository.update(registrationId, dto as Record<string, any>);
  }

  async getMySkills(studentId: number) {
    const evaluations = await this.evaluationsRepository.findByStudentWithActivity(studentId);

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
        points: 0,
        level: 1,
        badges: [],
      };
    }

    const total = evaluations.reduce(
      (acc, curr) => {
        acc.communication += curr.communication;
        acc.timeManagement += curr.timeManagement;
        acc.flexibilityAdaptability += curr.flexibilityAdaptability;
        acc.teamworkCollaboration += curr.teamworkCollaboration;
        acc.analyticCriticalThinking += curr.analyticCriticalThinking;
        acc.decisionMaking += curr.decisionMaking;
        acc.creativity += curr.creativity;
        acc.complexProblemSolving += curr.complexProblemSolving;
        acc.curiosityLifelongLearning += curr.curiosityLifelongLearning;
        acc.negotiationPersuasion += curr.negotiationPersuasion;
        acc.leadership += curr.leadership;
        acc.positiveAttitude += curr.positiveAttitude;
        return acc;
      },
      {
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
    );

    const count = evaluations.length;
    const average = {
      communication: Number((total.communication / count).toFixed(2)),
      timeManagement: Number((total.timeManagement / count).toFixed(2)),
      flexibilityAdaptability: Number((total.flexibilityAdaptability / count).toFixed(2)),
      teamworkCollaboration: Number((total.teamworkCollaboration / count).toFixed(2)),
      analyticCriticalThinking: Number((total.analyticCriticalThinking / count).toFixed(2)),
      decisionMaking: Number((total.decisionMaking / count).toFixed(2)),
      creativity: Number((total.creativity / count).toFixed(2)),
      complexProblemSolving: Number((total.complexProblemSolving / count).toFixed(2)),
      curiosityLifelongLearning: Number((total.curiosityLifelongLearning / count).toFixed(2)),
      negotiationPersuasion: Number((total.negotiationPersuasion / count).toFixed(2)),
      leadership: Number((total.leadership / count).toFixed(2)),
      positiveAttitude: Number((total.positiveAttitude / count).toFixed(2)),
    };

    const totalScore =
      total.communication +
      total.timeManagement +
      total.flexibilityAdaptability +
      total.teamworkCollaboration +
      total.analyticCriticalThinking +
      total.decisionMaking +
      total.creativity +
      total.complexProblemSolving +
      total.curiosityLifelongLearning +
      total.negotiationPersuasion +
      total.leadership +
      total.positiveAttitude;
    const points = totalScore * 10;
    // สเกลคะแนนต่อทักษะเปลี่ยนจาก 0-1 เป็น 0-10 (x10) — หาร level ด้วย 5000 (เดิม 500) เพื่อคงจังหวะเลเวลอัพเท่าเดิม
    const level = Math.floor(points / 5000) + 1;

    const badges: { name: string; icon: string; description: string }[] = [];
    if (count >= 1) badges.push({ name: 'First Step', icon: '🌱', description: 'เข้าร่วมกิจกรรมครั้งแรก' });
    if (count >= 5) badges.push({ name: 'Active Student', icon: '🔥', description: 'เข้าร่วมกิจกรรมมากกว่า 5 ครั้ง' });
    if (average.leadership >= 8)
      badges.push({ name: 'Born Leader', icon: '👑', description: 'มีทักษะความเป็นผู้นำโดดเด่น' });
    if (average.teamworkCollaboration >= 8)
      badges.push({ name: 'Team Player', icon: '🤝', description: 'ทำงานร่วมกับผู้อื่นได้ดีเยี่ยม' });

    return {
      count,
      average,
      points,
      level,
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

  async findByActivity(activityId: number) {
    return this.evaluationsRepository.findByActivity(activityId);
  }
}
