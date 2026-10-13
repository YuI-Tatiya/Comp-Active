import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { accountValidity } from "./organizer-account.ts"

const NOW = new Date("2026-10-13T06:00:00.000Z")
const DAY = 24 * 60 * 60 * 1000

describe("accountValidity", () => {
    it("ไม่มี validUntil = ไม่มีกำหนดหมดอายุ", () => {
        assert.deepEqual(accountValidity("2026-10-13T00:00:00.000Z", null, NOW), { kind: "unlimited" })
        assert.deepEqual(accountValidity(null, undefined, NOW), { kind: "unlimited" })
    })

    it("validUntil ผ่านไปแล้ว = หมดอายุแล้ว", () => {
        assert.deepEqual(accountValidity("2026-07-01T00:00:00.000Z", "2026-10-01T00:00:00.000Z", NOW), { kind: "expired" })
    })

    it("validUntil ตรงเวลาปัจจุบันเป๊ะ = ถือว่าหมดอายุแล้ว (ไม่ใช่ active 0 วัน)", () => {
        assert.deepEqual(accountValidity("2026-07-13T06:00:00.000Z", NOW.toISOString(), NOW), { kind: "expired" })
    })

    it("ยังไม่หมดอายุ: ปัดวันที่เหลือขึ้น และคำนวณ % ที่ผ่านไปจาก createdAt→validUntil", () => {
        const createdAt = new Date(NOW.getTime() - 9 * DAY).toISOString() // ผ่านมาแล้ว 9 วัน
        const validUntil = new Date(NOW.getTime() + 81 * DAY).toISOString() // รวมช่วงทั้งหมด 90 วัน
        const result = accountValidity(createdAt, validUntil, NOW)
        assert.equal(result.kind, "active")
        if (result.kind !== "active") return
        assert.equal(result.daysRemaining, 81)
        assert.equal(result.percentElapsed, 10)
    })

    it("เหลือเวลาไม่ถึง 1 วันพอดี ปัดขึ้นเป็น 1 วัน ไม่ใช่ 0", () => {
        const validUntil = new Date(NOW.getTime() + 2 * 60 * 60 * 1000).toISOString() // อีก 2 ชม.
        const result = accountValidity(NOW.toISOString(), validUntil, NOW)
        assert.equal(result.kind, "active")
        if (result.kind !== "active") return
        assert.equal(result.daysRemaining, 1)
    })

    it("ไม่มี createdAt (ข้อมูลเก่า/เพี้ยน) ยังคำนวณวันที่เหลือได้ แต่ % เริ่มจาก 0", () => {
        const validUntil = new Date(NOW.getTime() + 30 * DAY).toISOString()
        const result = accountValidity(null, validUntil, NOW)
        assert.equal(result.kind, "active")
        if (result.kind !== "active") return
        assert.equal(result.daysRemaining, 30)
        assert.equal(result.percentElapsed, 0)
    })
})
