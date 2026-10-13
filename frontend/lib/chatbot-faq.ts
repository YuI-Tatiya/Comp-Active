/**
 * คำถามที่พบบ่อยของแชทผู้ช่วย (MascotWidget) — ตอบด้วยข้อความที่เขียนไว้แล้ว ไม่ได้ส่งไปถาม AI
 *
 * เหตุผล: system prompt ฝั่ง backend (chatbot.service.ts) ไม่ได้ลงรายละเอียดขั้นตอนจริงของเว็บไว้ (เช่น QR เปลี่ยน
 * ทุก 5 นาที, เช็คอินได้เฉพาะมือถือ) ถ้าส่งคำถามพวกนี้ไปให้ AI จะได้คำตอบกว้างๆ หรือ "ไม่แน่ใจ" — ตอบเองตรงนี้แม่นกว่า
 * ขึ้นทันที ไม่เสียโควตา API และใช้ได้แม้ backend ยังไม่ได้ตั้ง API key ส่วนคำถามที่พิมพ์เองยังไปถาม AI ตามเดิม
 *
 * ⚠️ ข้อความอ้างอิงชื่อปุ่ม/เมนูจริงในหน้าเว็บ — เปลี่ยนชื่อปุ่ม/ขั้นตอนเมื่อไรต้องแก้ที่นี่ด้วย
 *
 * ไฟล์ล้วน (ไม่แตะ React/DOM) ทดสอบด้วย `npm test` — ดู chatbot-faq.test.ts
 */

export interface FaqLink {
    href: string
    label: string
}

export interface ChatFaq {
    id: string
    question: string
    answer: string
    link?: FaqLink
}

/** ผู้ใช้ที่ยังไม่ล็อกอินต้องไปหน้าเข้าสู่ระบบก่อน — หน้าฝั่งนักศึกษาทั้งหมดมี RoleGuard */
const LOGIN_LINK: FaqLink = { href: "/auth", label: "เข้าสู่ระบบ / ลงทะเบียน" }
const LOGIN_FIRST = "ต้องเข้าสู่ระบบด้วยบัญชีนักศึกษาก่อนค่ะ แล้วทำตามนี้\n"

/**
 * รายการคำถามตามบทบาท — นักศึกษาและผู้ที่ยังไม่ล็อกอินเห็นชุดเดียวกัน (ต่างกันแค่ลิงก์ปลายทาง)
 * ผู้จัด/แอดมินไม่มีชุดคำถามสำเร็จรูป (คำถามชุดนี้เป็นเรื่องของนักศึกษา) พิมพ์ถาม AI ได้ตามปกติ
 */
export function chatbotFaqs(role: string | null | undefined): ChatFaq[] {
    if (role && role !== "student") return []
    const student = role === "student"

    return [
        {
            id: "register",
            question: "ลงทะเบียนเข้าร่วมกิจกรรมอย่างไร",
            answer:
                (student ? "" : LOGIN_FIRST) +
                [
                    "1. ไปที่เมนู “กิจกรรมทั้งหมด” แล้วเลือกกิจกรรมที่สนใจ",
                    "2. ถ้างานมีหลายรอบ ให้เลือกรอบที่ต้องการก่อน",
                    "3. กด “ลงทะเบียนเข้าร่วม” (ถ้ามีคำถามเพิ่มเติมให้ตอบให้ครบ)",
                    "4. รอผู้จัดยืนยันที่นั่ง ติดตามสถานะได้ที่เมนู “กิจกรรมของฉัน”",
                    "",
                    "ลงทะเบียนได้เฉพาะช่วงที่กิจกรรมเปิดรับสมัครนะคะ",
                ].join("\n"),
            link: student ? { href: "/student/events", label: "ไปที่กิจกรรมทั้งหมด" } : LOGIN_LINK,
        },
        {
            id: "checkin",
            question: "เช็คอินด้วย QR Code ทำอย่างไร",
            answer:
                (student ? "" : LOGIN_FIRST) +
                [
                    "วันจัดกิจกรรม ผู้จัดจะแสดง QR Code ที่หน้างานค่ะ",
                    "1. ต้องได้รับการยืนยันที่นั่งก่อน (สถานะ “ยืนยันแล้ว”)",
                    "2. สแกน QR ด้วยกล้องมือถือได้เลย หรือเปิดเมนู “กิจกรรมของฉัน” แล้วกด “ถ่ายรูป QR เพื่อเช็คอิน” ที่การ์ดกิจกรรมนั้น",
                    "3. ขึ้น “เช็คอินสำเร็จ!” แปลว่าเรียบร้อย สถานะจะเปลี่ยนเป็น “ประเมินแล้ว”",
                    "",
                    "เช็คอินด้วย QR ได้เฉพาะบนมือถือหรือ iPad และ QR จะเปลี่ยนทุก 5 นาที ต้องสแกนจากหน้างานเท่านั้นนะคะ",
                ].join("\n"),
            link: student ? { href: "/student/my-registrations", label: "ไปที่กิจกรรมของฉัน" } : LOGIN_LINK,
        },
        {
            id: "skills",
            question: "ดูคะแนน Soft Skills ของฉันได้ที่ไหน",
            answer:
                (student ? "" : LOGIN_FIRST) +
                [
                    "ดูได้ 2 ที่ค่ะ",
                    "• หน้าหลัก — สรุปคะแนนเฉลี่ยครบทั้ง 12 ทักษะ",
                    "• หน้าโปรไฟล์ แท็บ “Soft Skills” — กราฟเรดาร์ ผลประเมินรายกิจกรรม และปุ่มส่งออกเอกสารรับรอง (PDF)",
                    "",
                    "คะแนนจะขึ้นหลังเช็คอินกิจกรรม ส่วนกิจกรรมที่ประเมินรอบด้านจะขึ้นหลังผู้จัดอนุมัติผลนะคะ",
                ].join("\n"),
            link: student ? { href: "/student/profile", label: "ไปที่โปรไฟล์ของฉัน" } : LOGIN_LINK,
        },
        {
            id: "organizer",
            question: "อยากสมัครเป็นผู้จัดกิจกรรม",
            answer: [
                "สมัครได้ที่หน้า “สมัครเป็นผู้จัดกิจกรรม” ค่ะ",
                "1. กรอกข้อมูลผู้จัด/หน่วยงานและอีเมลให้ครบ แล้วส่งคำขอ",
                "2. ทีมงานตรวจสอบคำขอ",
                "3. เมื่ออนุมัติแล้ว จะได้รับอีเมลแจ้งชื่อผู้ใช้และรหัสผ่านสำหรับเข้าสู่ระบบ",
                "",
                "บัญชีผู้จัดเป็นคนละบัญชีกับบัญชีนักศึกษา และใช้งานได้ตามระยะเวลาที่ผู้ดูแลระบบกำหนดค่ะ",
            ].join("\n"),
            link: { href: "/auth/organizer/register", label: "ไปที่หน้าสมัครผู้จัด" },
        },
    ]
}

/** ข้อความในบทสนทนา — link/faqId ใช้แค่ในหน้าจอ ห้ามส่งไป backend (ดู toHistoryItem) */
export interface ChatMessage {
    role: "user" | "model"
    text: string
    link?: FaqLink
    /** ตั้งไว้บนคำตอบสำเร็จรูป — ใช้ตัดสินว่าจะโชว์ปุ่มคำถามที่เหลือต่อท้ายไหม */
    faqId?: string
}

/** ต้องตรงกับ @MaxLength(2000) ของ ChatHistoryItemDto ฝั่ง backend */
const HISTORY_TEXT_MAX = 2000

/**
 * แปลงเป็นรูปแบบที่ backend รับ — DTO ใช้ ValidateNested + forbidNonWhitelisted ส่ง field เกินมา (link/faqId)
 * จะโดนตีกลับ 400 ทั้งคำขอ และตัดข้อความยาวเกินไว้ (คำตอบจาก AI ยาวเกิน 2000 ได้ ส่งกลับไปเป็นประวัติจะโดนปฏิเสธ)
 */
export function toHistoryItem(m: ChatMessage): { role: "user" | "model"; text: string } {
    return { role: m.role, text: m.text.slice(0, HISTORY_TEXT_MAX) }
}

/**
 * ปุ่มคำถามที่จะโชว์ต่อท้ายบทสนทนา — ก่อนผู้ใช้ถามอะไรเลย หรือหลังคำตอบสำเร็จรูป (ให้กดข้อถัดไปได้ต่อ)
 * ข้อที่ถามไปแล้วไม่โชว์ซ้ำ หลังคำตอบจาก AI ไม่โชว์ (กำลังคุยเรื่องอื่นอยู่ ปุ่มจะรกเปล่าๆ)
 */
export function faqsToShow(faqs: ChatFaq[], messages: ChatMessage[]): ChatFaq[] {
    const last = messages[messages.length - 1]
    const hasUserMessage = messages.some((m) => m.role === "user")
    if (hasUserMessage && !(last?.role === "model" && last.faqId)) return []
    const asked = new Set(messages.map((m) => m.faqId).filter(Boolean))
    return faqs.filter((f) => !asked.has(f.id))
}
