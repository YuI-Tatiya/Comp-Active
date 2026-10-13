import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { calendarDaysUntil, countdownLabel, mascotLine, nextStepLabel, selectUpcoming } from "./student-home.ts"

// 16 ต.ค. 2569 เวลา 00:30 น. ไทย = ยังเป็นวันที่ 15 ตาม UTC — ดักบั๊กที่นับวันตามเวลาเครื่อง/UTC
const NOW = new Date("2026-10-15T17:30:00.000Z")

const reg = (
    id: number,
    activity: { date: string; startTime?: string; startAt?: string | null; endAt?: string | null; status?: string; approvalStatus?: string },
    opts: { status?: string; evaluation?: unknown } = {}
) => ({
    id,
    status: opts.status ?? "confirmed",
    evaluation: opts.evaluation ?? null,
    activity: { approvalStatus: "approved", status: "open", ...activity },
})

describe("calendarDaysUntil", () => {
    it("นับตามปฏิทินไทย ไม่ใช่ UTC", () => {
        // Prisma @db.Date ส่งมาเป็นเที่ยงคืน UTC
        assert.equal(calendarDaysUntil("2026-10-16T00:00:00.000Z", NOW), 0)
        assert.equal(calendarDaysUntil("2026-10-17T00:00:00.000Z", NOW), 1)
        assert.equal(calendarDaysUntil("2026-10-19T00:00:00.000Z", NOW), 3)
        assert.equal(calendarDaysUntil("2026-10-15T00:00:00.000Z", NOW), -1)
    })

    it("เวลาจริง (startAt) ที่ข้ามเที่ยงคืนไทยนับเป็นวันถัดไป", () => {
        // 23:00 UTC วันที่ 16 = 06:00 น. ไทยวันที่ 17
        assert.equal(calendarDaysUntil("2026-10-16T23:00:00.000Z", NOW), 1)
    })

    it("ไม่มีวันที่หรืออ่านไม่ออก = null", () => {
        assert.equal(calendarDaysUntil(null, NOW), null)
        assert.equal(calendarDaysUntil("not-a-date", NOW), null)
    })
})

describe("countdownLabel", () => {
    it("วันนี้ / พรุ่งนี้ / อีก N วัน", () => {
        assert.equal(countdownLabel(0), "วันนี้")
        assert.equal(countdownLabel(1), "พรุ่งนี้")
        assert.equal(countdownLabel(3), "อีก 3 วัน")
    })
})

describe("selectUpcoming", () => {
    it("เอาเฉพาะที่รอยืนยัน/ยืนยันแล้ว และยังไม่ถึงหรือเป็นวันนี้", () => {
        const rows = [
            reg(1, { date: "2026-10-16T00:00:00.000Z" }),
            reg(2, { date: "2026-10-20T00:00:00.000Z" }, { status: "pending" }),
            reg(3, { date: "2026-10-15T00:00:00.000Z" }), // เมื่อวาน
            reg(4, { date: "2026-10-18T00:00:00.000Z" }, { status: "cancelled" }),
            reg(5, { date: "2026-10-18T00:00:00.000Z" }, { evaluation: { communication: 3 } }), // เช็คอินแล้ว
            reg(6, { date: "2026-10-18T00:00:00.000Z", approvalStatus: "cancelled" }), // ผู้จัดยกเลิกทั้งงาน
            reg(7, { date: "2026-10-18T00:00:00.000Z", status: "completed" }), // ผู้จัดปิดจบแล้ว
        ]
        assert.deepEqual(
            selectUpcoming(rows, NOW).map((r) => r.id),
            [1, 2]
        )
    })

    it("กิจกรรมหลายวันที่เริ่มไปแล้วแต่ยังไม่จบยังนับ", () => {
        const rows = [
            reg(1, {
                date: "2026-10-14T00:00:00.000Z",
                startAt: "2026-10-14T02:00:00.000Z",
                endAt: "2026-10-17T10:00:00.000Z",
            }),
        ]
        assert.deepEqual(
            selectUpcoming(rows, NOW).map((r) => r.id),
            [1]
        )
    })

    it("เรียงตามวันเริ่ม แล้วตามเวลาเริ่มในวันเดียวกัน", () => {
        const rows = [
            reg(1, { date: "2026-10-20T00:00:00.000Z", startTime: "09:00" }),
            reg(2, { date: "2026-10-17T00:00:00.000Z", startTime: "13:00" }),
            reg(3, { date: "2026-10-17T00:00:00.000Z", startTime: "08:30" }),
        ]
        assert.deepEqual(
            selectUpcoming(rows, NOW).map((r) => r.id),
            [3, 2, 1]
        )
    })
})

describe("nextStepLabel / mascotLine", () => {
    it("ขั้นถัดไปตามสถานะ", () => {
        assert.equal(nextStepLabel("pending"), "รอผู้จัดยืนยันที่นั่ง")
        assert.equal(nextStepLabel("confirmed"), "เช็คอินหน้างานวันจัดกิจกรรม")
    })

    it("ข้อความมาสคอตตามจำนวนวัน", () => {
        const text = (d: number | null) => {
            const l = mascotLine(d)
            return l.before + l.highlight + l.after
        }
        assert.equal(text(3), "อีก 3 วัน ถึงกิจกรรมถัดไปแล้วนะ!")
        assert.equal(mascotLine(3).highlight, "3 วัน")
        assert.equal(text(1), "พรุ่งนี้ มีกิจกรรมแล้วนะ!")
        assert.equal(text(0), "วันนี้ มีกิจกรรมแล้วนะ!")
        assert.match(text(null), /ยังไม่มีกิจกรรมที่จะถึง/)
    })
})
