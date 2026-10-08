// skill-transcripts.service.ts
import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SkillTranscriptsRepository } from './skill-transcripts.repository';
import { EvaluationsRepository } from '../registrations/evaluation.repository';
import { generateTranscriptCode, normalizeTranscriptCode } from './skill-transcript-code.util';
import { buildTranscriptSnapshot, SkillTranscriptSnapshot, TranscriptEvaluationRow } from './skill-transcript-snapshot.util';

export const TRANSCRIPT_QUOTA = 5;
export const TRANSCRIPT_QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 3;

export type VerifyResult =
  | { status: 'valid'; code: string; issuedAt: Date; snapshot: SkillTranscriptSnapshot }
  | { status: 'revoked'; code: string; revokedAt: Date }
  | { status: 'not_found' };

@Injectable()
export class SkillTranscriptsService {
  private readonly logger = new Logger(SkillTranscriptsService.name);

  constructor(
    private readonly repository: SkillTranscriptsRepository,
    private readonly evaluationsRepository: EvaluationsRepository,
  ) {}

  async issue(studentId: number) {
    const student = await this.repository.findStudentBasic(studentId);
    if (!student) throw new NotFoundException('ไม่พบผู้ใช้งาน');

    // findByStudentWithActivity กรอง APPROVED_ONLY แล้ว — คะแนนที่รออนุมัติ (360°) จึงไม่เข้าเอกสาร
    const rows = await this.evaluationsRepository.findByStudentWithActivity(studentId);
    if (rows.length === 0) {
      throw new BadRequestException('ยังไม่มีผลประเมิน Soft Skills ที่อนุมัติแล้ว จึงยังออกเอกสารไม่ได้');
    }

    await this.assertWithinQuota(studentId);

    const snapshot = buildTranscriptSnapshot(
      { name: student.name, studentId: student.studentId },
      rows as unknown as TranscriptEvaluationRow[],
    );

    for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
      const code = generateTranscriptCode();
      try {
        const created = await this.repository.create(studentId, code, snapshot);
        this.logger.log(`Skill transcript issued: student id=${studentId}`);
        return { code: created.code, issuedAt: created.issuedAt, snapshot };
      } catch (error) {
        const isCodeCollision = (error as { code?: string })?.code === 'P2002';
        if (!isCodeCollision || attempt === MAX_CODE_ATTEMPTS) throw error;
      }
    }
    /* istanbul ignore next — วนครบแล้วจะ throw ในลูปเสมอ */
    throw new Error('unreachable');
  }

  async listMine(studentId: number) {
    const rows = await this.repository.listByStudent(studentId);
    return rows.map((row) => {
      const summary = (row.snapshot as unknown as SkillTranscriptSnapshot).summary;
      return {
        code: row.code,
        issuedAt: row.issuedAt,
        revokedAt: row.revokedAt,
        activityCount: summary.activityCount,
        totalScore: summary.totalScore,
      };
    });
  }

  async revoke(studentId: number, rawCode: string) {
    const code = normalizeTranscriptCode(rawCode);
    const row = code ? await this.repository.findByCode(code) : null;
    // รหัสของคนอื่นกับรหัสที่ไม่มีอยู่ต้องตอบเหมือนกันทุกประการ — ไม่บอกว่ารหัสนั้นมีอยู่จริง
    if (!row || row.studentId !== studentId) throw new NotFoundException('ไม่พบเอกสาร');

    if (row.revokedAt) return { code: row.code, revokedAt: row.revokedAt };

    const updated = await this.repository.markRevoked(row.id, new Date());
    this.logger.log(`Skill transcript revoked: student id=${studentId}`);
    return { code: updated.code, revokedAt: updated.revokedAt as Date };
  }

  async verify(rawCode: string): Promise<VerifyResult> {
    const code = normalizeTranscriptCode(rawCode);
    if (!code) return { status: 'not_found' }; // ผิดรูปแบบ → ไม่ต้องไปถึง DB

    const row = await this.repository.findByCode(code);
    if (!row) return { status: 'not_found' };

    // ยกเลิกแล้ว = ถอนการเปิดเผย จึงไม่ส่ง snapshot ออกไป
    if (row.revokedAt) return { status: 'revoked', code: row.code, revokedAt: row.revokedAt };

    return { status: 'valid', code: row.code, issuedAt: row.issuedAt, snapshot: row.snapshot as unknown as SkillTranscriptSnapshot };
  }

  /** นับจาก DB (ไม่หายตอนรีสตาร์ท) รวมฉบับที่ยกเลิกแล้ว กันการออกแล้วยกเลิกวนเพื่อ spam */
  private async assertWithinQuota(studentId: number) {
    const since = new Date(Date.now() - TRANSCRIPT_QUOTA_WINDOW_MS);
    const issued = await this.repository.listIssuedSince(studentId, since);
    if (issued.length < TRANSCRIPT_QUOTA) return;

    // ฉบับที่ทำให้พ้นโควตาเป็นอันแรกเมื่อหลุดหน้าต่าง = ฉบับที่ (จำนวน - โควตา) ในลำดับเก่า → ใหม่
    const blocking = issued[issued.length - TRANSCRIPT_QUOTA];
    const nextAllowed = new Date(blocking.issuedAt.getTime() + TRANSCRIPT_QUOTA_WINDOW_MS);
    throw new HttpException(
      `ออกเอกสารได้สูงสุด ${TRANSCRIPT_QUOTA} ฉบับต่อ 24 ชั่วโมง ออกได้อีกครั้งหลัง ${nextAllowed.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
