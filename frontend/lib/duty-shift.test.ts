import { test, describe } from "node:test"
import assert from "node:assert/strict"
import {
    buildDutyShiftOptions,
    parseDutyShiftOptions,
    formatDutyShift,
    deriveVolunteerRole,
    type DutyShiftRow,
} from "./duty-shift.ts"

function row(label: string, startTime: string, endTime: string): DutyShiftRow {
    return { id: "x", label, startTime, endTime }
}

describe("buildDutyShiftOptions", () => {
    test("โหมด single ส่ง [] เสมอ ไม่ว่าจะมีแถวค้างอยู่หรือไม่", () => {
        assert.deepEqual(buildDutyShiftOptions("single", []), [])
        assert.deepEqual(buildDutyShiftOptions("single", [row("กะเช้า", "08:00", "12:00")]), [])
    })

    test("โหมด shifts แปลงแถวที่ครบเป็น 'ชื่อ (เริ่ม-สิ้นสุด)'", () => {
        assert.deepEqual(
            buildDutyShiftOptions("shifts", [row("กะเช้า", "08:00", "12:00"), row("กะบ่าย", "13:00", "17:00")]),
            ["กะเช้า (08:00-12:00)", "กะบ่าย (13:00-17:00)"]
        )
    })

    test("ตัดแถวที่กรอกไม่ครบ (ชื่อว่าง หรือเวลาใดเวลาหนึ่งว่าง) ทิ้งเงียบๆ", () => {
        assert.deepEqual(
            buildDutyShiftOptions("shifts", [
                row("", "08:00", "12:00"),
                row("กะบ่าย", "", "17:00"),
                row("กะเย็น", "17:00", ""),
                row("กะเช้า", "08:00", "12:00"),
            ]),
            ["กะเช้า (08:00-12:00)"]
        )
    })

    test("ตัดช่องว่างหัวท้ายชื่อกะ", () => {
        assert.deepEqual(buildDutyShiftOptions("shifts", [row("  กะเช้า  ", "08:00", "12:00")]), ["กะเช้า (08:00-12:00)"])
    })
})

describe("parseDutyShiftOptions", () => {
    test("อาเรย์ว่าง → โหมด single ไม่มีแถว", () => {
        assert.deepEqual(parseDutyShiftOptions([]), { mode: "single", rows: [] })
    })

    test("พาร์สรูปแบบ 'ชื่อ (เริ่ม-สิ้นสุด)' กลับเป็นแถวได้ครบ", () => {
        const { mode, rows } = parseDutyShiftOptions(["กะเช้า (08:00-12:00)", "กะบ่าย (13:00-17:00)"])
        assert.equal(mode, "shifts")
        assert.deepEqual(
            rows.map((r) => [r.label, r.startTime, r.endTime]),
            [["กะเช้า", "08:00", "12:00"], ["กะบ่าย", "13:00", "17:00"]]
        )
    })

    test("ข้อความเก่าที่พาร์สรูปแบบไม่ได้ ยังกลับมาเป็นแถวได้ (ชื่อ = ข้อความเดิม, เวลาว่างให้กรอกใหม่)", () => {
        const { mode, rows } = parseDutyShiftOptions(["กะเช้า 08:00-12:00"])
        assert.equal(mode, "shifts")
        assert.deepEqual(rows, [{ id: "shift-0", label: "กะเช้า 08:00-12:00", startTime: "", endTime: "" }])
    })

    test("build แล้ว parse กลับมาต้องได้แถวเดิม (round-trip)", () => {
        const rows = [row("กะเช้า", "08:00", "12:00"), row("กะบ่าย", "13:00", "17:00")]
        const built = buildDutyShiftOptions("shifts", rows)
        const parsed = parseDutyShiftOptions(built)
        assert.deepEqual(
            parsed.rows.map((r) => [r.label, r.startTime, r.endTime]),
            rows.map((r) => [r.label, r.startTime, r.endTime])
        )
    })
})

describe("formatDutyShift", () => {
    test("ประกอบชื่อกะ+เวลาเป็นบรรทัดเดียว", () => {
        assert.equal(formatDutyShift(row("กะเช้า", "08:00", "12:00")), "กะเช้า (08:00-12:00)")
    })
})

describe("deriveVolunteerRole", () => {
    test("รวมตัวเลือกบทบาท/หน้าที่ด้วย ' / ' แทนการให้กรอกซ้ำ", () => {
        assert.equal(deriveVolunteerRole(["ลงทะเบียนหน้างาน", "ดูแลอุปกรณ์"]), "ลงทะเบียนหน้างาน / ดูแลอุปกรณ์")
    })

    test("ตัดค่าว่าง/เว้นวรรคล้วนออก และตัดช่องว่างหัวท้ายของแต่ละรายการ", () => {
        assert.equal(deriveVolunteerRole(["  ลงทะเบียนหน้างาน  ", "", "   "]), "ลงทะเบียนหน้างาน")
    })

    test("ไม่มีตัวเลือกเลย → string ว่าง", () => {
        assert.equal(deriveVolunteerRole([]), "")
    })
})
