import type { EventFormState, ActivityFormState, EventFormErrors, ActivityFormErrors } from "./types"

export function validateEventField(event: EventFormState, field: keyof EventFormErrors): string | undefined {
    switch (field) {
        case "name":
            return event.name.trim() ? undefined : "กรุณากรอกชื่องาน"
        case "description":
            return event.description.trim() ? undefined : "กรุณากรอกรายละเอียดงาน"
        case "registrationCloseAt": {
            // เช็คเฉพาะตอนตั้งไว้ทั้งสองวัน — ไม่บังคับให้ต้องตั้งวันใดเลย (ทั้งคู่เป็น "ถ้ามี")
            if (!event.registrationOpenAt || !event.registrationCloseAt) return undefined
            return new Date(event.registrationCloseAt) > new Date(event.registrationOpenAt)
                ? undefined
                : "วันปิดรับสมัครต้องอยู่หลังวันเปิดรับสมัคร"
        }
    }
}

export function validateEventFields(event: EventFormState): EventFormErrors {
    const errors: EventFormErrors = {}
    const nameErr = validateEventField(event, "name")
    if (nameErr) errors.name = nameErr
    const descErr = validateEventField(event, "description")
    if (descErr) errors.description = descErr
    const closeErr = validateEventField(event, "registrationCloseAt")
    if (closeErr) errors.registrationCloseAt = closeErr
    return errors
}

/**
 * isMultiActivity: งานประเภท "หลายกิจกรรมย่อย" (event.type !== "single") — เฉพาะตอนนั้นที่กิจกรรมสตาฟฟ์/จิตอาสา
 * ใช้โหมดกรอกแบบ "1 บทบาทต่อแท็บ" (วันที่+เวลาปฏิบัติหน้าที่แทนวันเวลาเริ่ม/สิ้นสุดตรงๆ, สถานที่แทนตัวเลือกบทบาท/หน้าที่
 * หลายรายการ) ดู activity-tab-form.tsx — โหมด "กิจกรรมเดี่ยว" ยังใช้ฟอร์มเดิมเป๊ะ เพราะอาจเป็นภารกิจยาวหลายวันได้
 */
export function validateActivityField(
    a: ActivityFormState,
    field: keyof ActivityFormErrors,
    isMultiActivity: boolean
): string | undefined {
    const isNewRoleMode = a.registrationType === "staff_volunteer" && isMultiActivity
    switch (field) {
        case "name":
            return a.name.trim() ? undefined : "กรุณากรอกชื่อกิจกรรม"
        case "categories":
            return a.categories.length > 0 ? undefined : "กรุณาเลือกหมวดหมู่อย่างน้อย 1 หมวด"
        case "description":
            return a.description.trim() ? undefined : "กรุณากรอกรายละเอียด"
        case "startAt":
            return a.startAt ? undefined : "กรุณาระบุวันเวลาเริ่ม"
        case "endAt":
            if (!a.endAt) return "กรุณาระบุวันเวลาสิ้นสุด"
            if (a.startAt && new Date(a.endAt) <= new Date(a.startAt)) return "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม"
            return undefined
        case "location":
            return a.location.trim() ? undefined : "กรุณากรอกสถานที่"
        case "capacity":
            if (!a.capacityEnabled) return undefined
            return !a.capacity || parseInt(a.capacity) < 1 ? "กรุณาระบุจำนวนที่รับ" : undefined
        case "dutyRoleOptions":
            // โหมดบทบาทต่อแท็บไม่เก็บฟิลด์นี้แล้ว (ช่องกรอกถูกแทนด้วยสถานที่) — บังคับกรอกเฉพาะฟอร์มเดิม (โหมดกิจกรรมเดี่ยว)
            if (a.registrationType !== "staff_volunteer" || isNewRoleMode) return undefined
            return a.dutyRoleOptions.some((s) => s.trim())
                ? undefined
                : "กรุณาระบุตัวเลือกบทบาท/หน้าที่อย่างน้อย 1 รายการ"
        case "dutyDate":
            if (!isNewRoleMode) return undefined
            return a.dutyDate ? undefined : "กรุณาระบุวันที่ปฏิบัติหน้าที่"
        case "dutyShiftRows":
            if (a.registrationType !== "staff_volunteer" || a.dutyShiftMode !== "shifts") return undefined
            if (a.dutyShiftRows.length === 0) return "กรุณาเพิ่มอย่างน้อย 1 กะ"
            for (const r of a.dutyShiftRows) {
                if (!r.label.trim()) return "กรุณาระบุชื่อกะให้ครบทุกแถว"
                if (!r.startTime || !r.endTime) return "กรุณาระบุเวลาเริ่ม-สิ้นสุดให้ครบทุกแถว"
                if (r.endTime <= r.startTime) return "เวลาสิ้นสุดของแต่ละกะต้องอยู่หลังเวลาเริ่ม"
            }
            return undefined
        case "teamSizeMax":
            if (a.registrationType !== "contestant") return undefined
            if (!a.teamSizeMin || !a.teamSizeMax) return undefined
            return parseInt(a.teamSizeMin) > parseInt(a.teamSizeMax)
                ? "จำนวนสมาชิกทีมขั้นต่ำต้องไม่มากกว่าขั้นสูงสุด"
                : undefined
    }
}

export const ACTIVITY_FIELDS: (keyof ActivityFormErrors)[] = [
    "name", "categories", "description", "startAt", "endAt", "location", "capacity",
    "dutyRoleOptions", "dutyDate", "dutyShiftRows", "teamSizeMax",
]

export function validateActivityFields(a: ActivityFormState, isMultiActivity: boolean): ActivityFormErrors {
    const errors: ActivityFormErrors = {}
    for (const field of ACTIVITY_FIELDS) {
        const message = validateActivityField(a, field, isMultiActivity)
        if (message) errors[field] = message
    }
    return errors
}

export function validateAllActivities(activities: ActivityFormState[], isMultiActivity: boolean): Record<string, ActivityFormErrors> {
    const map: Record<string, ActivityFormErrors> = {}
    for (const a of activities) {
        const errs = validateActivityFields(a, isMultiActivity)
        if (Object.keys(errs).length > 0) map[a.key] = errs
    }
    return map
}

export function countErrors(errors: Record<string, string | undefined>): number {
    return Object.values(errors).filter(Boolean).length
}
