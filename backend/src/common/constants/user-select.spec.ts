import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { STUDENT_BASIC_SELECT, STUDENT_CONTACT_SELECT } from './user-select';

const SRC_ROOT = join(__dirname, '..', '..');

/** ชื่อความสัมพันธ์ที่ชี้ไปที่ model User ใน schema.prisma */
const USER_RELATIONS = ['student', 'organizer', 'evaluator', 'owner', 'invitedBy', 'updatedBy', 'approvedBy'];
const FULL_USER_INCLUDE = new RegExp(`\\b(${USER_RELATIONS.join('|')})\\s*:\\s*true\\b`);

const CREDENTIAL_COLUMNS = ['password', 'verificationOtp', 'verificationOtpExpiresAt', 'verificationOtpAttempts'];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith('.ts') && !full.endsWith('.spec.ts') ? [full] : [];
  });
}

describe('การ join ตาราง User — ห้ามปล่อยแถวเต็มออก response', () => {
  it('ไม่มีโค้ดไหน include ความสัมพันธ์ของ User แบบ `: true` (จะส่ง password hash + OTP ออกไปด้วย)', () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(SRC_ROOT)) {
      readFileSync(file, 'utf-8')
        .split('\n')
        .forEach((line, index) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) return;
          const code = line.replace(/\/\/.*$/, '');
          if (FULL_USER_INCLUDE.test(code)) offenders.push(`${relative(SRC_ROOT, file)}:${index + 1}  ${trimmed}`);
        });
    }

    expect(offenders).toEqual([]);
  });

  it.each([
    ['STUDENT_BASIC_SELECT', STUDENT_BASIC_SELECT],
    ['STUDENT_CONTACT_SELECT', STUDENT_CONTACT_SELECT],
  ])('%s ไม่มีคอลัมน์ credential', (_name, select) => {
    for (const column of CREDENTIAL_COLUMNS) {
      expect(Object.keys(select)).not.toContain(column);
    }
  });
});
