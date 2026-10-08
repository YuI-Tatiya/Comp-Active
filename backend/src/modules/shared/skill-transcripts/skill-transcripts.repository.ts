// skill-transcripts.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { STUDENT_BASIC_SELECT } from '../../../common/constants/user-select';
import { SkillTranscriptSnapshot } from './skill-transcript-snapshot.util';

@Injectable()
export class SkillTranscriptsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** allow-list เท่านั้น — ดู common/constants/user-select.ts */
  findStudentBasic(studentId: number) {
    return this.prisma.user.findUnique({ where: { id: studentId }, select: STUDENT_BASIC_SELECT });
  }

  /** ใช้นับโควตา (รวมฉบับที่ยกเลิกแล้ว) และคำนวณเวลาที่ออกได้อีกครั้ง */
  listIssuedSince(studentId: number, since: Date) {
    return this.prisma.skillTranscript.findMany({
      where: { studentId, issuedAt: { gte: since } },
      orderBy: { issuedAt: 'asc' },
      select: { issuedAt: true },
    });
  }

  create(studentId: number, code: string, snapshot: SkillTranscriptSnapshot) {
    return this.prisma.skillTranscript.create({ data: { studentId, code, snapshot: snapshot as any } });
  }

  findByCode(code: string) {
    return this.prisma.skillTranscript.findUnique({ where: { code } });
  }

  listByStudent(studentId: number) {
    return this.prisma.skillTranscript.findMany({ where: { studentId }, orderBy: { issuedAt: 'desc' } });
  }

  markRevoked(id: number, at: Date) {
    return this.prisma.skillTranscript.update({ where: { id }, data: { revokedAt: at } });
  }
}
