// lib/date-span.test.ts
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { formatCompactDateSpan } from "./date-span.ts"

describe("formatCompactDateSpan", () => {
    test("เดือนเดียวกัน รวบเดือน/ปีไว้ท้ายครั้งเดียว", () => {
        assert.equal(formatCompactDateSpan("2026-10-10T02:00:00Z", "2026-10-16T09:00:00Z"), "10 – 16 ต.ค. 2569")
    })

    test("ข้ามเดือนในปีเดียวกัน คงเดือนทั้งสองฝั่ง ปีไว้ท้าย", () => {
        assert.equal(formatCompactDateSpan("2026-10-30T02:00:00Z", "2026-11-02T02:00:00Z"), "30 ต.ค. – 2 พ.ย. 2569")
    })

    test("ข้ามปี แสดงเต็มทั้งสองฝั่ง", () => {
        assert.equal(formatCompactDateSpan("2026-12-30T02:00:00Z", "2027-01-02T02:00:00Z"), "30 ธ.ค. 2569 – 2 ม.ค. 2570")
    })

    test("วันเดียวกัน (คนละเวลา) แสดงวันเดียว", () => {
        assert.equal(formatCompactDateSpan("2026-10-18T01:00:00Z", "2026-10-18T10:00:00Z"), "18 ต.ค. 2569")
    })

    test("เทียบวันตามเวลาไทย ไม่ใช่ UTC — 17:30Z กับ 23:00Z ของวันที่ 17 คือวันที่ 18 ทั้งคู่ตามเวลาไทย", () => {
        assert.equal(formatCompactDateSpan("2026-10-17T17:30:00Z", "2026-10-17T23:00:00Z"), "18 ต.ค. 2569")
        // และวันเดียวกันตาม UTC แต่คนละวันตามเวลาไทย ต้องแยกเป็นช่วง
        assert.equal(formatCompactDateSpan("2026-10-17T10:00:00Z", "2026-10-17T18:00:00Z"), "17 – 18 ต.ค. 2569")
    })

    test("รับ epoch ms ได้เหมือน ISO", () => {
        const start = Date.parse("2026-10-10T02:00:00Z")
        const end = Date.parse("2026-10-16T02:00:00Z")
        assert.equal(formatCompactDateSpan(start, end), "10 – 16 ต.ค. 2569")
    })

    test("วันเริ่มใช้ไม่ได้ (งานที่ไม่มีกิจกรรมย่อย = Infinity) → ไม่ระบุวันที่", () => {
        assert.equal(formatCompactDateSpan(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY), "ไม่ระบุวันที่")
    })

    test("วันจบใช้ไม่ได้ แสดงวันเริ่มวันเดียว", () => {
        assert.equal(formatCompactDateSpan("2026-10-18T02:00:00Z", Number.NEGATIVE_INFINITY), "18 ต.ค. 2569")
    })
})
