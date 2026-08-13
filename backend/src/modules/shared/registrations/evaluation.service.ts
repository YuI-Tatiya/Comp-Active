import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EvaluationsRepository } from './evaluation.repository';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { AttendanceStatus } from '../../../common/enums/status.enum';

@Injectable()
export class EvaluationsService {
  private readonly logger = new Logger(EvaluationsService.name);

  constructor(private readonly evaluationsRepository: EvaluationsRepository) {}

  async create(evaluatorId: number, createDto: CreateEvaluationDto) {
    const { registrationId, ...scores } = createDto;

    const registration = await this.evaluationsRepository.findRegistrationWithActivity(registrationId);

    if (!registration) throw new NotFoundException('ไม่พบข้อมูลการลงทะเบียน');

    if (registration.activity.organizerId !== evaluatorId) {
      throw new BadRequestException('คุณไม่มีสิทธิ์ประเมินผู้ใช้ในกิจกรรมนี้');
    }

    if (registration.attendance !== AttendanceStatus.ATTENDED) {
      throw new BadRequestException('สามารถประเมินผลได้เฉพาะผู้ที่เข้าร่วมกิจกรรมแล้วเท่านั้น');
    }

    const existing = await this.evaluationsRepository.findByRegistrationId(registrationId);

    if (existing) {
      const updated = await this.evaluationsRepository.update(registrationId, scores);
      return updated;
    }

    const evaluation = await this.evaluationsRepository.create(registrationId, evaluatorId, scores);

    this.logger.log(`Evaluation created for registration ID: ${registrationId}`);
    return evaluation;
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
      total.communication + total.timeManagement + total.flexibilityAdaptability +
      total.teamworkCollaboration + total.analyticCriticalThinking + total.decisionMaking +
      total.creativity + total.complexProblemSolving + total.curiosityLifelongLearning +
      total.negotiationPersuasion + total.leadership + total.positiveAttitude;
    const points = totalScore * 10;
    const level = Math.floor(points / 500) + 1;

    const badges: { name: string; icon: string; description: string }[] = [];
    if (count >= 1) badges.push({ name: 'First Step', icon: '🌱', description: 'เข้าร่วมกิจกรรมครั้งแรก' });
    if (count >= 5) badges.push({ name: 'Active Student', icon: '🔥', description: 'เข้าร่วมกิจกรรมมากกว่า 5 ครั้ง' });
    if (average.leadership >= 0.8) badges.push({ name: 'Born Leader', icon: '👑', description: 'มีทักษะความเป็นผู้นำโดดเด่น' });
    if (average.teamworkCollaboration >= 0.8) badges.push({ name: 'Team Player', icon: '🤝', description: 'ทำงานร่วมกับผู้อื่นได้ดีเยี่ยม' });

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
