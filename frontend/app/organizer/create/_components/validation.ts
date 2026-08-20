import type { EventFormState, ActivityFormState, EventFormErrors, ActivityFormErrors } from "./types"

export function validateEventField(event: EventFormState, field: keyof EventFormErrors): string | undefined {
    switch (field) {
        case "name":
            return event.name.trim() ? undefined : "กรุณากรอกชื่องาน"
        case "description":
            return event.description.trim() ? undefined : "กรุณากรอกรายละเอียดงาน"
    }
}

export function validateEventFields(event: EventFormState): EventFormErrors {
    const errors: EventFormErrors = {}
    const nameErr = validateEventField(event, "name")
    if (nameErr) errors.name = nameErr
    const descErr = validateEventField(event, "description")
    if (descErr) errors.description = descErr
    return errors
}

export function validateActivityField(a: ActivityFormState, field: keyof ActivityFormErrors): string | undefined {
    switch (field) {
        case "name":
            return a.name.trim() ? undefined : "กรุณากรอกชื่อกิจกรรม"
        case "category":
            return a.category ? undefined : "กรุณาเลือกหมวดหมู่"
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
        case "volunteerRole":
            if (!a.certEnabled) return undefined
            return a.volunteerRole.trim() ? undefined : "กรุณาระบุชื่อบทบาทสำหรับใบจิตอาสา"
    }
}

export const ACTIVITY_FIELDS: (keyof ActivityFormErrors)[] = [
    "name", "category", "description", "startAt", "endAt", "location", "capacity", "volunteerRole",
]

export function validateActivityFields(a: ActivityFormState): ActivityFormErrors {
    const errors: ActivityFormErrors = {}
    for (const field of ACTIVITY_FIELDS) {
        const message = validateActivityField(a, field)
        if (message) errors[field] = message
    }
    return errors
}

export function validateAllActivities(activities: ActivityFormState[]): Record<string, ActivityFormErrors> {
    const map: Record<string, ActivityFormErrors> = {}
    for (const a of activities) {
        const errs = validateActivityFields(a)
        if (Object.keys(errs).length > 0) map[a.key] = errs
    }
    return map
}

export function countErrors(errors: Record<string, string | undefined>): number {
    return Object.values(errors).filter(Boolean).length
}
