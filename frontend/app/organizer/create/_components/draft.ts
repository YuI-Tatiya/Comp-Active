import type { EventFormState, ActivityFormState } from "./types"

// ฉบับร่างเก็บ state ของ wizard ทั้งหมดยกเว้นไฟล์ที่ยังไม่อัปโหลด (File ไม่ใช่ JSON) — หน้า create/page.tsx
// ต้องอัปโหลดไฟล์ที่เลือกค้างไว้ก่อนเรียก serializeDraft เสมอ (ดู handleSaveDraft) ไม่งั้นรูป/ไฟล์แนบจะหายตอนกลับมาทำต่อ

export type DraftEvent = Omit<EventFormState, "imageFile">
export type DraftActivity = Omit<ActivityFormState, "imageFile" | "attachmentFile">

export interface EventDraftPayload {
    /** เผื่อโครงสร้างนี้เปลี่ยนในอนาคต — ยังไม่มี logic ย้ายเวอร์ชัน แค่กันลืมว่าต้องคิดเรื่องนี้ตอนแก้โครงสร้าง */
    version: 1
    step: number
    activeActivityKey: string
    event: DraftEvent
    activities: DraftActivity[]
}

export function serializeDraft(args: {
    step: number
    activeActivityKey: string
    event: EventFormState
    activities: ActivityFormState[]
}): EventDraftPayload {
    const { imageFile: _eventImageFile, ...eventRest } = args.event
    return {
        version: 1,
        step: args.step,
        activeActivityKey: args.activeActivityKey,
        event: eventRest,
        activities: args.activities.map((a) => {
            const { imageFile: _imageFile, attachmentFile: _attachmentFile, ...rest } = a
            return rest
        }),
    }
}

/**
 * ทางกลับของ serializeDraft — ผสานทับค่าเริ่มต้นเสมอ (ไม่ใช่แทนที่ตรงๆ) กันพังถ้าโครงสร้าง wizard
 * เพิ่มฟิลด์ใหม่หลังจากบันทึกฉบับร่างนี้ไว้แล้ว ฉบับร่างเก่าที่ไม่มีฟิลด์นั้นจะได้ค่าเริ่มต้นแทน undefined
 * step ไม่ครอบเพดานจำนวนขั้นตอนที่นี่ (ไฟล์นี้ไม่รู้จัก STEPS.length) ผู้เรียกต้อง clamp เองอีกชั้น
 */
export function deserializeDraft(
    payload: unknown,
    emptyEvent: EventFormState,
    createEmptyActivity: () => ActivityFormState,
): { step: number; activeActivityKey: string; event: EventFormState; activities: ActivityFormState[] } {
    const p = (payload && typeof payload === "object" ? payload : {}) as Partial<EventDraftPayload>

    const event: EventFormState = { ...emptyEvent, ...p.event, imageFile: null }

    const rawActivities = Array.isArray(p.activities) ? p.activities : []
    const activities: ActivityFormState[] =
        rawActivities.length > 0
            ? rawActivities.map((a) => ({ ...createEmptyActivity(), ...a, imageFile: null, attachmentFile: null }))
            : [createEmptyActivity()]

    const activeActivityKey =
        typeof p.activeActivityKey === "string" && activities.some((a) => a.key === p.activeActivityKey)
            ? p.activeActivityKey
            : activities[0].key

    const step = typeof p.step === "number" && p.step >= 1 ? Math.floor(p.step) : 1

    return { step, activeActivityKey, event, activities }
}
