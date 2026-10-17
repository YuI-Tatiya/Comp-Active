// ความคืบหน้าของขั้นที่เปิดอยู่ในวิซาร์ดสร้าง/แก้ไขงาน — แถบในแถบหัวหน้า ("basics 2/5") และข้อความของมาสคอต
// เป็นไฟล์ล้วน (ไม่แตะ React/DOM) และ import ไฟล์อื่นด้วยนามสกุล .ts เพื่อทดสอบด้วย `npm test` (node --test) ได้
// "เสร็จ" ของแต่ละช่องใช้กติกาเดียวกับ validation.ts เสมอ — แถบเต็มก็ต่อเมื่อกด "ถัดไป" แล้วผ่านจริง ไม่ใช่นับแค่ช่องที่ไม่ว่าง
import type { ActivityFormState, EventFormState } from "./types"
import { validateActivityFields, validateEventField } from "./validation.ts"

/** ชื่อสั้นแบบโค้ดของแต่ละขั้น ใช้ในแถบความคืบหน้าและหัวการ์ด (// step_01 · event.basics) */
export const STEP_SLUGS = ["basics", "activities", "survey", "publish"] as const

export interface StepProgress {
    slug: string
    done: number
    total: number
    /** ช่อง/รายการที่ยังต้องทำก่อนไปต่อได้ — 0 = ไปต่อได้แล้ว (ช่องไม่บังคับไม่นับ) */
    remaining: number
}

export function stepSlug(step: number): string {
    return STEP_SLUGS[step - 1] ?? STEP_SLUGS[0]
}

export function stepProgress(step: number, event: EventFormState, activities: ActivityFormState[]): StepProgress {
    const slug = stepSlug(step)

    if (step === 1) {
        // ประเภทงาน/ประเภทการรับสมัครมีค่าเริ่มต้นเสมอ จึงนับว่าเสร็จตั้งแต่เปิดหน้า — รูปปกไม่บังคับ แต่นับเป็นช่องหนึ่ง
        const required = [!validateEventField(event, "name"), !validateEventField(event, "description")]
        const filled = [true, true, ...required, event.imagePreview !== null]
        return {
            slug,
            done: filled.filter(Boolean).length,
            total: filled.length,
            remaining: required.filter((ok) => !ok).length,
        }
    }

    if (step === 2) {
        const isMultiActivity = event.type !== "single"
        const done = activities.filter((a) => Object.keys(validateActivityFields(a, isMultiActivity)).length === 0).length
        return { slug, done, total: activities.length, remaining: activities.length - done }
    }

    if (step === 3) {
        // แบบสำรวจไม่บังคับ — ไม่มีอะไรค้าง นับเฉพาะคำถามที่ตั้งชื่อแล้ว
        const done = event.surveyQuestions.filter((q) => q.label.trim()).length
        return { slug, done, total: event.surveyQuestions.length, remaining: 0 }
    }

    // ขั้นสุดท้าย: ทุกส่วนที่จะทำให้กดสร้าง/บันทึกไม่ผ่าน
    const isMultiActivity = event.type !== "single"
    const checks = [
        !validateEventField(event, "name") && !validateEventField(event, "description"),
        activities.length > 0 && activities.every((a) => Object.keys(validateActivityFields(a, isMultiActivity)).length === 0),
        !validateEventField(event, "registrationCloseAt"),
    ]
    const done = checks.filter(Boolean).length
    return { slug, done, total: checks.length, remaining: checks.length - done }
}

/** คำพูดของมาสคอตในแถบหัวหน้า — บอกว่าเหลืออะไรก่อนไปขั้นต่อไป */
export function mascotMessage(step: number, progress: StepProgress): string {
    const { remaining } = progress
    switch (step) {
        case 1:
            return remaining > 0 ? `กรอกอีก ${remaining} ช่อง ก็ไปขั้นต่อไปได้!` : "ข้อมูลพื้นฐานครบแล้ว ไปต่อกันเลย!"
        case 2:
            return remaining > 0 ? `เหลืออีก ${remaining} กิจกรรมที่ยังกรอกไม่ครบ` : "กิจกรรมย่อยครบแล้ว ไปต่อได้!"
        case 3:
            return "แบบสำรวจไม่บังคับ แก้หรือข้ามไปก็ได้"
        default:
            return remaining > 0 ? `ยังมีอีก ${remaining} ส่วนที่ต้องแก้ก่อนบันทึก` : "ทุกอย่างพร้อมแล้ว!"
    }
}
