import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { SOFT_SKILL_RUBRIC, RUBRIC_LEVELS } from "./soft-skill-rubric.ts"

const SKILLS = Object.keys(SOFT_SKILL_RUBRIC)
const cells = SKILLS.flatMap((k) => {
    const r = SOFT_SKILL_RUBRIC[k as keyof typeof SOFT_SKILL_RUBRIC]
    return [
        { skill: k, level: "pass", text: r.pass },
        { skill: k, level: "good", text: r.good },
        { skill: k, level: "excellent", text: r.excellent },
    ]
})

describe("เกณฑ์การประเมินระดับ Soft Skills (rubric สำหรับผู้จัด)", () => {
    test("ครบทั้ง 12 ทักษะที่ระบบใช้ (ตรงกับ SoftSkillType ใน backend)", () => {
        assert.deepEqual(
            [...SKILLS].sort(),
            [
                "analytic_critical_thinking",
                "communication",
                "complex_problem_solving",
                "creativity",
                "curiosity_lifelong_learning",
                "decision_making",
                "flexibility_adaptability",
                "leadership",
                "negotiation_persuasion",
                "positive_attitude",
                "teamwork_collaboration",
                "time_management",
            ]
        )
    })

    test("ทุกช่องมีข้อความ (ไม่ว่าง ไม่สั้นจนไม่ใช่พฤติกรรม ไม่ยาวจนอ่านไม่จบในช่องตาราง)", () => {
        for (const c of cells) {
            assert.ok(c.text.trim().length >= 20, `${c.skill}/${c.level} สั้นเกินไป: "${c.text}"`)
            assert.ok(c.text.length <= 160, `${c.skill}/${c.level} ยาวเกินไป (${c.text.length} ตัวอักษร)`)
        }
    })

    test("แต่ละทักษะมี 3 ระดับที่ไม่ซ้ำกัน และไม่มีข้อความซ้ำข้ามทักษะ (กัน copy-paste)", () => {
        for (const k of SKILLS) {
            const r = SOFT_SKILL_RUBRIC[k as keyof typeof SOFT_SKILL_RUBRIC]
            assert.equal(new Set([r.pass, r.good, r.excellent]).size, 3, `${k} มีระดับที่ข้อความซ้ำกัน`)
        }
        const all = cells.map((c) => c.text)
        assert.equal(new Set(all).size, all.length)
    })

    test("เขียนเป็นพฤติกรรมที่สังเกตได้ ไม่ใช่ป้ายคุณลักษณะ (ไม่มีคำตัดสินลอยๆ)", () => {
        const vague = ["มีความสามารถมาก", "เก่งมาก", "ดีมาก", "ไม่ดี", "แย่"]
        for (const c of cells) {
            for (const word of vague) assert.ok(!c.text.includes(word), `${c.skill}/${c.level} มีคำตัดสินลอย "${word}"`)
        }
    })

    test("ถ้อยคำของ 3 ทักษะที่ผู้ใช้เคยเห็นและยืนยันแล้ว (ทีม/ภาวะผู้นำ/การสื่อสาร) ไม่ถูกเปลี่ยน", () => {
        assert.equal(SOFT_SKILL_RUBRIC.teamwork_collaboration.pass, "ทำงานที่ได้รับมอบหมายในกลุ่มจนเสร็จ ไม่ต้องเตือน")
        assert.equal(SOFT_SKILL_RUBRIC.leadership.good, "อาสาเป็นตัวแทนกลุ่มย่อยในบางช่วง ตัดสินใจแทนกลุ่มในเรื่องเล็กได้")
        assert.equal(
            SOFT_SKILL_RUBRIC.communication.excellent,
            "ประสานงานข้ามทีม/ฝ่าย หรือนำเสนอต่อผู้มีส่วนได้ส่วนเสียภายนอกได้อย่างมีประสิทธิภาพ"
        )
    })
})

describe("RUBRIC_LEVELS — คำอธิบาย 3 ระดับและเงื่อนไขการให้", () => {
    test("เรียง ผ่าน → ดี → ดีเยี่ยม ค่าที่เก็บ 1/2/3 ตรงกับ SOFT_SKILL_TIERS", () => {
        assert.deepEqual(
            RUBRIC_LEVELS.map((l) => [l.key, l.value, l.label]),
            [["pass", 1, "ผ่าน"], ["good", 2, "ดี"], ["excellent", 3, "ดีเยี่ยม"]]
        )
    })

    test("ทุกระดับมีนิยามและเงื่อนไขว่าเมื่อไรให้ได้", () => {
        for (const l of RUBRIC_LEVELS) {
            assert.ok(l.meaning.length > 10)
            assert.ok(l.whenAllowed.length > 10)
        }
    })

    test("เงื่อนไขของระดับดีเยี่ยมระบุ 2 วันขึ้นไป ไม่จำกัดประเภทการรับสมัคร (ตรงกับ maxSoftSkillLevel)", () => {
        const excellent = RUBRIC_LEVELS.find((l) => l.key === "excellent")!
        assert.match(excellent.whenAllowed, /2 วัน/)
        assert.doesNotMatch(excellent.whenAllowed, /สตาฟฟ์/)
    })
})
