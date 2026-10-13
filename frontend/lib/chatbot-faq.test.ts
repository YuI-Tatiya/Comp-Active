import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { chatbotFaqs, faqsToShow, toHistoryItem, type ChatMessage } from "./chatbot-faq.ts"

describe("chatbotFaqs", () => {
    it("นักศึกษาได้ 4 ข้อ ลิงก์ไปหน้าฝั่งนักศึกษา", () => {
        const faqs = chatbotFaqs("student")
        assert.deepEqual(
            faqs.map((f) => f.id),
            ["register", "checkin", "skills", "organizer"]
        )
        assert.equal(faqs[0].link?.href, "/student/events")
        assert.equal(faqs[1].link?.href, "/student/my-registrations")
        assert.equal(faqs[2].link?.href, "/student/profile")
        assert.ok(!faqs[0].answer.startsWith("ต้องเข้าสู่ระบบ"))
    })

    it("ยังไม่ล็อกอิน: ชุดเดียวกัน แต่บอกให้เข้าสู่ระบบก่อนและลิงก์ไปหน้า /auth", () => {
        const faqs = chatbotFaqs(null)
        assert.equal(faqs.length, 4)
        for (const f of faqs.slice(0, 3)) {
            assert.equal(f.link?.href, "/auth")
            assert.ok(f.answer.startsWith("ต้องเข้าสู่ระบบด้วยบัญชีนักศึกษาก่อน"))
        }
        // สมัครผู้จัดไม่ต้องล็อกอิน
        assert.equal(faqs[3].link?.href, "/auth/organizer/register")
    })

    it("ผู้จัด/แอดมินไม่มีชุดคำถามสำเร็จรูป", () => {
        assert.deepEqual(chatbotFaqs("organizer"), [])
        assert.deepEqual(chatbotFaqs("admin"), [])
    })
})

describe("faqsToShow", () => {
    const faqs = chatbotFaqs("student")
    const greeting: ChatMessage = { role: "model", text: "สวัสดี" }

    it("ยังไม่ได้ถามอะไร = โชว์ครบ", () => {
        assert.equal(faqsToShow(faqs, [greeting]).length, 4)
    })

    it("หลังคำตอบสำเร็จรูป = โชว์ข้อที่เหลือ", () => {
        const msgs: ChatMessage[] = [
            greeting,
            { role: "user", text: faqs[1].question },
            { role: "model", text: faqs[1].answer, faqId: "checkin" },
        ]
        assert.deepEqual(
            faqsToShow(faqs, msgs).map((f) => f.id),
            ["register", "skills", "organizer"]
        )
    })

    it("หลังคำตอบจาก AI = ไม่โชว์", () => {
        const msgs: ChatMessage[] = [greeting, { role: "user", text: "มีกิจกรรมอะไรบ้าง" }, { role: "model", text: "..." }]
        assert.deepEqual(faqsToShow(faqs, msgs), [])
    })

    it("กำลังรอคำตอบ (ข้อความสุดท้ายเป็นของผู้ใช้) = ไม่โชว์", () => {
        const msgs: ChatMessage[] = [greeting, { role: "user", text: "ถามอะไรสักอย่าง" }]
        assert.deepEqual(faqsToShow(faqs, msgs), [])
    })
})

describe("toHistoryItem", () => {
    it("ตัด link/faqId ทิ้ง (backend forbidNonWhitelisted) และตัดข้อความเกิน 2000 ตัว", () => {
        const item = toHistoryItem({ role: "model", text: "x".repeat(2500), link: { href: "/a", label: "a" }, faqId: "register" })
        assert.deepEqual(Object.keys(item).sort(), ["role", "text"])
        assert.equal(item.text.length, 2000)
    })
})
