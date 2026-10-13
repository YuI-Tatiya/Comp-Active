import { matchesStudentIdFilter, matchesYearFilter } from '../../../common/utils/student-id-range.util';

export interface Viewer {
  /** มีเมื่อล็อกอินแล้ว — ใช้ระบุเจ้าของงานที่ปิดการเผยแพร่ (ดู canViewerSeeEvent) */
  id?: number;
  role: string;
  studentId?: string | null;
  program?: string | null;
}

/** สถานะการเผยแพร่ของงาน — query ที่ส่งงานเข้า canViewerSeeEvent ต้อง select ทั้งสองฟิลด์นี้มาด้วย */
export interface PublishStateEvent {
  isPublic?: boolean;
  organizerId?: number;
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
    if (
      !matchesYearFilter(
        viewer?.studentId,
        event.visibilityYears.map((y) => y.year),
      )
    ) {
      return false;
    }
  }

  if (event.visibilityStudentIdFilter && !matchesStudentIdFilter(viewer?.studentId, event.visibilityStudentIdFilter)) {
    return false;
  }

  return true;
}

/**
 * เช็คสิทธิ์เห็นงานบนเส้นทางสาธารณะ (รายการ/รายละเอียด/ลงทะเบียน) = กติกาการเผยแพร่ + กติกา restricted
 *
 * งานที่ไม่เผยแพร่ (isPublic=false — เมนู "ปิดการใช้งานกิจกรรมถาวร" และสำเนาที่ duplicate มาซึ่งยังไม่เผยแพร่)
 * เห็นได้เฉพาะเจ้าของงาน (ดูตัวอย่าง / หน้าหลักผู้จัด) และแอดมิน — เดิมเช็คแค่ restricted งานที่ปิดแล้วจึงยังแสดง
 * ให้นักศึกษาเห็นและลงทะเบียนได้ตามปกติ
 *
 * fail-closed: งานที่ไม่ได้ส่ง isPublic มา (query ลืม select) ถือว่าไม่เผยแพร่ — พลาดแล้วเห็นเป็นบั๊กชัดๆ ดีกว่ารั่วเงียบๆ
 * กิจกรรมเดี่ยว (event เป็น null) ไม่มีแนวคิดการเผยแพร่ระดับงาน จึงผ่านเสมอ
 */
export function canViewerSeeEvent(
  viewer: Viewer | null | undefined,
  event: (VisibilityCheckEvent & PublishStateEvent) | null | undefined,
): boolean {
  if (event && event.isPublic !== true) {
    const isOwner = viewer?.id !== undefined && viewer.id === event.organizerId;
    if (viewer?.role !== 'admin' && !isOwner) return false;
  }
  return isViewerEligibleForEvent(viewer, event);
}

/** กรองรายการกิจกรรมให้เหลือเฉพาะที่ viewer มีสิทธิ์เห็น — ใช้กับรายการกิจกรรมสาธารณะ */
export function filterVisibleActivities<
  T extends { event: (VisibilityCheckEvent & PublishStateEvent) | null },
>(activities: T[], viewer: Viewer | null): T[] {
  return activities.filter((a) => canViewerSeeEvent(viewer, a.event));
}
