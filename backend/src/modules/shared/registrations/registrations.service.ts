import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { RegistrationsRepository } from './registrations.repository';
import { EvaluationsService } from './evaluation.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  RegistrationStatus,
  AttendanceStatus,
  ActivityStatus,
  ApprovalStatus,
  ActivityQuestionType,
  SurveyQuestionType,
} from '../../../common/enums/status.enum';
import { isViewerEligibleForEvent, type Viewer } from '../events/event-visibility.util';
import { MailService } from '../mail/mail.service';

interface AnswerInput {
  questionId: number;
  textValue?: string;
  optionIds?: number[];
}

interface SurveyAnswerInput {
  questionId: number;
  ratingValue?: number;
  textValue?: string;
}

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(
    private readonly registrationsRepository: RegistrationsRepository,
    private readonly evaluationsService: EvaluationsService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async create(studentId: number, activityId: number, viewer: Viewer, answers: AnswerInput[] = []) {
    const activity = await this.registrationsRepository.findActivityWithActiveCount(activityId);

    if (!activity) throw new NotFoundException('ไม่พบกิจกรรม');

    // Defense in depth — ป้องกันการ POST ตรงข้าม ID กิจกรรม restricted ที่ frontend ไม่ได้แสดงให้เห็น
    if (!isViewerEligibleForEvent(viewer, (activity as any).event)) {
      throw new NotFoundException('ไม่พบกิจกรรม');
    }

    if (activity.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new BadRequestException('กิจกรรมนี้ยังไม่ได้รับการอนุมัติ');
    }

    if (activity.status !== ActivityStatus.OPEN) {
      throw new BadRequestException('กิจกรรมนี้ปิดรับสมัครแล้ว');
    }

    if (activity.capacity !== null && activity._count.registrations >= activity.capacity) {
      throw new BadRequestException('กิจกรรมนี้เต็มแล้ว');
    }

    const existing = await this.registrationsRepository.findActiveByStudentAndActivity(studentId, activityId);

    if (existing) throw new ConflictException('คุณลงทะเบียนกิจกรรมนี้แล้ว');

    const preparedAnswers = this.validateAndPrepareAnswers(activity.questions, answers);

    const registration = await this.registrationsRepository.create(studentId, activityId, preparedAnswers);

    this.logger.log(`Registration created: student ${studentId} → activity ${activityId}`);
    return registration;
  }

  /** ตรวจว่าตอบครบคำถามบังคับ + ตัวเลือกที่ส่งมาเป็นของคำถามนั้นจริง (กันปลอมแปลง optionId ข้ามคำถาม/กิจกรรม) */
  private validateAndPrepareAnswers(
    questions: {
      id: number;
      label: string;
      type: string;
      required: boolean;
      options: { id: number }[];
    }[],
    answers: AnswerInput[],
  ) {
    const answerByQuestionId = new Map(answers.map((a) => [a.questionId, a]));
    const prepared: { questionId: number; textValue?: string; optionIds: number[] }[] = [];

    for (const q of questions) {
      const answer = answerByQuestionId.get(q.id);
      const isTextType = q.type === ActivityQuestionType.TEXT;
      const validOptionIds = new Set(q.options.map((o) => o.id));
      const optionIds = (answer?.optionIds ?? []).filter((id) => validOptionIds.has(id));
      const textValue = answer?.textValue?.trim();
      const isAnswered = isTextType ? !!textValue : optionIds.length > 0;

      if (q.required && !isAnswered) {
        throw new BadRequestException(`กรุณาตอบคำถาม: ${q.label}`);
      }

      if (isAnswered) {
        prepared.push({
          questionId: q.id,
          textValue: isTextType ? textValue : undefined,
          optionIds: isTextType ? [] : optionIds,
        });
      }
    }

    return prepared;
  }

  async cancel(registrationId: number, studentId: number) {
    const registration = await this.registrationsRepository.findByIdAndStudent(registrationId, studentId);

    if (!registration) throw new NotFoundException('ไม่พบรายการลงทะเบียน');

    if (registration.status === RegistrationStatus.CANCELLED) {
      throw new BadRequestException('รายการนี้ถูกยกเลิกแล้ว');
    }

    await this.registrationsRepository.update(registrationId, { status: RegistrationStatus.CANCELLED as any });

    this.logger.log(`Registration cancelled: ID ${registrationId}`);
  }

  async findByStudent(studentId: number) {
    return this.registrationsRepository.findByStudent(studentId);
  }

  async findByActivity(activityId: number) {
    return this.registrationsRepository.findByActivity(activityId);
  }

  async confirm(registrationId: number) {
    const registration = await this.registrationsRepository.findById(registrationId);

    if (!registration) throw new NotFoundException('ไม่พบรายการลงทะเบียน');

    const saved = await this.registrationsRepository.update(registrationId, {
      status: RegistrationStatus.CONFIRMED as any,
    });

    this.logger.log(`Registration confirmed: ID ${registrationId}`);

    // อีเมลเป็นช่องทางเสริม ไม่ให้ล้มเหลวกระทบผลลัพธ์หลักที่ organizer กำลังรอ
    void this.notifyRegistrationConfirmed(registrationId);

    return saved;
  }

  private async notifyRegistrationConfirmed(registrationId: number) {
    try {
      const full = await this.registrationsRepository.findByIdWithStudentAndActivity(registrationId);
      if (!full) return;
      await this.mailService.sendRegistrationConfirmed(
        full.student.email,
        full.student.name,
        full.activity.name,
        new Date(full.activity.date).toLocaleDateString('th-TH', { dateStyle: 'long' }),
        `${full.activity.startTime} - ${full.activity.endTime}`,
        full.activity.location,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`notifyRegistrationConfirmed failed for registration ${registrationId}: ${msg}`);
    }
  }

  async checkIn(registrationId: number) {
    const registration = await this.registrationsRepository.findByIdWithActivitySoftSkills(registrationId);

    if (!registration) throw new NotFoundException('ไม่พบรายการลงทะเบียน');

    if (registration.status !== RegistrationStatus.CONFIRMED) {
      throw new BadRequestException('ต้องยืนยันการลงทะเบียนก่อนเช็คอิน');
    }

    // เช็คอิน + สร้างคะแนน Soft Skills อัตโนมัติ ต้องสำเร็จหรือล้มเหลวพร้อมกันเสมอ
    const saved = await this.prisma.$transaction(async (tx) => {
      const updated = await this.registrationsRepository.updateTx(tx, registrationId, {
        attendance: AttendanceStatus.ATTENDED as any,
        checkInTime: new Date(),
      });

      await this.evaluationsService.autoCreateForCheckIn(
        tx,
        registrationId,
        registration.activity.organizerId,
        registration.activity.softSkills,
      );

      return updated;
    });

    this.logger.log(`Check-in: registration ID ${registrationId}`);
    return saved;
  }

  async countAll() {
    return this.registrationsRepository.countAll();
  }

  async getSurveyQuestions(registrationId: number, studentId: number) {
    const registration = await this.registrationsRepository.findByIdWithEventSurveyQuestions(registrationId);

    if (!registration || registration.studentId !== studentId) {
      throw new NotFoundException('ไม่พบรายการลงทะเบียน');
    }
    if (registration.attendance !== AttendanceStatus.ATTENDED) {
      throw new BadRequestException('ต้องเช็คอินเข้าร่วมกิจกรรมก่อนจึงจะให้คะแนนได้');
    }

    return registration.activity.event?.surveyQuestions ?? [];
  }

  async submitSurvey(registrationId: number, studentId: number, answers: SurveyAnswerInput[]) {
    const registration = await this.registrationsRepository.findByIdWithEventSurveyQuestions(registrationId);

    if (!registration || registration.studentId !== studentId) {
      throw new NotFoundException('ไม่พบรายการลงทะเบียน');
    }
    if (registration.attendance !== AttendanceStatus.ATTENDED) {
      throw new BadRequestException('ต้องเช็คอินเข้าร่วมกิจกรรมก่อนจึงจะให้คะแนนได้');
    }

    const questions = registration.activity.event?.surveyQuestions ?? [];
    if (questions.length === 0) {
      throw new BadRequestException('กิจกรรมนี้ไม่มีแบบสำรวจ');
    }

    const alreadySubmitted = await this.registrationsRepository.findAnySurveyAnswer(registrationId);
    if (alreadySubmitted) throw new BadRequestException('คุณให้คะแนนกิจกรรมนี้ไปแล้ว');

    const questionById = new Map(questions.map((q) => [q.id, q]));
    const prepared = answers
      .filter((a) => questionById.has(a.questionId))
      .map((a) => {
        const q = questionById.get(a.questionId)!;
        const isRating = q.type === SurveyQuestionType.RATING;
        return {
          questionId: a.questionId,
          ratingValue: isRating ? a.ratingValue : undefined,
          textValue: !isRating ? a.textValue?.trim() : undefined,
        };
      })
      .filter((a) => a.ratingValue !== undefined || (a.textValue && a.textValue.length > 0));

    if (prepared.length === 0) {
      throw new BadRequestException('กรุณาตอบแบบสำรวจอย่างน้อย 1 ข้อ');
    }

    await this.registrationsRepository.createSurveyAnswers(registrationId, prepared);
    this.logger.log(`Survey submitted: registration ID ${registrationId}`);
    return { message: 'ส่งแบบสำรวจสำเร็จ' };
  }
}
