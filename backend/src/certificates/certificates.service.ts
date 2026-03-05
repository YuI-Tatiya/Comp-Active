import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificate } from './entities/certificate.entity';
import { Registration } from '../registrations/entities/registration.entity';
import { AttendanceStatus } from '../common/enums/status.enum';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
  ) {}

  /**
   * ออกเกียรติบัตร (Organizer)
   */
  async issue(registrationId: number): Promise<Certificate> {
    const registration = await this.registrationRepository.findOne({
      where: { id: registrationId },
      relations: ['activity', 'student'],
    });

    if (!registration) {
      throw new NotFoundException('ไม่พบรายการลงทะเบียน');
    }

    if (registration.attendance !== AttendanceStatus.ATTENDED) {
      throw new BadRequestException(
        'นักศึกษาต้องเช็คอินเข้าร่วมกิจกรรมก่อนจึงจะออกเกียรติบัตรได้',
      );
    }

    // ตรวจสอบว่าออกเกียรติบัตรแล้วหรือยัง
    const existing = await this.certificateRepository.findOne({
      where: { registrationId },
    });

    if (existing) {
      throw new BadRequestException('ออกเกียรติบัตรให้รายการนี้แล้ว');
    }

    // สร้าง URL ของเกียรติบัตร (placeholder - ต้องเปลี่ยนเป็น URL จริงเมื่อมีระบบ generate)
    const certificateUrl = `/certificates/${registrationId}-${Date.now()}.pdf`;

    const certificate = this.certificateRepository.create({
      registrationId,
      certificateUrl,
    });

    const saved = await this.certificateRepository.save(certificate);
    this.logger.log(`Certificate issued: registration ID ${registrationId}`);
    return saved;
  }

  /**
   * ดูเกียรติบัตรของ Student
   */
  async findByStudent(studentId: number): Promise<Certificate[]> {
    return this.certificateRepository
      .createQueryBuilder('cert')
      .innerJoinAndSelect('cert.registration', 'reg')
      .innerJoinAndSelect('reg.activity', 'activity')
      .where('reg.studentId = :studentId', { studentId })
      .orderBy('cert.issueDate', 'DESC')
      .getMany();
  }

  /**
   * ดึงเกียรติบัตรตาม ID
   */
  async findById(id: number): Promise<Certificate> {
    const certificate = await this.certificateRepository.findOne({
      where: { id },
      relations: ['registration', 'registration.activity', 'registration.student'],
    });

    if (!certificate) {
      throw new NotFoundException('ไม่พบเกียรติบัตร');
    }

    return certificate;
  }
}
