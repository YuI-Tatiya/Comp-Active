import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { splitHeadline, nextWordIndex } from "./hero-text.ts"

describe("splitHeadline (แบ่งหัวข้อเป็นหน่วยสำหรับแอนิเมชันเปิดทีละคำ)", () => {
    test("ต่อกลับได้เท่าข้อความเดิมเสมอ (ไม่มีตัวอักษรหาย รวมช่องว่าง)", () => {
        for (const text of ["สวัสดี", "Soft Skills", "กิจกรรม ของฉัน", "  ", "", "สวัสดีครับพี่น้อง"]) {
            assert.equal(splitHeadline(text).map((s) => s.text).join(""), text)
        }
    })

    test("ข้อความว่างได้อาร์เรย์ว่าง", () => {
        assert.deepEqual(splitHeadline(""), [])
    })

    test("คำภาษาอังกฤษแยกตามช่องว่าง และช่องว่างถูกทำเครื่องหมาย isSpace", () => {
        const parts = splitHeadline("Soft Skills")
        assert.deepEqual(
            parts.map((p) => [p.text, p.isSpace]),
            [["Soft", false], [" ", true], ["Skills", false]],
        )
    })

    test("ภาษาไทยไม่ถูกตัดกลางสระ/วรรณยุกต์ (ทุกหน่วยขึ้นต้นด้วยพยัญชนะหรือสระนำ ไม่ใช่เครื่องหมายผสม)", () => {
        const COMBINING = /^[ัิ-ฺ็-๎]/
        for (const part of splitHeadline("กิจกรรมทั้งหมดของฉัน")) {
            assert.equal(COMBINING.test(part.text), false, part.text)
        }
    })
})

describe("nextWordIndex (วนคำที่สลับอัตโนมัติ)", () => {
    test("เพิ่มทีละหนึ่งและวนกลับที่ 0", () => {
        assert.equal(nextWordIndex(0, 4), 1)
        assert.equal(nextWordIndex(3, 4), 0)
    })
    test("รายการว่างหรือมีคำเดียวคงที่ 0 ไม่ throw", () => {
        assert.equal(nextWordIndex(0, 0), 0)
        assert.equal(nextWordIndex(0, 1), 0)
    })
})
