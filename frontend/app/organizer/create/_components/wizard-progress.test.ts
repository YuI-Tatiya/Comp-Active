import { test, describe } from "node:test"
import assert from "node:assert/strict"
import type { ActivityFormState, EventFormState } from "./types"
import { mascotMessage, stepProgress, stepSlug } from "./wizard-progress.ts"

// สร้าง fixture เองแทน createEmptyEvent/createEmptyActivity — types.ts ไม่ได้ import ด้วยนามสกุล .ts
// (ทั้งแอปใช้แบบไม่มีนามสกุล) node --test จึงโหลดค่าจริงจากไฟล์นั้นไม่ได้ ใช้ได้แค่ type
function event(overrides: Partial<EventFormState> = {}): EventFormState {
    return {
        name: "",
        description: "",
        imageFile: null,
        imagePreview: null,
        isPublic: true,
        registrationOpenAt: "",
        registrationCloseAt: "",
        surveyQuestions: [
            { label: "พึงพอใจแค่ไหน", type: "rating", scaleMax: 5 },
            { label: "", type: "text" },
        ],
        visibility: "everyone",
        visibilityPrograms: [],
        visibilityYears: [],
        visibilityStudentIdFilter: "",
        type: "project",
        registrationType: "participant",
        ...overrides,
    }
}

function activity(overrides: Partial<ActivityFormState> = {}): ActivityFormState {
    return {
        key: "a1",
        name: "เวิร์กช็อป",
        description: "รายละเอียด",
        categories: ["Technology"],
        imageFile: null,
        imagePreview: null,
        attachmentFile: null,
        attachmentName: null,
        attachmentUrl: null,
        startAt: "2026-11-01T09:00",
        endAt: "2026-11-01T12:00",
        dutyDate: "",
        location: "ห้อง 301",
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
        ...overrides,
    }
}

const LONG_DESCRIPTION = "ค่ายพาน้องเขียนโค้ดสามวัน ใครก็มาได้ ได้ทักษะกลับไปแน่นอน"

describe("stepProgress — ขั้นที่ 1 (ข้อมูลพื้นฐาน)", () => {
    test("เปิดหน้าใหม่: ประเภทงาน+ประเภทการรับสมัครมีค่าเริ่มต้นแล้ว = 2/5 เหลือช่องบังคับ 2 ช่อง", () => {
        assert.deepEqual(stepProgress(1, event(), []), { slug: "basics", done: 2, total: 5, remaining: 2 })
    })

    test("รายละเอียดสั้นกว่า 20 ตัวอักษรยังไม่นับว่าเสร็จ — ตรงกับที่ validation ไม่ให้ผ่าน", () => {
        const p = stepProgress(1, event({ name: "Comp Camp", description: "สั้นไป" }), [])
        assert.equal(p.done, 3)
        assert.equal(p.remaining, 1)
    })

    test("กรอกครบ + มีรูปปก = 5/5 และไม่เหลือช่องบังคับ", () => {
        const p = stepProgress(1, event({ name: "Comp Camp", description: LONG_DESCRIPTION, imagePreview: "data:x" }), [])
        assert.deepEqual(p, { slug: "basics", done: 5, total: 5, remaining: 0 })
    })

    test("ไม่มีรูปปกก็ไปต่อได้ (รูปไม่บังคับ) แต่แถบยังไม่เต็ม", () => {
        const p = stepProgress(1, event({ name: "Comp Camp", description: LONG_DESCRIPTION }), [])
        assert.equal(p.done, 4)
        assert.equal(p.remaining, 0)
    })
})

describe("stepProgress — ขั้นที่ 2-4", () => {
    test("ขั้นที่ 2 นับกิจกรรมที่กรอกผ่านทุกช่องแล้ว", () => {
        const p = stepProgress(2, event(), [activity(), activity({ key: "a2", location: "" })])
        assert.deepEqual(p, { slug: "activities", done: 1, total: 2, remaining: 1 })
    })

    test("ขั้นที่ 3 แบบสำรวจไม่บังคับ — ไม่มีอะไรค้าง นับเฉพาะคำถามที่ตั้งชื่อแล้ว", () => {
        assert.deepEqual(stepProgress(3, event(), []), { slug: "survey", done: 1, total: 2, remaining: 0 })
    })

    test("ขั้นที่ 4 ตรวจทั้งข้อมูลพื้นฐาน กิจกรรมย่อย และช่วงรับสมัคร", () => {
        const ready = event({ name: "Comp Camp", description: LONG_DESCRIPTION })
        assert.deepEqual(stepProgress(4, ready, [activity()]), { slug: "publish", done: 3, total: 3, remaining: 0 })

        const badWindow = { ...ready, registrationOpenAt: "2026-11-02T00:00", registrationCloseAt: "2026-11-01T00:00" }
        assert.equal(stepProgress(4, badWindow, [activity()]).remaining, 1)
        assert.equal(stepProgress(4, ready, []).remaining, 1)
    })
})

describe("mascotMessage / stepSlug", () => {
    test("บอกจำนวนช่องที่เหลือ หรือบอกว่าไปต่อได้", () => {
        assert.equal(mascotMessage(1, { slug: "basics", done: 2, total: 5, remaining: 2 }), "กรอกอีก 2 ช่อง ก็ไปขั้นต่อไปได้!")
        assert.equal(mascotMessage(1, { slug: "basics", done: 4, total: 5, remaining: 0 }), "ข้อมูลพื้นฐานครบแล้ว ไปต่อกันเลย!")
        assert.equal(mascotMessage(2, { slug: "activities", done: 0, total: 1, remaining: 1 }), "เหลืออีก 1 กิจกรรมที่ยังกรอกไม่ครบ")
    })

    test("ขั้นที่อยู่นอกช่วงไม่ทำให้พัง", () => {
        assert.equal(stepSlug(1), "basics")
        assert.equal(stepSlug(4), "publish")
        assert.equal(stepSlug(9), "basics")
    })
})
