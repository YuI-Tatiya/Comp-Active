/**
 * รายการหลักสูตรของวิทยาลัยการคอมพิวเตอร์ — แหล่งความจริงหลักของทั้งระบบ
 *
 * ⚠️ ถ้าเพิ่ม/แก้สาขา ต้องแก้ frontend/lib/programs.ts ให้ตรงกันด้วย
 *
 * เก็บ `code` ลง DB ไม่เก็บชื่อไทย เพราะชื่อสาขาซ้ำข้ามระดับ
 * (เช่น "ภูมิสารสนเทศศาสตร์" มีทั้ง ป.ตรี / ป.โท / ป.เอก)
 */

export type EducationLevelCode = "bachelor" | "master" | "doctorate";

export interface ProgramMeta {
  code: string;
  label: string;
  level: EducationLevelCode;
}

export const EDUCATION_LEVELS: { code: EducationLevelCode; label: string }[] = [
  { code: "bachelor", label: "ปริญญาตรี" },
  { code: "master", label: "ปริญญาโท" },
  { code: "doctorate", label: "ปริญญาเอก" },
];

export const PROGRAMS: ProgramMeta[] = [
  // ── ปริญญาตรี ──────────────────────────────────────────────────────────────
  { code: "cs", level: "bachelor", label: "วิทยาการคอมพิวเตอร์" },
  {
    code: "it",
    level: "bachelor",
    label: "เทคโนโลยีสารสนเทศและนวัตกรรมอัจฉริยะ",
  },
  { code: "geo", level: "bachelor", label: "ภูมิสารสนเทศศาสตร์" },
  { code: "ai", level: "bachelor", label: "ปัญญาประดิษฐ์" },
  { code: "cyber", level: "bachelor", label: "ความมั่นคงปลอดภัยไซเบอร์" },

  // ── ปริญญาโท ──────────────────────────────────────────────────────────────
  {
    code: "m_cs_it",
    level: "master",
    label: "วิทยาการคอมพิวเตอร์และเทคโนโลยีสารสนเทศ",
  },
  {
    code: "m_ds_ai",
    level: "master",
    label: "วิทยาการข้อมูลและปัญญาประดิษฐ์ (หลักสูตรนานาชาติ)",
  },
  { code: "m_geo", level: "master", label: "ภูมิสารสนเทศศาสตร์" },

  // ── ปริญญาเอก ─────────────────────────────────────────────────────────────
  {
    code: "d_cs_it",
    level: "doctorate",
    label: "วิทยาการคอมพิวเตอร์และเทคโนโลยีสารสนเทศ (หลักสูตรนานาชาติ)",
  },
  { code: "d_geo", level: "doctorate", label: "ภูมิสารสนเทศศาสตร์" },
];

export const PROGRAM_CODES: string[] = PROGRAMS.map((p) => p.code);

export function getProgramsByLevel(level: EducationLevelCode): ProgramMeta[] {
  return PROGRAMS.filter((p) => p.level === level);
}

export function isProgramInLevel(
  code: string,
  level: EducationLevelCode,
): boolean {
  return PROGRAMS.some((p) => p.code === code && p.level === level);
}
