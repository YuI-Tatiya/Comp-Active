import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evaluation } from './entities/evaluation.entity';
import { Registration } from '../registrations/entities/registration.entity';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { AttendanceStatus } from '../common/enums/status.enum';

@Injectable()
export class EvaluationsService {
  private readonly logger = new Logger(EvaluationsService.name);

  constructor(
    @InjectRepository(Evaluation)
    private readonly evaluationRepository: Repository<Evaluation>,
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
  ) {}

  /**
   * สร้างการประเมินผล (Organizer)
   */
  async create(evaluatorId: number, createDto: CreateEvaluationDto): Promise<Evaluation> {
    const { registrationId, ...scores } = createDto;

    // 1. ตรวจสอบการลงทะเบียน
    const registration = await this.registrationRepository.findOne({
      where: { id: registrationId },
      relations: ['activity'],
    });

    if (!registration) {
      throw new NotFoundException('ไม่พบข้อมูลการลงทะเบียน');
    }

    // 2. ตรวจสอบสิทธิ์ (ต้องเป็นเจ้าของกิจกรรม)
    if (registration.activity.organizerId !== evaluatorId) {
      throw new BadRequestException('คุณไม่มีสิทธิ์ประเมินผู้ใช้ในกิจกรรมนี้');
    }

    // 3. ตรวจสอบการเข้าเรียน (เฉพาะคนที่ ATTENDED เท่านั้นที่ประเมินได้)
    if (registration.attendance !== AttendanceStatus.ATTENDED) {
      throw new BadRequestException('สามารถประเมินผลได้เฉพาะผู้ที่เข้าร่วมกิจกรรมแล้วเท่านั้น');
    }

    // 4. ตรวจสอบว่าเคยประเมินไปแล้วหรือยัง
    const existing = await this.evaluationRepository.findOne({
      where: { registrationId },
    });

    if (existing) {
      // อัปเดตแทนถ้ามีอยู่แล้ว
      Object.assign(existing, scores);
      return this.evaluationRepository.save(existing);
    }

    // 5. สร้างการประเมิน
    const evaluation = this.evaluationRepository.create({
      registrationId,
      evaluatorId,
      ...scores,
    });

    const saved = await this.evaluationRepository.save(evaluation);
    this.logger.log(`Evaluation created for registration ID: ${registrationId}`);
    return saved;
  }

  /**
   * ดึงข้อมูลทักษะของตนเอง (Student)
   */
  async getMySkills(studentId: number) {
    const evaluations = await this.evaluationRepository.find({
      where: {
        registration: { studentId },
      },
      relations: ['registration', 'registration.activity'],
    });

    if (evaluations.length === 0) {
      return {
        count: 0,
        average: {
          teamwork: 0,
          leadership: 0,
          communication: 0,
          problemSolving: 0,
          adaptability: 0,
        },
        points: 0,
        level: 1,
        badges: [],
      };
    }

    const total = evaluations.reduce(
      (acc, curr) => {
        acc.teamwork += curr.teamwork;
        acc.leadership += curr.leadership;
        acc.communication += curr.communication;
        acc.problemSolving += curr.problemSolving;
        acc.adaptability += curr.adaptability;
        return acc;
      },
      { teamwork: 0, leadership: 0, communication: 0, problemSolving: 0, adaptability: 0 },
    );

    const count = evaluations.length;
    const average = {
      teamwork: Number((total.teamwork / count).toFixed(2)),
      leadership: Number((total.leadership / count).toFixed(2)),
      communication: Number((total.communication / count).toFixed(2)),
      problemSolving: Number((total.problemSolving / count).toFixed(2)),
      adaptability: Number((total.adaptability / count).toFixed(2)),
    };

    // Gamification Logic
    const totalScore = total.teamwork + total.leadership + total.communication + total.problemSolving + total.adaptability;
    const points = totalScore * 10;
    const level = Math.floor(points / 500) + 1;

    // Simple Badges logic
    const badges: { name: string; icon: string; description: string }[] = [];
    if (count >= 1) badges.push({ name: 'First Step', icon: '🌱', description: 'เข้าร่วมกิจกรรมครั้งแรก' });
    if (count >= 5) badges.push({ name: 'Active Student', icon: '🔥', description: 'เข้าร่วมกิจกรรมมากกว่า 5 ครั้ง' });
    if (average.leadership >= 8) badges.push({ name: 'Born Leader', icon: '👑', description: 'มีทักษะความเป็นผู้นำโดดเด่น' });
    if (average.teamwork >= 8) badges.push({ name: 'Team Player', icon: '🤝', description: 'ทำงานร่วมกับผู้อื่นได้ดีเยี่ยม' });

    return {
      count,
      average,
      points,
      level,
      badges,
      history: evaluations.map(ev => ({
        id: ev.id,
        activityName: ev.registration.activity.name,
        date: ev.createdAt,
        scores: {
          teamwork: ev.teamwork,
          leadership: ev.leadership,
          communication: ev.communication,
          problemSolving: ev.problemSolving,
          adaptability: ev.adaptability
        }
      }))
    };
  }

  /**
   * ดึงการประเมินของกิจกรรม (Organizer)
   */
  async findByActivity(activityId: number) {
    return this.evaluationRepository.find({
      where: {
        registration: { activityId },
      },
      relations: ['registration', 'registration.student'],
    });
  }
}
