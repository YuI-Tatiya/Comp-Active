import { test, describe } from "node:test"
import assert from "node:assert/strict"
import {
    formatActivitySchedule,
    coverDateParts,
    roundLabel,
    formatScheduleShort,
    formatDeadline,
    closeCountdown,
    openCountdown,
    seatInfo,
    closedReason,
    pickMyRegistration,
    sessionTag,
    countOpenAlternatives,
    describeAction,
    describeSkillBenefits,
    describeVolunteer,
} from "./activity-view.ts"

const NOW = new Date("2027-01-05T03:00:00.000Z") // 10:00 น. ตามเวลาไทย

describe("formatActivitySchedule — วัน-เวลาต้องมี น. และไม่ทิ้งวันที่สองของกิจกรรมหลายวัน", () => {
    test("วันเดียว: วันในสัปดาห์ + วันที่ และช่วงเวลาลงท้ายด้วย น.", () => {
        // 09:00–12:00 น. ตามเวลาไทย (UTC+7) = 02:00–05:00 UTC
        const s = formatActivitySchedule({ startAt: "2027-01-10T02:00:00.000Z", endAt: "2027-01-10T05:00:00.000Z" })
        assert.equal(s.multiDay, false)
        assert.match(s.dateLabel, /10/)
        assert.match(s.dateLabel, /ม\.ค\./)
        assert.match(s.dateLabel, /2570/)
        assert.equal(s.timeLabel, "09:00–12:00 น.")
    })

    test("หลายวัน (เดือนเดียวกัน): ช่วงวันที่ + เวลาเริ่มวันแรก/เวลาจบวันสุดท้าย", () => {
        const s = formatActivitySchedule({ startAt: "2027-01-10T02:00:00.000Z", endAt: "2027-01-13T09:00:00.000Z" })
        assert.equal(s.multiDay, true)
        assert.equal(s.dateLabel, "10–13 ม.ค. 2570")
        assert.equal(s.timeLabel, "09:00 น. – 16:00 น.")
    })

    test("หลายวันข้ามเดือน และข้ามปี", () => {
        const crossMonth = formatActivitySchedule({ startAt: "2027-01-30T02:00:00.000Z", endAt: "2027-02-02T09:00:00.000Z" })
        assert.equal(crossMonth.dateLabel, "30 ม.ค. – 2 ก.พ. 2570")
        const crossYear = formatActivitySchedule({ startAt: "2026-12-30T02:00:00.000Z", endAt: "2027-01-02T09:00:00.000Z" })
        assert.equal(crossYear.dateLabel, "30 ธ.ค. 2569 – 2 ม.ค. 2570")
    })

    test("ใช้เวลาไทยเสมอ: 20:00 UTC เป็นเช้าวันถัดไปที่ 03:00 น.", () => {
        const s = formatActivitySchedule({ startAt: "2027-01-09T20:00:00.000Z", endAt: "2027-01-09T22:00:00.000Z" })
        assert.match(s.dateLabel, /10/)
        assert.equal(s.timeLabel, "03:00–05:00 น.")
    })

    test("เริ่มและจบเวลาเดียวกัน แสดงเวลาเดียว", () => {
        const s = formatActivitySchedule({ startAt: "2027-01-10T02:00:00.000Z", endAt: "2027-01-10T02:00:00.000Z" })
        assert.equal(s.timeLabel, "09:00 น.")
    })

    test("กิจกรรมรุ่นเก่า (ไม่มี startAt/endAt): ใช้ date + startTime/endTime แล้วเติม น.", () => {
        const s = formatActivitySchedule({ date: "2027-01-10T00:00:00.000Z", startTime: "09:00", endTime: "12:00", startAt: null, endAt: null })
        assert.equal(s.multiDay, false)
        assert.match(s.dateLabel, /10/)
        assert.equal(s.timeLabel, "09:00–12:00 น.")
    })

    test("ข้อมูลไม่ครบ: ไม่พัง คืนขีดกลาง/ว่าง", () => {
        assert.deepEqual(formatActivitySchedule({}), { dateLabel: "-", timeLabel: "", multiDay: false })
        assert.equal(formatActivitySchedule({ date: "2027-01-10T00:00:00.000Z", startTime: "09:00" }).timeLabel, "09:00 น.")
    })
})

describe("formatScheduleShort — บรรทัดเดียวบนการ์ดเลือกกิจกรรม", () => {
    test("วันเดียว: ตัดวันในสัปดาห์และปีออก", () => {
        assert.equal(formatScheduleShort({ startAt: "2027-01-10T02:00:00.000Z", endAt: "2027-01-10T05:00:00.000Z" }), "10 ม.ค. · 09:00–12:00 น.")
    })

    test("หลายวัน: แสดงช่วงวันที่เต็ม", () => {
        assert.equal(formatScheduleShort({ startAt: "2027-01-10T02:00:00.000Z", endAt: "2027-01-13T09:00:00.000Z" }), "10–13 ม.ค. 2570")
    })

    test("กิจกรรมรุ่นเก่า และข้อมูลว่าง", () => {
        assert.equal(formatScheduleShort({ date: "2027-01-10T00:00:00.000Z", startTime: "09:00", endTime: "12:00" }), "10 ม.ค. · 09:00–12:00 น.")
        assert.equal(formatScheduleShort({}), "-")
    })
})

describe("formatDeadline / closeCountdown", () => {
    test("วันปิดรับสมัครมีเวลาและ น.", () => {
        assert.equal(formatDeadline("2027-01-20T10:00:00.000Z"), "20 ม.ค. 2570 17:00 น.")
        assert.equal(formatDeadline("ไม่ใช่วันที่"), "-")
    })

    test("นับถอยหลังเป็นวัน/ชั่วโมง และไม่มีเมื่อหมดเวลาแล้วหรือไม่ได้กำหนด", () => {
        assert.equal(closeCountdown("2027-01-08T03:00:00.000Z", NOW), "อีก 3 วัน")
        assert.equal(closeCountdown("2027-01-05T08:00:00.000Z", NOW), "อีก 5 ชั่วโมง")
        assert.equal(closeCountdown("2027-01-05T03:30:00.000Z", NOW), "เหลือไม่ถึง 1 ชั่วโมง")
        assert.equal(closeCountdown("2027-01-05T02:00:00.000Z", NOW), null)
        assert.equal(closeCountdown(null, NOW), null)
    })

    test("openCountdown ใช้สูตรเดียวกัน (ระยะเวลาเหมือนกัน แค่ความหมายคนละด้าน — เปิด ไม่ใช่ปิด)", () => {
        assert.equal(openCountdown("2027-01-08T03:00:00.000Z", NOW), "อีก 3 วัน")
        assert.equal(openCountdown("2027-01-05T02:00:00.000Z", NOW), null)
        assert.equal(openCountdown(null, NOW), null)
    })
})

describe("seatInfo", () => {
    test("ไม่จำกัดจำนวน", () => {
        const s = seatInfo(null, 12)
        assert.equal(s.unlimited, true)
        assert.equal(s.level, "ok")
        assert.equal(s.label, "ไม่จำกัดจำนวน")
        assert.equal(s.shortLabel, "ไม่จำกัด")
    })

    test("เหลือมาก / เหลือน้อย (≥80%) / เต็ม", () => {
        assert.equal(seatInfo(40, 28).level, "ok")
        assert.equal(seatInfo(40, 28).label, "เหลือ 12 จาก 40 ที่นั่ง")
        assert.equal(seatInfo(40, 28).shortLabel, "เหลือ 12/40")
        assert.equal(seatInfo(40, 32).level, "low")
        assert.equal(seatInfo(40, 40).level, "full")
        assert.equal(seatInfo(40, 40).shortLabel, "เต็มแล้ว")
    })

    test("ผู้สมัครเกินโควต้าไม่ทำให้ติดลบ และ capacity 0 นับว่าเต็ม", () => {
        assert.equal(seatInfo(10, 12).remaining, 0)
        assert.equal(seatInfo(10, 12).percent, 100)
        assert.equal(seatInfo(0, 0).level, "full")
    })
})

describe("closedReason", () => {
    const open = { status: "open", approvalStatus: "approved", registrationOpenAt: null, registrationCloseAt: null }

    test("เปิดอยู่ = ไม่มีเหตุผลปิด", () => {
        assert.equal(closedReason(open, NOW), null)
        assert.equal(closedReason({ ...open, registrationCloseAt: "2027-01-20T10:00:00.000Z" }, NOW), null)
        assert.equal(closedReason({ ...open, registrationOpenAt: "2027-01-01T00:00:00.000Z" }, NOW), null)
    })

    test("เรียงความสำคัญ: ยกเลิก > จบแล้ว > ปิดรับ > ยังไม่เปิด > หมดเขต", () => {
        assert.equal(closedReason({ ...open, approvalStatus: "cancelled", status: "completed" }, NOW), "cancelled")
        assert.equal(closedReason({ ...open, status: "completed" }, NOW), "completed")
        assert.equal(closedReason({ ...open, status: "closed" }, NOW), "closed")
        assert.equal(closedReason({ ...open, registrationOpenAt: "2027-01-08T03:00:00.000Z" }, NOW), "not_yet_open")
        assert.equal(closedReason({ ...open, registrationCloseAt: "2027-01-01T00:00:00.000Z" }, NOW), "deadline_passed")
        // ยังไม่เปิดมาก่อนหมดเขตเสมอ แม้ตั้งค่าสลับกันผิดพลาดมา (backend กันไว้แล้วไม่ให้เกิดจริง)
        assert.equal(
            closedReason(
                { ...open, registrationOpenAt: "2027-01-08T03:00:00.000Z", registrationCloseAt: "2027-01-01T00:00:00.000Z" },
                NOW,
            ),
            "not_yet_open",
        )
    })

    test("ถึงเวลาเปิดพอดี = เปิดแล้ว (ไม่ใช่ยังไม่เปิด) — สมมาตรกับหมดเขตที่ถึงเวลาปิดพอดีถือว่าปิดแล้ว", () => {
        assert.equal(closedReason({ ...open, registrationOpenAt: NOW.toISOString() }, NOW), null)
    })
})

describe("pickMyRegistration — เลือกใบลงทะเบียนที่ใช้บอกสถานะของกิจกรรมนี้", () => {
    const rows = [
        { id: 1, status: "cancelled", attendance: "absent", activity: { id: 7 } },
        { id: 2, status: "pending", attendance: "absent", activity: { id: 7 } },
        { id: 3, status: "confirmed", attendance: "absent", activity: { id: 8 } },
    ]

    test("ข้ามใบที่ยกเลิก และเลือกเฉพาะกิจกรรมนี้", () => {
        assert.equal(pickMyRegistration(rows, 7)?.id, 2)
        assert.equal(pickMyRegistration(rows, 8)?.id, 3)
        assert.equal(pickMyRegistration(rows, 99), undefined)
        assert.equal(pickMyRegistration([rows[0]], 7), undefined)
    })

    test("ถ้ามีหลายใบ: เช็คอินแล้ว > ยืนยันแล้ว > รอยืนยัน", () => {
        const many = [
            { id: 1, status: "pending", attendance: "absent", activity: { id: 7 } },
            { id: 2, status: "confirmed", attendance: "attended", activity: { id: 7 } },
            { id: 3, status: "confirmed", attendance: "absent", activity: { id: 7 } },
        ]
        assert.equal(pickMyRegistration(many, 7)?.id, 2)
        assert.equal(pickMyRegistration(many.slice(0, 1).concat(many.slice(2)), 7)?.id, 3)
    })
})

describe("sessionTag — ป้ายบนปุ่มเลือกกิจกรรม", () => {
    const seat = (cap: number | null, n: number) => seatInfo(cap, n)

    test("ของฉันมาก่อนเสมอ (แม้เต็ม/ปิดแล้ว)", () => {
        assert.equal(sessionTag({ seat: seat(10, 10), closed: "completed", mine: { status: "confirmed", attendance: "attended" } }), "attended")
        assert.equal(sessionTag({ seat: seat(10, 10), closed: null, mine: { status: "confirmed", attendance: "absent" } }), "registered")
        assert.equal(sessionTag({ seat: seat(10, 3), closed: null, mine: { status: "pending", attendance: "absent" } }), "pending")
    })

    test("ปิดรับ > เต็ม > เหลือน้อย > เปิด", () => {
        assert.equal(sessionTag({ seat: seat(10, 10), closed: "deadline_passed" }), "closed")
        assert.equal(sessionTag({ seat: seat(10, 10), closed: null }), "full")
        assert.equal(sessionTag({ seat: seat(10, 9), closed: null }), "low")
        assert.equal(sessionTag({ seat: seat(null, 500), closed: null }), "open")
    })
})

describe("countOpenAlternatives", () => {
    test("นับกิจกรรมอื่นที่ยังสมัครได้ (เปิด/เหลือน้อย) ไม่นับตัวเอง", () => {
        const tags = [
            { id: 1, tag: "full" as const },
            { id: 2, tag: "open" as const },
            { id: 3, tag: "low" as const },
            { id: 4, tag: "closed" as const },
            { id: 5, tag: "registered" as const },
        ]
        assert.equal(countOpenAlternatives(tags, 1), 2)
        assert.equal(countOpenAlternatives(tags, 2), 1)
    })
})

describe("describeAction — ทุกสถานะของการ์ดสมัคร", () => {
    const base = { registrationType: "participant", seat: seatInfo(40, 10), closed: null, now: NOW, openAlternatives: 0 } as const
    const closeAt = "2027-01-08T03:00:00.000Z"

    test("เปิดรับสมัคร: ปุ่มหลักโดดเด่น + วันปิดรับพร้อมนับถอยหลัง", () => {
        const v = describeAction({ ...base, closeAt })
        assert.equal(v.kind, "open")
        assert.deepEqual(v.primary, { label: "ลงทะเบียนเข้าร่วม", disabled: false })
        assert.equal(v.headline, null)
        assert.equal(v.canCancel, false)
        assert.equal(v.deadline, "ปิดรับสมัคร 8 ม.ค. 2570 10:00 น. (อีก 3 วัน)")
    })

    test("ข้อความปุ่มตามประเภทการสมัคร", () => {
        assert.equal(describeAction({ ...base, registrationType: "staff_volunteer" }).primary?.label, "สมัครเป็นสตาฟฟ์")
        assert.equal(describeAction({ ...base, registrationType: "contestant" }).primary?.label, "ลงทะเบียนเข้าแข่งขัน")
        assert.equal(describeAction({ ...base, registrationType: undefined }).primary?.label, "ลงทะเบียนเข้าร่วม")
    })

    test("รอผู้จัดยืนยัน: สีเหลือง ไม่ใช่เขียว ไม่มีปุ่มหลัก ยกเลิกคำขอได้", () => {
        const v = describeAction({ ...base, mine: { status: "pending", attendance: "absent" } })
        assert.equal(v.kind, "pending")
        assert.equal(v.tone, "warning")
        assert.equal(v.headline, "ส่งคำขอแล้ว — รอผู้จัดยืนยัน")
        assert.equal(v.primary, null)
        assert.equal(v.canCancel, true)
        assert.equal(v.cancelLabel, "ยกเลิกคำขอ")
    })

    test("ลงทะเบียนสำเร็จ: เขียว + ยกเลิกเป็นปุ่มรอง + ลิงก์ไปกิจกรรมของฉัน", () => {
        const v = describeAction({ ...base, mine: { status: "confirmed", attendance: "absent" } })
        assert.equal(v.kind, "registered")
        assert.equal(v.tone, "success")
        assert.equal(v.headline, "ลงทะเบียนสำเร็จ")
        assert.equal(v.primary, null)
        assert.equal(v.canCancel, true)
        assert.equal(v.cancelLabel, "ยกเลิกการลงทะเบียน")
        assert.equal(v.link?.label, "ดูในกิจกรรมของฉัน")
    })

    test("เช็คอินแล้ว: ห้ามยกเลิก (server ห้ามอยู่แล้ว) และไม่แสดงปุ่มสมัคร", () => {
        const v = describeAction({ ...base, mine: { status: "confirmed", attendance: "attended" } })
        assert.equal(v.kind, "attended")
        assert.equal(v.tone, "info")
        assert.equal(v.canCancel, false)
        assert.equal(v.primary, null)
    })

    test("สมัครไว้แล้วแต่กิจกรรมจบ/ถูกยกเลิก: ยกเลิกการสมัครไม่ได้", () => {
        assert.equal(describeAction({ ...base, closed: "completed", mine: { status: "confirmed", attendance: "absent" } }).canCancel, false)
        assert.equal(describeAction({ ...base, closed: "cancelled", mine: { status: "pending", attendance: "absent" } }).canCancel, false)
    })

    test("เต็มแล้ว: ปุ่มปิดใช้งาน + ชวนดูกิจกรรมอื่นที่ยังว่าง (บอกเหตุผลที่ปุ่ม ไม่ทำแบนเนอร์ซ้ำ)", () => {
        const v = describeAction({ ...base, seat: seatInfo(40, 40), openAlternatives: 2 })
        assert.equal(v.kind, "full")
        assert.equal(v.headline, null)
        assert.equal(v.detail, "หากมีผู้ยกเลิก ที่นั่งอาจว่างอีกครั้ง")
        assert.deepEqual(v.primary, { label: "เต็มแล้ว", disabled: true })
        assert.equal(v.alternativesHint, "ดูกิจกรรมอื่นที่ยังว่าง (2)")
        assert.equal(describeAction({ ...base, seat: seatInfo(40, 40), openAlternatives: 0 }).alternativesHint, null)
    })

    test("ปิดรับ: บอกเหตุผลตรงๆ ตามสาเหตุ", () => {
        const label = (closed: "cancelled" | "completed" | "closed" | "not_yet_open" | "deadline_passed") =>
            describeAction({ ...base, closed }).primary?.label
        assert.equal(label("deadline_passed"), "หมดเขตรับสมัคร")
        assert.equal(label("completed"), "กิจกรรมจบแล้ว")
        assert.equal(label("cancelled"), "กิจกรรมถูกยกเลิก")
        assert.equal(label("closed"), "ปิดรับสมัคร")
        assert.equal(label("not_yet_open"), "ยังไม่เปิดรับสมัคร")
        assert.equal(describeAction({ ...base, closed: "deadline_passed" }).primary?.disabled, true)
        assert.equal(describeAction({ ...base, closed: "deadline_passed" }).kind, "closed")
        assert.equal(describeAction({ ...base, closed: "deadline_passed" }).headline, null)
    })

    test("ปิดรับสมัครทับเต็ม: ถ้าปิดแล้วให้บอกว่าปิด ไม่ใช่เต็ม", () => {
        assert.equal(describeAction({ ...base, seat: seatInfo(40, 40), closed: "closed" }).kind, "closed")
    })

    test("ยังไม่เปิดรับสมัคร: ปุ่มปิดใช้งาน + บอกวันเวลาที่จะเปิดพร้อมนับถอยหลัง (ต่างจากเหตุผลปิดอื่นที่ไม่มี detail)", () => {
        const openAt = "2027-01-08T03:00:00.000Z"
        const v = describeAction({ ...base, closed: "not_yet_open", openAt })
        assert.deepEqual(v.primary, { label: "ยังไม่เปิดรับสมัคร", disabled: true })
        assert.equal(v.detail, "เปิดรับสมัคร 8 ม.ค. 2570 10:00 น. (อีก 3 วัน)")
        // ไม่มี openAt ส่งมา (เช่น ข้อมูลเก่า) — ไม่พัง แค่ไม่มี detail ให้
        assert.equal(describeAction({ ...base, closed: "not_yet_open" }).detail, null)
    })
})

describe("describeSkillBenefits — แปลงตัวเลขระดับเป็นภาษาที่นักศึกษาเข้าใจ", () => {
    test("1/2/3 → ผ่าน/ดี/ดีเยี่ยม พร้อมจำนวนจุด 1/2/3 ไม่มีคำว่า น้ำหนัก", () => {
        const out = describeSkillBenefits([
            { skillType: "communication", rate: 1 },
            { skillType: "leadership", rate: 2 },
            { skillType: "creativity", rate: 3 },
        ])
        assert.deepEqual(out.map((s) => [s.levelLabel, s.dots]), [["ผ่าน", 1], ["ดี", 2], ["ดีเยี่ยม", 3]])
        assert.ok(out.every((s) => !/น้ำหนัก/.test(s.levelLabel)))
    })

    test("ข้อมูลรุ่นเก่าที่ไม่ใช่ 1/2/3 ไม่พัง", () => {
        const [legacy] = describeSkillBenefits([{ skillType: "communication", rate: 4 }])
        assert.equal(legacy.levelLabel, "ระดับ 4")
        assert.ok(legacy.dots >= 1 && legacy.dots <= 3)
    })

    test("ไม่มีทักษะ / ไม่มี rate", () => {
        assert.deepEqual(describeSkillBenefits(undefined), [])
        assert.deepEqual(describeSkillBenefits([{ skillType: "communication" }]).map((s) => s.dots), [0])
    })
})

describe("describeVolunteer — เงื่อนไขชั่วโมงจิตอาสาต้องชัด", () => {
    test("แจกชั่วโมง: จำนวน + บทบาท + เงื่อนไข", () => {
        const v = describeVolunteer({ volunteerRole: "ฝ่ายลงทะเบียน", volunteerHours: "3.00" })
        assert.equal(v.gives, true)
        assert.equal(v.hoursLabel, "3 ชม.")
        assert.equal(v.role, "ฝ่ายลงทะเบียน")
        assert.match(v.condition, /เช็คอิน/)
        assert.match(v.loanNote ?? "", /กยศ\./)
    })

    test("ชั่วโมงทศนิยม", () => {
        assert.equal(describeVolunteer({ volunteerRole: "x", volunteerHours: "2.50" }).hoursLabel, "2.5 ชม.")
    })

    test("ไม่ออกใบรับรอง", () => {
        const v = describeVolunteer({ volunteerRole: null, volunteerHours: null })
        assert.equal(v.gives, false)
        assert.equal(v.hoursLabel, null)
        assert.equal(v.loanNote, null)
    })

    test("มีบทบาทแต่ยังไม่ระบุชั่วโมง: ยังบอกว่าออกใบรับรอง แต่ไม่โชว์ตัวเลข", () => {
        const v = describeVolunteer({ volunteerRole: "x", volunteerHours: null })
        assert.equal(v.gives, true)
        assert.equal(v.hoursLabel, null)
    })
})

describe("coverDateParts — วันที่ตัวใหญ่บนปก", () => {
    test("วัน 2 หลัก + เดือนย่อและปีเต็ม + ชื่อวันย่อ ตามเวลาไทย", () => {
        assert.deepEqual(coverDateParts({ startAt: "2026-10-04T22:30:00.000Z", endAt: "2026-10-05T01:00:00.000Z" }), {
            day: "05",
            monthYear: "ต.ค. 2569",
            weekday: "จ.",
        })
    })

    test("กิจกรรมรุ่นเก่าใช้ date และไม่มีวันที่เลยคืน null", () => {
        assert.deepEqual(coverDateParts({ date: "2026-10-18T00:00:00.000Z" }), { day: "18", monthYear: "ต.ค. 2569", weekday: "อา." })
        assert.equal(coverDateParts({}), null)
    })
})

describe("roundLabel", () => {
    test("ลำดับจาก 0 เป็นรหัสรอบ 2 หลัก", () => {
        assert.equal(roundLabel(0), "ROUND_01")
        assert.equal(roundLabel(11), "ROUND_12")
    })
})
