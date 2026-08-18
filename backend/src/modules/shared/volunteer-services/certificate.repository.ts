import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CertificatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findRegistrationWithActivityAndStudent(registrationId: number) {
    return this.prisma.registration.findUnique({
      where: { id: registrationId },
      include: { activity: true, student: true },
    });
  }

  findByRegistrationId(registrationId: number) {
    return this.prisma.certificate.findUnique({ where: { registrationId } });
  }

  create(
    registrationId: number,
    certificateUrl: string,
    verificationCode: string,
    volunteerHours?: unknown,
    volunteerRole?: string | null,
  ) {
    return this.prisma.certificate.create({
      data: {
        registrationId,
        certificateUrl,
        verificationCode,
        volunteerHours,
        volunteerRole,
      } as any,
    });
  }

  findByStudent(studentId: number) {
    return this.prisma.certificate.findMany({
      where: { registration: { studentId } },
      include: { registration: { include: { activity: true } } },
      orderBy: { issueDate: 'desc' },
    });
  }

  findById(id: number) {
    return this.prisma.certificate.findUnique({
      where: { id },
      include: { registration: { include: { activity: true, student: true } } },
    });
  }

  findByVerificationCode(code: string) {
    return this.prisma.certificate.findUnique({
      where: { verificationCode: code },
      include: { registration: { include: { activity: true, student: true } } },
    });
  }
}
