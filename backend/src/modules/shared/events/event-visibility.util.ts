import { matchesStudentIdFilter, matchesYearFilter } from '../../../common/utils/student-id-range.util';

export interface Viewer {
  role: string;
  studentId?: string | null;
  program?: string | null;
}

export interface VisibilityCheckEvent {
  visibility: string;
  visibilityStudentIdFilter?: string | null;
  visibilityProgram: { programCode: string }[];
  visibilityYears: { year: number }[];
}

/**
 * เช็คสิทธิ์เห็น/ลงทะเบียนกิจกรรมที่ผูกกับ event แบบ restricted
 *
 * ไม่ทำเป็น Prisma `where` clause ตรงๆ เพราะตัวกรองรหัสนักศึกษาเป็น free-text range
 * (ดู student-id-range.util.ts) ที่ SQL ทำไม่ได้ตรงไปตรงมา จึงกรองที่ชั้น service เสมอ
 * หลังดึงข้อมูลมาแล้ว — ขนาดข้อมูลเป็นระดับกิจกรรมของภาควิชา (หลักสิบ-ร้อยรายการ)
 * กรองในหน่วยความจำได้โดยไม่กระทบประสิทธิภาพ
 */
export function isViewerEligibleForEvent(
  viewer: Viewer | null | undefined,
  event: VisibilityCheckEvent | null | undefined,
): boolean {
  if (viewer?.role === 'admin') return true;
  if (!event || event.visibility !== 'restricted') return true;

  if (event.visibilityProgram.length > 0) {
    if (!viewer?.program || !event.visibilityProgram.some((p) => p.programCode === viewer.program)) {
      return false;
    }
  }

  if (event.visibilityYears.length > 0) {
    if (!matchesYearFilter(viewer?.studentId, event.visibilityYears.map((y) => y.year))) {
      return false;
    }
  }

  if (event.visibilityStudentIdFilter && !matchesStudentIdFilter(viewer?.studentId, event.visibilityStudentIdFilter)) {
    return false;
  }

  return true;
}

/** กรองรายการกิจกรรมให้เหลือเฉพาะที่ viewer มีสิทธิ์เห็น — ใช้กับรายการกิจกรรมสาธารณะ */
export function filterVisibleActivities<T extends { event: VisibilityCheckEvent | null }>(
  activities: T[],
  viewer: Viewer | null,
): T[] {
  return activities.filter((a) => isViewerEligibleForEvent(viewer, a.event));
}
