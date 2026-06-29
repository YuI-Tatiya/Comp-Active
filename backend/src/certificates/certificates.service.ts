import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus } from '../common/enums/status.enum';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async issue(registrationId: number) {
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
      include: { activity: true, student: true },
    });

    if (!registration) throw new NotFoundException('ไม่พบรายการลงทะเบียน');

    if (registration.attendance !== AttendanceStatus.ATTENDED) {
      throw new BadRequestException(
        'นักศึกษาต้องเช็คอินเข้าร่วมกิจกรรมก่อนจึงจะออกเกียรติบัตรได้',
      );
    }

    const existing = await this.prisma.certificate.findUnique({
      where: { registrationId },
    });

    if (existing) throw new BadRequestException('ออกเกียรติบัตรให้รายการนี้แล้ว');

    const certificateUrl = `/certificates/${registrationId}-${Date.now()}.pdf`;

    const certificate = await this.prisma.certificate.create({
      data: { registrationId, certificateUrl },
    });

    this.logger.log(`Certificate issued: registration ID ${registrationId}`);
    return certificate;
  }

  async findByStudent(studentId: number) {
    return this.prisma.certificate.findMany({
      where: { registration: { studentId } },
      include: {
        registration: { include: { activity: true } },
      },
      orderBy: { issueDate: 'desc' },
    });
  }

  async findById(id: number) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id },
      include: {
        registration: { include: { activity: true, student: true } },
      },
    });

    if (!certificate) throw new NotFoundException('ไม่พบเกียรติบัตร');
    return certificate;
  }
}
