import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
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
  RegistrationType,
} from '../../../common/enums/status.enum';
import { isViewerEligibleForEvent, type Viewer } from '../events/event-visibility.util';
import { MailService } from '../mail/mail.service';
import { maskUnapprovedEvaluation } from './evaluation-visibility.util';
import { UserRole } from '../../../common/enums/role.enum';

interface AnswerInput {
  questionId: number;
  textValue?: string;
  optionIds?: number[];
}

interface CertRequestInput {
  wantsCertLoanFund?: boolean;
  wantsCertScholarship?: boolean;
}

interface RegistrationTypeFieldsInput {
  dutyRole?: string;
  dutyShift?: string;
  teamName?: string;
  teamSize?: number;
  competitionCategory?: string;
  submissionLink?: string;
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

  async create(
    studentId: number,
    activityId: number,
    viewer: Viewer,
    answers: AnswerInput[] = [],
    certRequest: CertRequestInput = {},
    registrationTypeFields: RegistrationTypeFieldsInput = {},
  ) {
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

    // ช่วงเวลารับสมัครระดับงาน (Event.registrationOpenAt / registrationCloseAt) — ถึงเวลาปิดพอดีถือว่าปิดแล้ว
    // (<=) ให้ตรงกับหน้าจอที่ปิดปุ่มเมื่อ deadline <= ตอนนี้; ยังไม่ถึงเวลาเปิดพอดีถือว่ายังไม่เปิด (>) สมมาตรกัน
    const event = (activity as { event?: { registrationOpenAt?: Date | null; registrationCloseAt?: Date | null } | null })
      .event;
    if (event?.registrationOpenAt && event.registrationOpenAt.getTime() > Date.now()) {
      throw new BadRequestException('ยังไม่อยู่ในเวลาเปิดรับสมัคร');
    }
    if (event?.registrationCloseAt && event.registrationCloseAt.getTime() <= Date.now()) {
      throw new BadRequestException('หมดเขตรับสมัครแล้ว');
    }

    if (activity.capacity !== null && activity._count.registrations >= activity.capacity) {
      throw new BadRequestException('กิจกรรมนี้เต็มแล้ว');
    }

    const existing = await this.registrationsRepository.findActiveByStudentAndActivity(studentId, activityId);

    if (existing) throw new ConflictException('คุณลงทะเบียนกิจกรรมนี้แล้ว');

    const preparedAnswers = this.validateAndPrepareAnswers(activity.questions, answers);

    // เลือกขอใบจิตอาสาได้เฉพาะกิจกรรมที่เปิดออกใบจิตอาสาไว้จริง — กันค่าหลุดมาจากกิจกรรมที่ไม่รองรับ
    const offersVolunteerCert = !!(activity as any).volunteerRole;
    const wantsCertLoanFund = offersVolunteerCert && !!certRequest.wantsCertLoanFund;
    const wantsCertScholarship = offersVolunteerCert && !!certRequest.wantsCertScholarship;

    const preparedRegistrationTypeFields = this.validateAndPrepareRegistrationTypeFields(
      activity as any,
      registrationTypeFields,
    );

    const registration = await this.registrationsRepository.create(
      studentId,
      activityId,
      preparedAnswers,
      { wantsCertLoanFund, wantsCertScholarship },
      preparedRegistrationTypeFields,
    );

    this.logger.log(`Registration created: student ${studentId} → activity ${activityId}`);
    return registration;
  }

  /** ตรวจว่าตอบครบคำถามบังคับ + ตัวเลือกที่ส่งมาเป็นของคำถามนั้นจริง (กันปลอมแปลง optionId ข้ามคำถาม/กิจกรรม) */
  private validateAndPrepareAnswers(
    questions: { id: number; label: string; type: string; required: boolean; options: { id: number }[] }[],
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

  /** ตรวจ+เตรียมฟิลด์เฉพาะประเภทการรับสมัคร — บังคับกรอกเมื่อกิจกรรมเป็นประเภทที่ต้องใช้ฟิลด์นั้น
   *  และค่าที่เลือก (บทบาท/กะเวลา/ประเภทการแข่งขัน) ต้องอยู่ในตัวเลือกที่ผู้จัดกำหนดไว้จริง (กันค่าหลุดจากฟอร์ม) */
  private validateAndPrepareRegistrationTypeFields(
    activity: {
      registrationType: string;
      dutyRoleOptions: string[];
      dutyShiftOptions: string[];
      teamSizeMin: number | null;
      teamSizeMax: number | null;
      competitionCategoryOptions: string[];
    },
    input: RegistrationTypeFieldsInput,
  ) {
    if (activity.registrationType === RegistrationType.STAFF_VOLUNTEER) {
      const dutyRole = input.dutyRole?.trim();
      if (!dutyRole || !activity.dutyRoleOptions.includes(dutyRole)) {
        throw new BadRequestException('กรุณาเลือกบทบาท/หน้าที่จากตัวเลือกที่กำหนด');
      }
      const needsShift = activity.dutyShiftOptions.length > 0;
      const dutyShift = input.dutyShift?.trim();
      if (needsShift && (!dutyShift || !activity.dutyShiftOptions.includes(dutyShift))) {
        throw new BadRequestException('กรุณาเลือกรอบ/กะเวลาจากตัวเลือกที่กำหนด');
      }
      return {
        dutyRole,
        dutyShift: needsShift ? dutyShift : null,
        teamName: null,
        teamSize: null,
        competitionCategory: null,
        submissionLink: null,
      };
    }

    if (activity.registrationType === RegistrationType.CONTESTANT) {
      const teamName = input.teamName?.trim();
      if (!teamName) throw new BadRequestException('กรุณาระบุชื่อทีม');

      const teamSize = input.teamSize;
      if (activity.teamSizeMin != null && (teamSize == null || teamSize < activity.teamSizeMin)) {
        throw new BadRequestException(`จำนวนสมาชิกทีมต้องไม่น้อยกว่า ${activity.teamSizeMin} คน`);
      }
      if (activity.teamSizeMax != null && (teamSize == null || teamSize > activity.teamSizeMax)) {
        throw new BadRequestException(`จำนวนสมาชิกทีมต้องไม่เกิน ${activity.teamSizeMax} คน`);
      }

      const needsCategory = activity.competitionCategoryOptions.length > 0;
      const competitionCategory = input.competitionCategory?.trim();
      if (needsCategory && (!competitionCategory || !activity.competitionCategoryOptions.includes(competitionCategory))) {
        throw new BadRequestException('กรุณาเลือกประเภท/รุ่นการแข่งขันจากตัวเลือกที่กำหนด');
      }

      return {
        dutyRole: null,
        dutyShift: null,
        teamName,
        teamSize: teamSize ?? null,
        competitionCategory: needsCategory ? competitionCategory : competitionCategory || null,
        submissionLink: input.submissionLink?.trim() || null,
      };
    }

    // participant — กันค่าหลุดมาจากกิจกรรมที่ไม่รองรับ (เหมือน offersVolunteerCert gate ด้านบน)
    return {
      dutyRole: null,
      dutyShift: null,
      teamName: null,
      teamSize: null,
      competitionCategory: null,
      submissionLink: null,
    };
  }

  async cancel(registrationId: number, studentId: number) {
    const registration = await this.registrationsRepository.findByIdAndStudent(registrationId, studentId);

    if (!registration) throw new NotFoundException('ไม่พบรายการลงทะเบียน');

    if (registration.status === RegistrationStatus.CANCELLED) {
      throw new BadRequestException('รายการนี้ถูกยกเลิกแล้ว');
    }

    // กันยกเลิกย้อนหลังหลังเช็คอินไปแล้ว — เดิม endpoint นี้ไม่เช็คเลย ต้องพึ่ง frontend ล้วนๆ
    // ซึ่งเลี่ยงได้ง่ายด้วยการยิง API ตรง ทำให้ attendance ค้างเป็น attended แต่ status กลายเป็น cancelled
    if (registration.attendance === AttendanceStatus.ATTENDED) {
      throw new BadRequestException('ไม่สามารถยกเลิกได้ เนื่องจากเช็คอินเข้าร่วมกิจกรรมนี้ไปแล้ว');
    }

    await this.registrationsRepository.update(registrationId, { status: RegistrationStatus.CANCELLED as any });

    this.logger.log(`Registration cancelled: ID ${registrationId}`);
  }

  async findByStudent(studentId: number) {
    const registrations = await this.registrationsRepository.findByStudent(studentId);
    // คะแนนที่ยังรอผู้จัดอนุมัติ (โหมด 360°) ต้องไม่ถึงนักศึกษา — คงแถวไว้แต่ปิดคะแนน (ดูเหตุผลที่ maskUnapprovedEvaluation)
    return registrations.map((registration) => ({
      ...registration,
      evaluation: maskUnapprovedEvaluation(registration.evaluation),
    }));
  }

  async findByActivity(callerId: number, callerRole: UserRole, activityId: number) {
    const organizerId = await this.registrationsRepository.findActivityOrganizerId(activityId);

    if (organizerId === null) throw new NotFoundException('ไม่พบกิจกรรม');
    this.assertOwnsActivity(callerId, callerRole, organizerId, 'ดูผู้เข้าร่วม');

    return this.registrationsRepository.findByActivity(activityId);
  }

  /** organizer/admin เท่านั้นที่แก้ไขข้อมูลผู้เข้าร่วมของกิจกรรมได้ — และต้องเป็นเจ้าของกิจกรรมนั้นจริง (ไม่ใช่แค่มี role ที่ถูกต้อง) */
  private assertOwnsActivity(callerId: number, callerRole: UserRole, organizerId: number, action: string) {
    if (callerRole !== UserRole.ADMIN && organizerId !== callerId) {
      throw new ForbiddenException(`คุณไม่มีสิทธิ์${action}ของกิจกรรมนี้`);
    }
  }

  async confirm(callerId: number, callerRole: UserRole, registrationId: number) {
    const registration = await this.registrationsRepository.findByIdWithActivity(registrationId);

    if (!registration) throw new NotFoundException('ไม่พบรายการลงทะเบียน');
    this.assertOwnsActivity(callerId, callerRole, registration.activity.organizerId, 'ยืนยันผู้เข้าร่วม');

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

  async checkIn(callerId: number, callerRole: UserRole, registrationId: number) {
    const registration = await this.registrationsRepository.findByIdWithActivitySoftSkills(registrationId);

    if (!registration) throw new NotFoundException('ไม่พบรายการลงทะเบียน');
    this.assertOwnsActivity(callerId, callerRole, registration.activity.organizerId, 'เช็คอินผู้เข้าร่วม');

    return this.performCheckIn(registration);
  }

  /**
   * เช็คอินด้วยตัวเอง — นักศึกษาสแกน QR code ที่ organizer แสดงหน้างาน แล้วเช็คอินเข้ากิจกรรมของตัวเองทันที
   * ไม่ต้องมี organizer คอยกดให้ ต่างจาก checkIn() ที่เป็นฝั่ง organizer กดแทน
   */
  async checkInSelf(studentId: number, activityId: number) {
    const registration = await this.registrationsRepository.findActiveByStudentAndActivityWithSoftSkills(
      studentId,
      activityId,
    );

    if (!registration) {
      throw new NotFoundException('ไม่พบการลงทะเบียนของคุณสำหรับกิจกรรมนี้ หรือถูกยกเลิกไปแล้ว');
    }

    // สแกนซ้ำ (เช่น เน็ตหลุดตอนกดครั้งแรก) ต้องไม่ error — ถือว่าเช็คอินสำเร็จอยู่แล้ว
    if (registration.attendance === AttendanceStatus.ATTENDED) {
      return { ...registration, alreadyCheckedIn: true as const };
    }

    const saved = await this.performCheckIn(registration);
    return { ...saved, alreadyCheckedIn: false as const };
  }

  /** แกนกลางของการเช็คอิน — ใช้ร่วมกันทั้ง organizer กดเช็คอินให้ และนักศึกษาเช็คอินด้วยตัวเองผ่าน QR */
  private async performCheckIn(registration: {
    id: number;
    status: string;
    activityId: number;
    dutyRole?: string | null;
    activity: { organizerId: number; peerAssessmentEnabled?: boolean; softSkills: { skillType: string; rate: number }[] };
  }) {
    // การยืนยันลงทะเบียน (organizer อนุมัติล่วงหน้า) กับการเช็คอิน (มาเข้าร่วมจริงหน้างาน) เป็นคนละเรื่องกัน —
    // ไม่ยืนยันไว้ก่อนไม่ได้แปลว่าจะไม่มาจริง จึงให้เช็คอินได้เลยแม้สถานะยังรอการยืนยัน (ยกเว้นถูกยกเลิกไปแล้ว)
    // และถือว่ายืนยันอัตโนมัติไปพร้อมกัน เพราะมาจริงหน้างานคือหลักฐานที่หนักแน่นกว่าการอนุมัติล่วงหน้า
    // (ไม่ส่งอีเมลยืนยันซ้ำในเคสนี้ — notifyRegistrationConfirmed ผูกกับ confirm() เท่านั้น เพราะเช็คอินเกิดขึ้นตอนงานแล้ว)
    if (registration.status === RegistrationStatus.CANCELLED) {
      throw new BadRequestException('ไม่สามารถเช็คอินได้ เนื่องจากรายการลงทะเบียนนี้ถูกยกเลิกแล้ว');
    }

    // เช็คอิน + ยืนยันอัตโนมัติ + สร้างคะแนน Soft Skills ต้องสำเร็จหรือล้มเหลวพร้อมกันเสมอ
    const saved = await this.prisma.$transaction(async (tx) => {
      const updated = await this.registrationsRepository.updateTx(tx, registration.id, {
        status: RegistrationStatus.CONFIRMED as any,
        attendance: AttendanceStatus.ATTENDED as any,
        checkInTime: new Date(),
      });

      await this.evaluationsService.autoCreateForCheckIn(
        tx,
        registration.id,
        registration.activity.organizerId,
        registration.activity.softSkills,
        {
          activityId: registration.activityId,
          dutyRole: registration.dutyRole,
          pendingApproval: !!registration.activity.peerAssessmentEnabled,
        },
      );

      return updated;
    });

    this.logger.log(`Check-in: registration ID ${registration.id}`);
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

    // งานมี event ผูกอยู่ก็ใช้แบบสำรวจของ event; กิจกรรมเดี่ยวไม่มี event ก็ใช้แบบสำรวจของตัวเอง
    return registration.activity.event?.surveyQuestions ?? registration.activity.surveyQuestions ?? [];
  }

  async submitSurvey(registrationId: number, studentId: number, answers: SurveyAnswerInput[]) {
    const registration = await this.registrationsRepository.findByIdWithEventSurveyQuestions(registrationId);

    if (!registration || registration.studentId !== studentId) {
      throw new NotFoundException('ไม่พบรายการลงทะเบียน');
    }
    if (registration.attendance !== AttendanceStatus.ATTENDED) {
      throw new BadRequestException('ต้องเช็คอินเข้าร่วมกิจกรรมก่อนจึงจะให้คะแนนได้');
    }

    const questions = registration.activity.event?.surveyQuestions ?? registration.activity.surveyQuestions ?? [];
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
