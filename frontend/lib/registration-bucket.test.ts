import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { isCancelledByOrganizer, registrationBucket } from "./registration-bucket.ts"

const reg = (status: string, opts: { evaluation?: unknown; approvalStatus?: string | null } = {}) => ({
    status,
    evaluation: opts.evaluation ?? null,
    activity: { approvalStatus: opts.approvalStatus ?? "approved" },
})

describe("isCancelledByOrganizer", () => {
    it("cancelled และ rejected (ค่าเก่า) = ถูกยกเลิกทั้งงาน", () => {
        assert.equal(isCancelledByOrganizer("cancelled"), true)
        assert.equal(isCancelledByOrganizer("rejected"), true)
    })

    it("สถานะอื่นหรือไม่มีค่า = ไม่ได้ถูกยกเลิก", () => {
        for (const s of ["approved", "pending_approval", "pending_cancel", null, undefined]) {
            assert.equal(isCancelledByOrganizer(s), false)
        }
    })
})

describe("registrationBucket", () => {
    it("แบ่งตามสถานะแถวลงทะเบียนปกติ", () => {
        assert.equal(registrationBucket(reg("pending")), "pending")
        assert.equal(registrationBucket(reg("confirmed")), "confirmed")
        assert.equal(registrationBucket(reg("cancelled")), "cancelled")
    })

    it("มีผลประเมิน (เช็คอินแล้ว) = ประเมินแล้ว", () => {
        assert.equal(registrationBucket(reg("confirmed", { evaluation: { communication: 3 } })), "evaluated")
    })

    it("ผู้จัดยกเลิกทั้งงาน → ยกเลิกแล้ว แม้แถวลงทะเบียนยังเป็น pending/confirmed", () => {
        assert.equal(registrationBucket(reg("pending", { approvalStatus: "cancelled" })), "cancelled")
        assert.equal(registrationBucket(reg("confirmed", { approvalStatus: "cancelled" })), "cancelled")
        assert.equal(registrationBucket(reg("confirmed", { approvalStatus: "rejected" })), "cancelled")
    })

    it("เช็คอินไปแล้วก่อนผู้จัดยกเลิก = ยังเป็นประเมินแล้ว (คะแนนยังนับ)", () => {
        assert.equal(
            registrationBucket(reg("confirmed", { evaluation: { communication: 3 }, approvalStatus: "cancelled" })),
            "evaluated"
        )
    })
})
