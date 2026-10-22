import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { checkinScanVerdict, parseCheckinUrl } from "./checkin-qr.ts"

describe("parseCheckinUrl", () => {
    test("แกะ publicId และ querystring (รวม token) ออกจากลิงก์เต็ม", () => {
        assert.deepEqual(
            parseCheckinUrl("https://app.comp-active.com/student/checkin/abc-123?token=xyz789"),
            { id: "abc-123", search: "?token=xyz789" }
        )
    })

    test("ไม่มี querystring เลย — search เป็นสตริงว่าง", () => {
        assert.deepEqual(parseCheckinUrl("https://app.comp-active.com/student/checkin/abc-123"), {
            id: "abc-123",
            search: "",
        })
    })

    test("ข้อความไม่ตรงรูปแบบ URL เช็คอินเลย — คืน null", () => {
        assert.equal(parseCheckinUrl("https://example.com/not-a-checkin-link"), null)
        assert.equal(parseCheckinUrl("ข้อความธรรมดาที่ไม่ใช่ URL"), null)
    })

    test("ขึ้นบรรทัดใหม่/มีช่องว่างต่อท้าย querystring ไม่หลุดเข้ามาปน", () => {
        assert.deepEqual(parseCheckinUrl("https://app.comp-active.com/student/checkin/abc-123?token=xyz\nบรรทัดถัดไป"), {
            id: "abc-123",
            search: "?token=xyz",
        })
    })
})

describe("checkinScanVerdict", () => {
    const qr = "https://app.comp-active.com/student/checkin/abc-123?token=xyz789"

    test("สแกนจากการ์ดของกิจกรรมนั้น — QR ตรงกิจกรรม ได้ path หน้าเช็คอินพร้อม token", () => {
        assert.deepEqual(checkinScanVerdict(qr, "abc-123"), { ok: true, href: "/student/checkin/abc-123?token=xyz789" })
    })

    test("สแกนจากการ์ด แต่เป็น QR ของกิจกรรมอื่น — ไม่ผ่าน", () => {
        assert.deepEqual(checkinScanVerdict(qr, "other-999"), { ok: false, reason: "other-activity" })
    })

    test("ปุ่มสแกนด่วน (ไม่ระบุกิจกรรม) — รับ QR เช็คอินของกิจกรรมไหนก็ได้", () => {
        assert.deepEqual(checkinScanVerdict(qr), { ok: true, href: "/student/checkin/abc-123?token=xyz789" })
    })

    test("ไม่ใช่ QR เช็คอิน — ไม่ผ่านทั้งสองโหมด", () => {
        assert.deepEqual(checkinScanVerdict("https://example.com/promo"), { ok: false, reason: "not-checkin" })
        assert.deepEqual(checkinScanVerdict("สวัสดี", "abc-123"), { ok: false, reason: "not-checkin" })
    })

    test("ลิงก์เช็คอินที่ไม่มี token (ลิงก์พิมพ์เอง/ภาพหน้าจอเก่า) — ไม่ผ่าน ไม่พาไปหน้าเช็คอินเปล่าๆ", () => {
        assert.deepEqual(checkinScanVerdict("https://app.comp-active.com/student/checkin/abc-123"), { ok: false, reason: "no-token" })
        assert.deepEqual(checkinScanVerdict("https://app.comp-active.com/student/checkin/abc-123?ref=line"), {
            ok: false,
            reason: "no-token",
        })
    })

    test("QR ที่ฝังโดเมนอื่นไว้ — ได้แค่ path ภายในเว็บเรา ไม่ใช่ URL ของโดเมนนั้น", () => {
        const v = checkinScanVerdict("https://evil.example/student/checkin/abc-123?token=t")
        assert.deepEqual(v, { ok: true, href: "/student/checkin/abc-123?token=t" })
    })
})
