import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registration } from './entities/registration.entity';
import { Activity } from '../activities/entities/activity.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import {
  RegistrationStatus,
  AttendanceStatus,
  ActivityStatus,
  ApprovalStatus,
} from '../common/enums/status.enum';

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
  ) {}

  /**
   * ลงทะเบียนเข้าร่วมกิจกรรม (Student)
   */
  async create(studentId: number, activityId: number): Promise<Registration> {
    // ตรวจสอบว่ากิจกรรมมีอยู่จริง
    const activity = await this.activityRepository.findOne({
      where: { id: activityId },
      relations: ['registrations'],
    });

    if (!activity) {
      throw new NotFoundException('ไม่พบกิจกรรม');
    }

    // ตรวจสอบว่ากิจกรรมเปิดรับ + อนุมัติแล้ว
    if (activity.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new BadRequestException('กิจกรรมนี้ยังไม่ได้รับการอนุมัติ');
    }

    if (activity.status !== ActivityStatus.OPEN) {
      throw new BadRequestException('กิจกรรมนี้ปิดรับสมัครแล้ว');
    }

    // ตรวจสอบจำนวนที่นั่ง
    const currentCount = activity.registrations?.filter(
      (r) => r.status !== RegistrationStatus.CANCELLED,
    ).length || 0;

    if (currentCount >= activity.capacity) {
      throw new BadRequestException('กิจกรรมนี้เต็มแล้ว');
    }

    // ตรวจสอบว่าลงทะเบียนซ้ำหรือไม่
    const existing = await this.registrationRepository.findOne({
      where: {
        studentId,
        activityId,
        status: RegistrationStatus.PENDING,
      },
    });

    if (existing) {
      throw new ConflictException('คุณลงทะเบียนกิจกรรมนี้แล้ว');
    }

    const confirmedExisting = await this.registrationRepository.findOne({
      where: {
        studentId,
        activityId,
        status: RegistrationStatus.CONFIRMED,
      },
    });

    if (confirmedExisting) {
      throw new ConflictException('คุณลงทะเบียนกิจกรรมนี้แล้ว');
    }

    // สร้างการลงทะเบียน
    const registration = this.registrationRepository.create({
      studentId,
      activityId,
      status: RegistrationStatus.PENDING,
    });

    const saved = await this.registrationRepository.save(registration);
    this.logger.log(
      `Registration created: student ${studentId} → activity ${activityId}`,
    );
    return saved;
  }

  /**
   * ยกเลิกการลงทะเบียน (Student)
   */
  async cancel(registrationId: number, studentId: number): Promise<void> {
    const registration = await this.registrationRepository.findOne({
      where: { id: registrationId, studentId },
    });

    if (!registration) {
      throw new NotFoundException('ไม่พบรายการลงทะเบียน');
    }

    if (registration.status === RegistrationStatus.CANCELLED) {
      throw new BadRequestException('รายการนี้ถูกยกเลิกแล้ว');
    }

    registration.status = RegistrationStatus.CANCELLED;
    await this.registrationRepository.save(registration);
    this.logger.log(`Registration cancelled: ID ${registrationId}`);
  }

  /**
   * ดูประวัติการลงทะเบียนของ Student
   */
  async findByStudent(studentId: number): Promise<Registration[]> {
    return this.registrationRepository.find({
      where: { studentId },
      relations: ['activity', 'evaluation'],
      order: { registerDate: 'DESC' },
    });
  }

  /**
   * ดูรายชื่อผู้สมัครของกิจกรรม (Organizer)
   */
  async findByActivity(activityId: number): Promise<Registration[]> {
    return this.registrationRepository.find({
      where: { activityId },
      relations: ['student'],
      order: { registerDate: 'ASC' },
    });
  }

  /**
   * ยืนยันผู้เข้าร่วม (Organizer)
   */
  async confirm(registrationId: number): Promise<Registration> {
    const registration = await this.registrationRepository.findOne({
      where: { id: registrationId },
    });

    if (!registration) {
      throw new NotFoundException('ไม่พบรายการลงทะเบียน');
    }

    registration.status = RegistrationStatus.CONFIRMED;
    const saved = await this.registrationRepository.save(registration);
    this.logger.log(`Registration confirmed: ID ${registrationId}`);
    return saved;
  }

  /**
   * เช็คอิน / Mark Attendance (Organizer)
   */
  async checkIn(registrationId: number): Promise<Registration> {
    const registration = await this.registrationRepository.findOne({
      where: { id: registrationId },
    });

    if (!registration) {
      throw new NotFoundException('ไม่พบรายการลงทะเบียน');
    }

    if (registration.status !== RegistrationStatus.CONFIRMED) {
      throw new BadRequestException('ต้องยืนยันการลงทะเบียนก่อนเช็คอิน');
    }

    registration.attendance = AttendanceStatus.ATTENDED;
    registration.checkInTime = new Date();
    const saved = await this.registrationRepository.save(registration);
    this.logger.log(`Check-in: registration ID ${registrationId}`);
    return saved;
  }

  /**
   * นับจำนวนการลงทะเบียนทั้งหมด
   */
  async countAll(): Promise<number> {
    return this.registrationRepository.count();
  }
}
