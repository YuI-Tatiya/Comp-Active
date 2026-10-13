/**
 * ตัวเลือกกะสำหรับกิจกรรมประเภทสตาฟฟ์/จิตอาสา — ฝั่ง wizard ให้กรอกเป็นแถว (ชื่อกะ + เวลาเริ่ม/สิ้นสุด)
 * แต่ backend เก็บ Activity.dutyShiftOptions เป็น string[] บรรทัดเดียวต่อกะ (ไม่มีสคีมาแยกฟิลด์เวลา)
 * ไฟล์นี้แปลงไปกลับระหว่างสองรูปแบบ ให้แถวที่กรอกไว้ตอนสร้างงานพาร์สกลับมาแก้ไขได้ตอนแก้ไขงาน
 *
 * ไฟล์ล้วน (ไม่แตะ React) — มีเทสต์ใน duty-shift.test.ts (npm test)
 */

export interface DutyShiftRow {
    /** key ฝั่ง client ล้วนๆ สำหรับ React list — ไม่ส่งไป backend */
    id: string
    label: string
    /** <input type="time"> value เช่น "08:00" */
    startTime: string
    endTime: string
}

export type DutyShiftMode = "single" | "shifts"

let shiftRowSeq = 0

export function createEmptyShiftRow(): DutyShiftRow {
    shiftRowSeq += 1
    return { id: `shift-${Date.now()}-${shiftRowSeq}`, label: "", startTime: "", endTime: "" }
}

// รูปแบบที่แสดงให้นักศึกษาเห็นตรงๆ ตอนเลือกกะในหน้าลงทะเบียน จึงต้องอ่านง่าย ไม่ใช่แค่ค่า config ภายใน
const SHIFT_PATTERN = /^(.+) \((\d{2}:\d{2})-(\d{2}:\d{2})\)$/

export function formatDutyShift(row: Pick<DutyShiftRow, "label" | "startTime" | "endTime">): string {
    return `${row.label.trim()} (${row.startTime}-${row.endTime})`
}

/**
 * โหมด "single" (ตลอดทั้งกิจกรรม ไม่แบ่งกะ) ส่งอาเรย์ว่างเสมอ — ตรงกับที่ RegistrationsService อ่าน
 * `dutyShiftOptions.length === 0` แปลว่ากิจกรรมนี้ไม่ต้องให้นักศึกษาเลือกกะ (ดู registrations.service.ts)
 * แถวที่กรอกไม่ครบ (ชื่อ/เวลาใดว่าง) ถูกตัดทิ้งเงียบๆ — validation.ts บังคับกรอกให้ครบก่อนหน้านี้แล้ว
 */
export function buildDutyShiftOptions(mode: DutyShiftMode, rows: DutyShiftRow[]): string[] {
    if (mode !== "shifts") return []
    return rows.filter((r) => r.label.trim() && r.startTime && r.endTime).map(formatDutyShift)
}

/**
 * ทางกลับของ buildDutyShiftOptions — ใช้ตอนโหลดกิจกรรมเดิมมาแก้ไข
 * ข้อความที่พาร์สรูปแบบไม่ได้ (เช่นข้อมูลเก่าก่อนมีโครงสร้างนี้) ยังกลับมาเป็นแถวได้ แค่ช่องเวลาว่างให้กรอกใหม่
 */
export function parseDutyShiftOptions(options: string[]): { mode: DutyShiftMode; rows: DutyShiftRow[] } {
    if (options.length === 0) return { mode: "single", rows: [] }
    const rows = options.map((opt, i) => {
        const m = SHIFT_PATTERN.exec(opt)
        return m
            ? { id: `shift-${i}`, label: m[1], startTime: m[2], endTime: m[3] }
            : { id: `shift-${i}`, label: opt, startTime: "", endTime: "" }
    })
    return { mode: "shifts", rows }
}

/** บทบาท/หน้าที่ที่แสดงบนใบรับรองจิตอาสา — อ้างอิงจากตัวเลือกบทบาท/หน้าที่ที่ตั้งไว้ (ไม่ให้กรอกซ้ำ) */
export function deriveVolunteerRole(dutyRoleOptions: string[]): string {
    return dutyRoleOptions.map((s) => s.trim()).filter(Boolean).join(" / ")
}

/**
 * ตัวเลือกบทบาท/หน้าที่ที่จะส่งไป backend — โหมด "1 บทบาทต่อแท็บ" (isNewRoleMode ใน activity-tab-form.tsx)
 * ไม่มีช่องกรอกรายการนี้แล้ว (ถูกแทนด้วยสถานที่) แต่ backend ยังต้องมีอย่างน้อย 1 รายการเสมอสำหรับกิจกรรม
 * staff_volunteer (ใช้เป็นตัวเลือกตอนนักศึกษาลงทะเบียน) — ใช้ชื่อกิจกรรม (= ชื่อบทบาทนั้นเอง) เป็นตัวเลือกเดียวแทน
 * กิจกรรมเดิม (โหมดกิจกรรมเดี่ยว) ที่ยังกรอกผ่านช่องเดิมอยู่ ใช้ค่าที่กรอกไว้ตามปกติ ไม่เปลี่ยนพฤติกรรม
 */
export function resolveDutyRoleOptions(dutyRoleOptions: string[], activityName: string): string[] {
    const explicit = dutyRoleOptions.map((s) => s.trim()).filter(Boolean)
    if (explicit.length > 0) return explicit
    return activityName.trim() ? [activityName.trim()] : []
}
