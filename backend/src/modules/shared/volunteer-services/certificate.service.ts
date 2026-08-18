import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CertificatesRepository } from './certificate.repository';
import { AttendanceStatus } from '../../../common/enums/status.enum';
import { generateSecureToken } from '../../../common/utils';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(private readonly certificatesRepository: CertificatesRepository) {}

  async issue(registrationId: number) {
    const registration = await this.certificatesRepository.findRegistrationWithActivityAndStudent(registrationId);

    if (!registration) throw new NotFoundException('ไม่พบรายการลงทะเบียน');

    if (registration.attendance !== AttendanceStatus.ATTENDED) {
      throw new BadRequestException(
        'นักศึกษาต้องเช็คอินเข้าร่วมกิจกรรมก่อนจึงจะออกเกียรติบัตรได้',
      );
    }

    const existing = await this.certificatesRepository.findByRegistrationId(registrationId);

    if (existing) throw new BadRequestException('ออกเกียรติบัตรให้รายการนี้แล้ว');

    const certificateUrl = `/certificates/${registrationId}-${Date.now()}.pdf`;
    // สแนปช็อตชั่วโมง/บทบาทจิตอาสาไว้ที่ใบเกียรติบัตร ณ เวลาออก — กันไม่ให้ค่าบนใบเปลี่ยนไปถ้ากิจกรรมถูกแก้ไขภายหลัง
    const { volunteerHours, volunteerRole } = registration.activity;

    let certificate;
    try {
      certificate = await this.certificatesRepository.create(
        registrationId,
        certificateUrl,
        generateSecureToken(6).toUpperCase(),
        volunteerHours,
        volunteerRole,
      );
    } catch (error: any) {
      if (error?.code === 'P2002') {
        // Extremely rare verification-code collision — retry once with a fresh code.
        certificate = await this.certificatesRepository.create(
          registrationId,
          certificateUrl,
          generateSecureToken(6).toUpperCase(),
          volunteerHours,
          volunteerRole,
        );
      } else {
        throw error;
      }
    }

    this.logger.log(`Certificate issued: registration ID ${registrationId}`);
    return certificate;
  }

  async findByStudent(studentId: number) {
    return this.certificatesRepository.findByStudent(studentId);
  }

  async findById(id: number) {
    const certificate = await this.certificatesRepository.findById(id);
    if (!certificate) throw new NotFoundException('ไม่พบเกียรติบัตร');
    return certificate;
  }

  async verify(code: string) {
    const certificate = await this.certificatesRepository.findByVerificationCode(code.toUpperCase());

    if (!certificate) {
      return { valid: false };
    }

    return {
      valid: true,
      certificateId: certificate.id,
      issueDate: certificate.issueDate,
      holderName: certificate.registration.student.name,
      activityName: certificate.registration.activity.name,
      activityDate: certificate.registration.activity.date,
    };
  }
}
