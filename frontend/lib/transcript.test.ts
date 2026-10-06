// lib/transcript.test.ts
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import {
    normalizeTranscriptCode,
    formatTranscriptCode,
    decodeCodeParam,
    formatThaiDate,
    levelPercent,
    snapshotToSkillRows,
    type SkillTranscriptSnapshot,
} from "./transcript.ts"

describe("normalizeTranscriptCode", () => {
    test("รับรหัสที่ถูกต้อง และตัดขีด/ช่องว่าง/แปลงตัวพิมพ์ใหญ่", () => {
        assert.equal(normalizeTranscriptCode("0123456789ABCDGG"), "0123456789ABCDGG")
        assert.equal(normalizeTranscriptCode("0123-4567-89ab-cdgg"), "0123456789ABCDGG")
        assert.equal(normalizeTranscriptCode("  0123 4567 89AB CDGG "), "0123456789ABCDGG")
    })

    test("แปลงตัวอักษรที่สับสนง่าย O→0, I→1, L→1", () => {
        assert.equal(normalizeTranscriptCode("O123456789ABCDGG"), "0123456789ABCDGG")
        assert.equal(normalizeTranscriptCode("i123456789ABCDGG"), "1123456789ABCDGG")
        assert.equal(normalizeTranscriptCode("L123456789ABCDGG"), "1123456789ABCDGG")
    })

    test("ผิดรูปแบบ → null", () => {
        for (const bad of ["", "0123-4567", "0123456789ABCDGGG", "U123456789ABCDGG", "'; DROP TABLE x;--", "สวัสดี"]) {
            assert.equal(normalizeTranscriptCode(bad), null, bad)
        }
    })
})

describe("formatTranscriptCode", () => {
    test("จัดเป็น XXXX-XXXX-XXXX-XXXX", () => {
        assert.equal(formatTranscriptCode("0123456789ABCDGG"), "0123-4567-89AB-CDGG")
    })
    test("รหัสที่ไม่ถูกต้องแสดงตามเดิม (พิมพ์ใหญ่) ไม่ throw", () => {
        assert.equal(formatTranscriptCode("abc"), "ABC")
    })
})

describe("decodeCodeParam", () => {
    test("ถอดรหัส %-encoding ปกติ", () => {
        assert.equal(decodeCodeParam("0123%2D4567"), "0123-4567")
    })
    test("พารามิเตอร์ผิดรูปแบบ (%) ไม่ throw และคืนค่าดิบ", () => {
        assert.equal(decodeCodeParam("%"), "%")
        assert.equal(decodeCodeParam("%E0%A4%A"), "%E0%A4%A")
        assert.equal(normalizeTranscriptCode(decodeCodeParam("%")), null)
    })
})

describe("formatThaiDate", () => {
    test("แสดงวันที่แบบไทย พ.ศ. ตามเขตเวลา Asia/Bangkok", () => {
        assert.equal(formatThaiDate("2026-10-06T03:00:00.000Z"), "6 ตุลาคม 2569")
    })
    test("เที่ยงคืน UTC ยังเป็นวันเดียวกันในไทย (07:00)", () => {
        assert.equal(formatThaiDate("2026-10-06T00:00:00.000Z"), "6 ตุลาคม 2569")
    })
    test("ค่าวันที่เสียแสดงขีดแทนที่จะ throw", () => {
        assert.equal(formatThaiDate("not-a-date"), "—")
    })
})

describe("levelPercent", () => {
    test("แปลงค่าเฉลี่ย 0–5 เป็นเปอร์เซ็นต์ และติดกรอบ 0–100", () => {
        assert.equal(levelPercent(0), 0)
        assert.equal(levelPercent(2.5), 50)
        assert.equal(levelPercent(5), 100)
        assert.equal(levelPercent(7), 100)
        assert.equal(levelPercent(-1), 0)
    })
})

describe("snapshotToSkillRows", () => {
    const snapshot: SkillTranscriptSnapshot = {
        version: 1,
        holder: { name: "ทดสอบ", studentId: null },
        summary: { totalScore: 10, activityCount: 1, overallAverage: 1 },
        averages: { communication: 4, leadership: 2.5 },
        activities: [],
    }
    const skills = [
        { field: "communication", label: "การสื่อสาร", labelEn: "Communication" },
        { field: "leadership", label: "ผู้นำ", labelEn: "Leadership" },
        { field: "creativity", label: "ความคิดสร้างสรรค์", labelEn: "Creativity" },
    ]

    test("เรียงตามรายการทักษะ ใส่เลข 1.. และเติม 0 ให้ทักษะที่ไม่มีใน snapshot", () => {
        const rows = snapshotToSkillRows(snapshot, skills)
        assert.deepEqual(
            rows.map((r) => [r.n, r.field, r.average, r.percent]),
            [
                [1, "communication", 4, 80],
                [2, "leadership", 2.5, 50],
                [3, "creativity", 0, 0],
            ],
        )
        assert.equal(rows[0].label, "การสื่อสาร")
        assert.equal(rows[0].labelEn, "Communication")
    })
})
