import type { BuilderQuestion } from "@/components/ui/dynamic-question-builder"
import type { DutyShiftMode, DutyShiftRow } from "@/lib/duty-shift"

// State ฝั่ง frontend สำหรับ wizard สร้างงาน — แปลงเป็น CreateEventBody ตอน submit เท่านั้น
// (capacityEnabled / certEnabled / softSkillsEnabled / questionsEnabled เป็น concept ฝั่ง UI ล้วนๆ ไม่มีใน backend DTO)

export interface EventFormState {
    name: string
    description: string
    imageFile: File | null
    imagePreview: string | null
    isPublic: boolean
    // <input type="datetime-local"> value — ว่าง = ไม่กำหนดวันปิดรับสมัคร
    registrationCloseAt: string
    surveyQuestions: BuilderQuestion[]
    visibility: "everyone" | "restricted"
    /** รหัสสาขาที่มีสิทธิ์เห็น — ใช้เมื่อ visibility เป็น restricted, ว่าง = ทุกสาขา */
    visibilityPrograms: string[]
    /** ชั้นปีที่มีสิทธิ์เห็น (1-8) — ใช้เมื่อ visibility เป็น restricted, ว่าง = ทุกชั้นปี */
    visibilityYears: number[]
    visibilityStudentIdFilter: string
    /** client-only — ไม่ส่งไป backend, ใช้ขับ UI ของ step 2 เท่านั้น (backend สร้าง Event+Activities เสมอไม่ว่าค่านี้จะเป็นอะไร) */
    type: "single" | "project"
}

export interface ActivityFormState {
    /** key ฝั่ง client ล้วนๆ สำหรับ React list/tab — ไม่ส่งไป backend */
    key: string
    name: string
    description: string
    categories: string[]
    imageFile: File | null
    imagePreview: string | null
    attachmentFile: File | null
    attachmentName: string | null
    // <input type="datetime-local"> value
    startAt: string
    endAt: string
    location: string
    capacityEnabled: boolean
    capacity: string
    /** มีความหมายเฉพาะเมื่อ registrationType เป็น staff_volunteer — บทบาทบนใบรับรองอ้างอิงจาก dutyRoleOptions โดยตรง ไม่ใช่ฟิลด์แยก (ดู deriveVolunteerRole) */
    certEnabled: boolean
    softSkillsEnabled: boolean
    /** skillType -> rate (0-5) — มีเฉพาะทักษะที่ติ๊กเลือก */
    softSkillRates: Record<string, number>
    questionsEnabled: boolean
    questions: BuilderQuestion[]
    registrationType: "participant" | "staff_volunteer" | "contestant"
    /** บรรทัดละ 1 ตัวเลือก — ใช้เมื่อ registrationType เป็น staff_volunteer */
    dutyRoleOptions: string[]
    /** "single" = ตลอดทั้งกิจกรรม (ไม่แบ่งกะ, ส่ง dutyShiftOptions เป็น [] ตอน submit), "shifts" = แบ่งเป็นกะตาม dutyShiftRows */
    dutyShiftMode: DutyShiftMode
    dutyShiftRows: DutyShiftRow[]
    /** เก็บเป็น string เหมือน capacity — parseInt ตอน submit */
    teamSizeMin: string
    teamSizeMax: string
    /** บรรทัดละ 1 ตัวเลือก — ใช้เมื่อ registrationType เป็น contestant */
    competitionCategoryOptions: string[]
}

export function createEmptyEvent(): EventFormState {
    return {
        name: "",
        description: "",
        imageFile: null,
        imagePreview: null,
        isPublic: true,
        registrationCloseAt: "",
        // ค่าเริ่มต้นของแบบสำรวจ — แก้ไข/ลบ/เพิ่มได้ทั้งหมดในขั้นตอนที่ 3
        surveyQuestions: [
            { label: "กิจกรรมนี้เป็นประโยชน์ต่อคุณมากน้อยเพียงใด?", type: "rating", scaleMax: 5 },
            { label: "คุณพึงพอใจกับการจัดงานในภาพรวมมากน้อยเพียงใด?", type: "rating", scaleMax: 5 },
            { label: "ข้อเสนอแนะเพิ่มเติม (ถ้ามี)", type: "text" },
        ],
        visibility: "everyone",
        visibilityPrograms: [],
        visibilityYears: [],
        visibilityStudentIdFilter: "",
        type: "project",
    }
}

let activityKeySeq = 0

export function createEmptyActivity(): ActivityFormState {
    activityKeySeq += 1
    return {
        key: `activity-${Date.now()}-${activityKeySeq}`,
        name: "",
        description: "",
        categories: [],
        imageFile: null,
        imagePreview: null,
        attachmentFile: null,
        attachmentName: null,
        startAt: "",
        endAt: "",
        location: "",
        capacityEnabled: false,
        capacity: "",
        certEnabled: false,
        softSkillsEnabled: false,
        softSkillRates: {},
        questionsEnabled: false,
        questions: [],
        registrationType: "participant",
        dutyRoleOptions: [],
        dutyShiftMode: "single",
        dutyShiftRows: [],
        teamSizeMin: "",
        teamSizeMax: "",
        competitionCategoryOptions: [],
    }
}

export type EventFormErrors = Partial<Record<"name" | "description", string>>

export type ActivityFormErrors = Partial<Record<
    "name" | "categories" | "description" | "startAt" | "endAt" | "location" | "capacity"
    | "dutyRoleOptions" | "dutyShiftRows" | "teamSizeMax",
    string
>>
