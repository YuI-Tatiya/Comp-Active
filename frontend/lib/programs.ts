// ⚠️ ไฟล์นี้ต้องตรงกับ backend/src/common/constants/programs.ts เสมอ
//    ถ้าเพิ่ม/แก้สาขา ต้องแก้ทั้งสองไฟล์

export type EducationLevelCode = "bachelor" | "master" | "doctorate"

export interface ProgramMeta {
    code: string
    label: string
    level: EducationLevelCode
}

export const EDUCATION_LEVELS: { code: EducationLevelCode; label: string }[] = [
    { code: "bachelor", label: "ปริญญาตรี" },
    { code: "master", label: "ปริญญาโท" },
    { code: "doctorate", label: "ปริญญาเอก" },
]

export const PROGRAMS: ProgramMeta[] = [
    // ── ปริญญาตรี ──
    { code: "cs", level: "bachelor", label: "วิทยาการคอมพิวเตอร์" },
    { code: "it", level: "bachelor", label: "เทคโนโลยีสารสนเทศและนวัตกรรมอัจฉริยะ" },
    { code: "geo", level: "bachelor", label: "ภูมิสารสนเทศศาสตร์" },
    { code: "ai", level: "bachelor", label: "ปัญญาประดิษฐ์" },
    { code: "cyber", level: "bachelor", label: "ความมั่นคงปลอดภัยไซเบอร์" },

    // ── ปริญญาโท ──
    { code: "m_cs_it", level: "master", label: "วิทยาการคอมพิวเตอร์และเทคโนโลยีสารสนเทศ" },
    { code: "m_ds_ai", level: "master", label: "วิทยาการข้อมูลและปัญญาประดิษฐ์ (หลักสูตรนานาชาติ)" },
    { code: "m_geo", level: "master", label: "ภูมิสารสนเทศศาสตร์" },

    // ── ปริญญาเอก ──
    {
        code: "d_cs_it",
        level: "doctorate",
        label: "ปร.ด. วิทยาการคอมพิวเตอร์และเทคโนโลยีสารสนเทศ (หลักสูตรนานาชาติ)",
    },
    { code: "d_geo", level: "doctorate", label: "ภูมิสารสนเทศศาสตร์" },
]

/** `plan` = จำนวนปีตามแผนการเรียน · `max` = ปีสูงสุดที่เลือกได้ (รองรับคนเรียนเกินแผน) */
export const YEAR_RANGE: Record<EducationLevelCode, { plan: number; max: number }> = {
    bachelor: { plan: 4, max: 8 },
    master: { plan: 2, max: 5 },
    doctorate: { plan: 4, max: 8 },
}

export function getProgramsByLevel(level?: string): ProgramMeta[] {
    if (!level) return []
    return PROGRAMS.filter((p) => p.level === level)
}

export function programLabel(code?: string | null): string {
    if (!code) return ""
    return PROGRAMS.find((p) => p.code === code)?.label ?? code
}

export function educationLevelLabel(code?: string | null): string {
    if (!code) return ""
    return EDUCATION_LEVELS.find((l) => l.code === code)?.label ?? code
}

/** แยกชั้นปีเป็น 2 กลุ่ม: ตามแผน / เกินแผน — ใช้กับ <optgroup> */
export function getYearOptions(level?: string): { plan: number[]; extended: number[] } {
    if (!level || !(level in YEAR_RANGE)) return { plan: [], extended: [] }
    const { plan, max } = YEAR_RANGE[level as EducationLevelCode]
    return {
        plan: Array.from({ length: plan }, (_, i) => i + 1),
        extended: Array.from({ length: max - plan }, (_, i) => plan + i + 1),
    }
}
