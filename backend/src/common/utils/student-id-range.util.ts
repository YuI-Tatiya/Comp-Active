/**
 * รหัสนักศึกษาของวิทยาลัยการคอมพิวเตอร์มีรูปแบบ YY3380NNN-N (ดู STUDENT_ID_REGEX ใน common/constants)
 * โดย YY คือ 2 หลักท้ายของปี พ.ศ. ที่เข้าศึกษา (เช่น 65 = เข้าปี 2565)
 */

function normalizeStudentId(id: string): string {
  return id.replace(/-/g, '').trim();
}

/**
 * รูปแบบตัวกรองรหัสนักศึกษา (Event.visibilityStudentIdFilter):
 * - แยกแต่ละรายการด้วย comma หรือขึ้นบรรทัดใหม่
 * - รหัสเดี่ยว: "653380123-4" (รูปแบบเดียวกับ STUDENT_ID_REGEX)
 * - ช่วงรหัส: "653380001-1..653380100-5" — ใช้ ".." คั่นช่วง (ไม่ใช้ "-" คั่น
 *   เพราะตัวรหัสนักศึกษาเองมี "-" อยู่แล้ว จะกำกวมว่าตัวไหนคือส่วนของรหัส ตัวไหนคือตัวคั่นช่วง)
 * เทียบแบบ lexicographic บนสตริงที่ตัด "-" ออกแล้ว — ใช้ได้เพราะความยาวเท่ากันเสมอ จึงเทียบแบบตัวเลขได้จริง
 */
export function matchesStudentIdFilter(
  studentId: string | null | undefined,
  filter: string | null | undefined,
): boolean {
  if (!filter || !filter.trim()) return true; // ไม่ตั้งตัวกรอง = ผ่านทุกคน
  if (!studentId) return false;

  const normalizedId = normalizeStudentId(studentId);
  const tokens = filter
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    if (token.includes('..')) {
      const [fromRaw, toRaw] = token.split('..');
      const from = normalizeStudentId(fromRaw ?? '');
      const to = normalizeStudentId(toRaw ?? '');
      if (from.length === normalizedId.length && to.length === normalizedId.length) {
        if (normalizedId >= from && normalizedId <= to) return true;
      }
    } else if (normalizeStudentId(token) === normalizedId) {
      return true;
    }
  }

  return false;
}

// ⚠️ นโยบายที่ต้องตัดสินใจ (ไม่มีข้อมูลปีการศึกษาเก็บแยกไว้ในระบบ — คำนวณจากรหัสนักศึกษาแทน):
// ปีการศึกษาของ ม. ส่วนใหญ่เริ่มราวกลางปี ใช้เดือนมิถุนายนเป็นจุดเปลี่ยนปีการศึกษา
// ถ้ามหาวิทยาลัยใช้เดือนอื่น ให้แก้ค่านี้ที่เดียว
const ACADEMIC_YEAR_ROLLOVER_MONTH = 6; // 1-12, มิถุนายน

/** ปี พ.ศ. เต็มจาก 2 หลักท้ายที่เก็บในรหัสนักศึกษา (สมมติอยู่ในช่วง พ.ศ. 25xx) */
function admissionYearFromStudentId(studentId: string): number | null {
  const normalized = normalizeStudentId(studentId);
  const prefix = normalized.slice(0, 2);
  if (!/^\d{2}$/.test(prefix)) return null;
  return 2500 + Number(prefix);
}

/** ชั้นปีปัจจุบันของนักศึกษา (1 = ปี 1, 2 = ปี 2, ...) คำนวณจากรหัสนักศึกษา + วันที่ปัจจุบัน */
export function currentYearLevel(studentId: string | null | undefined, now: Date = new Date()): number | null {
  if (!studentId) return null;
  const admissionYear = admissionYearFromStudentId(studentId);
  if (admissionYear === null) return null;

  const currentBEYear = now.getFullYear() + 543;
  const currentAcademicYear =
    now.getMonth() + 1 >= ACADEMIC_YEAR_ROLLOVER_MONTH ? currentBEYear : currentBEYear - 1;

  const level = currentAcademicYear - admissionYear + 1;
  return level >= 1 ? level : null;
}

/** true ถ้าชั้นปีปัจจุบันของนักศึกษาอยู่ในรายการชั้นปีที่กำหนด (รายการว่าง = ผ่านทุกคน) */
export function matchesYearFilter(studentId: string | null | undefined, allowedYears: number[]): boolean {
  if (allowedYears.length === 0) return true;
  const level = currentYearLevel(studentId);
  return level !== null && allowedYears.includes(level);
}
