import type { BuilderQuestion } from "@/components/ui/dynamic-question-builder"
import type { DutyShiftMode, DutyShiftRow } from "@/lib/duty-shift"

// State ฝั่ง frontend สำหรับ wizard สร้างงาน — แปลงเป็น CreateEventBody ตอน submit เท่านั้น
// (capacityEnabled / certEnabled / softSkillsEnabled / questionsEnabled เป็น concept ฝั่ง UI ล้วนๆ ไม่มีใน backend DTO)

export type RegistrationType = "participant" | "staff_volunteer" | "contestant"

/** ตัวเลือกประเภทการรับสมัคร — เลือกครั้งเดียวระดับงาน (ขั้นตอนที่ 1) แล้วทุกกิจกรรมย่อยในงานนี้ใช้ประเภทเดียวกัน
 *  กันไม่ให้งานเดียวมีกิจกรรมย่อยปนกันหลายรูปแบบ (เช่น กิจกรรมหนึ่งเป็นจิตอาสา อีกกิจกรรมเป็นแข่งขัน) */
export const REGISTRATION_TYPE_OPTIONS: { value: RegistrationType; label: string; desc: string }[] = [
    { value: "participant", label: "ผู้เข้าร่วมทั่วไป", desc: "ลงทะเบียนเข้าร่วมกิจกรรมตามปกติ" },
    { value: "staff_volunteer", label: "ผู้สมัครจิตอาสา/สตาฟฟ์", desc: "สมัครเพื่อช่วยงานหรือปฏิบัติหน้าที่ในกิจกรรม" },
    { value: "contestant", label: "ผู้สมัครแข่งขัน", desc: "สมัครเพื่อเข้าแข่งขันในกิจกรรม" },
]

export interface EventFormState {
    name: string
    description: string
    imageFile: File | null
    imagePreview: string | null
    isPublic: boolean
    // <input type="datetime-local"> value — ว่าง = ไม่กำหนดวันเปิดรับสมัคร (เปิดทันทีที่เผยแพร่)
    registrationOpenAt: string
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
    /**
     * client-only — เลือกที่งาน (ขั้นตอนที่ 1) แล้ว "สำเนา" ลง ActivityFormState.registrationType ของทุกกิจกรรมย่อยตอนเพิ่ม/เปลี่ยนค่านี้
     * (บังคับใช้ที่หน้า create/edit page.tsx — ดู handleAddActivity และ patchEvent) ไม่มีฟิลด์นี้ตรงๆ ใน backend
     */
    registrationType: RegistrationType
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
    /** URL ไฟล์แนบที่อัปโหลดไปแล้ว (ถ้ามี) — ใช้ส่งซ้ำตอน submit เมื่อไม่ได้เลือกไฟล์ใหม่ (แก้ไขงานเดิม/ฉบับร่างที่อัปโหลดไว้ก่อนหน้า) */
    attachmentUrl: string | null
    // <input type="datetime-local"> value — กิจกรรมทั่วไป/แข่งขันกรอกตรงๆ; สตาฟฟ์/จิตอาสาในโหมดหลายบทบาท (isMultiActivity)
    // คำนวณจาก dutyDate + เวลาปฏิบัติหน้าที่ (dutyShiftMode/dutyShiftRows) แทน ดู deriveDutyDateTimes ใน activity-tab-form.tsx
    startAt: string
    endAt: string
    /** เฉพาะสตาฟฟ์/จิตอาสาโหมดหลายบทบาท — วันที่ปฏิบัติหน้าที่ (<input type="date"> value) ใช้ร่วมกับ dutyShiftMode/dutyShiftRows คำนวณ startAt/endAt */
    dutyDate: string
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
    /** เสมอกับ EventFormState.registrationType ของงานแม่ — แก้ไขได้ที่ขั้นตอนที่ 1 เท่านั้น (ดูเหตุผลที่ EventFormState) */
    registrationType: RegistrationType
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
        registrationOpenAt: "",
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
        registrationType: "participant",
    }
}

let activityKeySeq = 0

/** registrationType: ส่งมาจาก EventFormState.registrationType ของงานแม่เสมอ (ไม่ระบุ = "participant" ค่าเริ่มต้นของงานใหม่) */
export function createEmptyActivity(registrationType: RegistrationType = "participant"): ActivityFormState {
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
        attachmentUrl: null,
        startAt: "",
        endAt: "",
        dutyDate: "",
        location: "",
        capacityEnabled: false,
        capacity: "",
        certEnabled: false,
        softSkillsEnabled: false,
        softSkillRates: {},
        questionsEnabled: false,
        questions: [],
        registrationType,
        dutyRoleOptions: [],
        dutyShiftMode: "single",
        dutyShiftRows: [],
        teamSizeMin: "",
        teamSizeMax: "",
        competitionCategoryOptions: [],
    }
}

/**
 * คัดลอกกิจกรรมหนึ่งเป็นกิจกรรมใหม่ในฟอร์ม (ยังไม่ส่งไป backend) — ใช้ตอนกด "ทำซ้ำกิจกรรมเดิม" ที่แท็บ
 * key ใหม่เสมอ (ใช้ตัวนับเดียวกับ createEmptyActivity กันชนกัน) และคัดลอกทีละฟิลด์ตรงๆ (ไม่ spread ทั้งก้อน)
 * เพื่อไม่ให้ activityId ของกิจกรรมเดิม (หน้าแก้ไขงาน ขยาย ActivityFormState เพิ่มฟิลด์นี้) หลุดติดมาด้วย —
 * สำเนาต้องเป็นกิจกรรม "ใหม่" ที่ยังไม่มีอยู่จริงใน DB เสมอ ต่อให้คัดลอกจากกิจกรรมที่มี activityId อยู่แล้วก็ตาม
 * อาเรย์/ออบเจ็กต์คัดลอกเป็นชุดใหม่ (ไม่ใช้ reference เดิม) กันแก้ไขสำเนาแล้วกระทบต้นฉบับโดยไม่ตั้งใจ —
 * ส่วน imageFile/attachmentFile (เป็น File ของเบราว์เซอร์) ใช้ reference เดิมได้ปลอดภัย เพราะ File ไม่ถูกแก้ไขซ้ำ
 */
export function duplicateActivity(source: ActivityFormState): ActivityFormState {
    activityKeySeq += 1
    return {
        key: `activity-${Date.now()}-${activityKeySeq}`,
        name: source.name,
        description: source.description,
        categories: [...source.categories],
        imageFile: source.imageFile,
        imagePreview: source.imagePreview,
        attachmentFile: source.attachmentFile,
        attachmentName: source.attachmentName,
        attachmentUrl: source.attachmentUrl,
        startAt: source.startAt,
        endAt: source.endAt,
        dutyDate: source.dutyDate,
        location: source.location,
        capacityEnabled: source.capacityEnabled,
        capacity: source.capacity,
        certEnabled: source.certEnabled,
        softSkillsEnabled: source.softSkillsEnabled,
        softSkillRates: { ...source.softSkillRates },
        questionsEnabled: source.questionsEnabled,
        questions: source.questions.map((q) => ({ ...q, options: q.options ? [...q.options] : q.options })),
        registrationType: source.registrationType,
        dutyRoleOptions: [...source.dutyRoleOptions],
        dutyShiftMode: source.dutyShiftMode,
        dutyShiftRows: source.dutyShiftRows.map((r) => ({ ...r })),
        teamSizeMin: source.teamSizeMin,
        teamSizeMax: source.teamSizeMax,
        competitionCategoryOptions: [...source.competitionCategoryOptions],
    }
}

export type EventFormErrors = Partial<Record<"name" | "description" | "registrationCloseAt", string>>

export type ActivityFormErrors = Partial<Record<
    "name" | "categories" | "description" | "startAt" | "endAt" | "location" | "capacity"
    | "dutyRoleOptions" | "dutyDate" | "dutyShiftRows" | "teamSizeMax",
    string
>>
