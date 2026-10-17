// lib/events-filter.test.ts
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import type { Activity, EventSummary } from "./api.ts"
import { buildFeaturedCards, eventImagePath, facetCounts, filterAndSortItems, groupByCategory, INITIAL_FILTERS } from "./events-filter.ts"

const HREFS = { event: (id: string) => `/events/${id}`, activity: (id: string) => `/events/activities/${id}` }

function subActivity(overrides: Record<string, unknown> = {}) {
    const merged = {
        id: 1,
        name: "Day 1",
        categories: ["Technology"],
        status: "open",
        date: "2026-11-20T00:00:00.000Z",
        capacity: 10,
        registeredCount: 0,
        volunteerRole: null,
        ...overrides,
    }
    // publicId ตาม id เสมอ (จำลองพฤติกรรมจริง: publicId คู่กับ id แถวเดียวกันตลอด)
    return { ...merged, publicId: (overrides.publicId as string | undefined) ?? String(merged.id) }
}

function event(id: number, activities: Record<string, unknown>[], overrides: Record<string, unknown> = {}) {
    return {
        id,
        publicId: String(id),
        name: `Event ${id}`,
        description: "d",
        createdAt: "2026-10-01T00:00:00.000Z",
        registrationOpenAt: null,
        registrationCloseAt: null,
        activities,
        ...overrides,
    } as unknown as EventSummary
}

function standalone(id: number, overrides: Record<string, unknown> = {}) {
    return { ...subActivity({ id, name: `Solo ${id}` }), eventId: null, description: "d", ...overrides } as unknown as Activity
}

describe("buildFeaturedCards", () => {
    test("งานหนึ่งงาน = การ์ดเดียว รวมหมวดหมู่ของทุกกิจกรรมย่อย และใช้วันแรก-วันสุดท้ายเป็นช่วงวันที่", () => {
        const [card] = buildFeaturedCards(
            [
                event(1, [
                    subActivity({ id: 10, categories: ["Technology"], date: "2026-11-21T00:00:00.000Z" }),
                    subActivity({ id: 11, categories: ["Academic", "Technology"], date: "2026-11-20T00:00:00.000Z" }),
                ]),
            ],
            [],
            HREFS
        )
        assert.equal(card.key, "event-1")
        assert.equal(card.href, "/events/1")
        assert.deepEqual(card.categories, ["Technology", "Academic"])
        assert.equal(card.sortDate, Date.parse("2026-11-20T00:00:00.000Z"))
        assert.equal(card.endDate, Date.parse("2026-11-21T00:00:00.000Z"))
    })

    test("งานเปิดรับสมัครถ้ามีกิจกรรมย่อยตัวใดตัวหนึ่งเปิดอยู่", () => {
        const cards = buildFeaturedCards(
            [
                event(1, [subActivity({ status: "closed" }), subActivity({ status: "open" })]),
                event(2, [subActivity({ status: "closed" })]),
            ],
            [],
            HREFS
        )
        assert.deepEqual(
            cards.map((c) => c.status),
            ["open", "closed"]
        )
    })

    // หน้ารายการเต็มเรียง "ที่นั่งว่าง: เหลือเยอะก่อน" จากค่านี้ — เดิม builder ตั้ง null ให้ทุกงาน (= ไม่จำกัด)
    test("ที่นั่งคงเหลือของงาน = ความจุรวม − ผู้ลงทะเบียนรวม ไม่ติดลบ และ null เมื่อมีกิจกรรมย่อยไม่จำกัดจำนวน", () => {
        const cards = buildFeaturedCards(
            [
                event(1, [subActivity({ capacity: 10, registeredCount: 4 }), subActivity({ capacity: 5, registeredCount: 5 })]),
                event(2, [subActivity({ capacity: 3, registeredCount: 9 })]),
                event(3, [subActivity({ capacity: 10 }), subActivity({ capacity: null })]),
            ],
            [],
            HREFS
        )
        assert.deepEqual(
            cards.map((c) => c.seats),
            [6, 0, null]
        )
    })

    test("กิจกรรมเดี่ยวได้การ์ดของตัวเอง ส่วนกิจกรรมย่อยของงาน (มี eventId) ถูกตัดทิ้ง ไม่ซ้ำกับการ์ดงาน", () => {
        const cards = buildFeaturedCards(
            [event(1, [subActivity({ id: 10 })])],
            [standalone(20, { capacity: 8, registeredCount: 3 }), standalone(10, { eventId: 1 })],
            HREFS
        )
        assert.deepEqual(
            cards.map((c) => c.key),
            ["event-1", "activity-20"]
        )
        const solo = cards[1]
        assert.equal(solo.href, "/events/activities/20")
        assert.equal(solo.seats, 5)
        assert.equal(solo.endDate, solo.sortDate)
        assert.equal(solo.registrationOpenAt, null)
    })
})

describe("filterAndSortItems + groupByCategory", () => {
    const cards = buildFeaturedCards(
        [
            event(1, [subActivity({ capacity: 10, registeredCount: 9 })]),
            event(2, [subActivity({ capacity: null })]),
            event(3, [subActivity({ capacity: 10, registeredCount: 2, categories: ["Academic"] })]),
        ],
        [],
        HREFS
    )

    test("เรียงที่นั่งว่างมากก่อน — ไม่จำกัดจำนวนขึ้นบนสุด", () => {
        const sorted = filterAndSortItems(cards, { ...INITIAL_FILTERS, sort: "seats" })
        assert.deepEqual(
            sorted.map((c) => c.key),
            ["event-2", "event-3", "event-1"]
        )
    })

    test("จัดกลุ่มตามหมวดหมู่ตามลำดับใน CATEGORIES และตัดกลุ่มว่างทิ้ง", () => {
        const groups = groupByCategory(cards)
        assert.deepEqual(
            groups.map((g) => [g.category.value, g.items.map((c) => c.key)]),
            [
                ["Technology", ["event-1", "event-2"]],
                ["Academic", ["event-3"]],
            ]
        )
    })
})

describe("facetCounts — ตัวเลขข้างตัวเลือกในแผงตัวกรอง", () => {
    const cards = buildFeaturedCards(
        [
            event(1, [subActivity({ categories: ["Technology", "Competition"] })]),
            event(2, [subActivity({ categories: ["Technology"], status: "closed" })]),
            event(3, [subActivity({ categories: ["Academic"] }), subActivity({ categories: ["Academic"] })]),
        ],
        [],
        HREFS
    )

    test("ไม่มีตัวกรอง: นับการ์ดต่อหมวด (การ์ดหลายหมวดนับทุกหมวด แต่ไม่นับซ้ำในหมวดเดียวกัน) และต่อสถานะ", () => {
        const counts = facetCounts(cards, INITIAL_FILTERS)
        assert.equal(counts.categories.Technology, 2)
        assert.equal(counts.categories.Competition, 1)
        assert.equal(counts.categories.Academic, 1)
        assert.equal(counts.categories.Sports, 0)
        assert.deepEqual(counts.statuses, { open: 2, closed: 1 })
    })

    test("ตัวเลขหมวดไม่ถูกตัวกรองหมวดเอง แต่ตามตัวกรองอื่น (สถานะ)", () => {
        const counts = facetCounts(cards, { ...INITIAL_FILTERS, categories: ["Academic"], statuses: ["open"] })
        // ติ๊ก "วิชาการ" ไว้ — หมวดอื่นยังบอกจำนวนที่จะได้ถ้าติ๊กเพิ่ม (นับเฉพาะที่เปิดรับสมัคร)
        assert.equal(counts.categories.Technology, 1)
        assert.equal(counts.categories.Academic, 1)
        // ตัวเลขสถานะคิดจากหมวดที่ติ๊ก แต่ไม่ถูกตัวกรองสถานะเอง
        assert.deepEqual(counts.statuses, { open: 1, closed: 0 })
    })
})

describe("eventImagePath — รูปที่การ์ดใช้ (ไม่มี = ลายปกของธีม)", () => {
    test("รูปหน้าปกงานมาก่อนรูปของกิจกรรมย่อย", () => {
        const ev = event(1, [subActivity({ imageUrl: "/uploads/activities/sub.jpg" })], { imageUrl: "/uploads/activities/cover.jpg" })
        assert.equal(eventImagePath(ev), "/uploads/activities/cover.jpg")
    })

    test("ไม่มีรูปหน้าปก ใช้รูปของกิจกรรมย่อยที่จัดเร็วสุด", () => {
        const ev = event(1, [
            subActivity({ id: 10, date: "2026-11-22T00:00:00.000Z", imageUrl: "/uploads/activities/late.jpg" }),
            subActivity({ id: 11, date: "2026-11-20T00:00:00.000Z", imageUrl: "/uploads/activities/early.jpg" }),
        ])
        assert.equal(eventImagePath(ev), "/uploads/activities/early.jpg")
    })

    test("ไม่มีรูปเลย (หรือเป็นสตริงว่าง) คืน null — การ์ดจะใช้ลายปกแทน", () => {
        assert.equal(eventImagePath(event(1, [subActivity()])), null)
        assert.equal(eventImagePath(event(1, [subActivity({ imageUrl: "" })], { imageUrl: "" })), null)
    })

    test("buildFeaturedCards ส่งรูปตามกติกาเดียวกัน ทั้งการ์ดงานและกิจกรรมเดี่ยว", () => {
        const cards = buildFeaturedCards(
            [event(1, [subActivity({ imageUrl: "/uploads/activities/sub.jpg" })])],
            [standalone(20, { imageUrl: "/uploads/activities/solo.jpg" }), standalone(21)],
            HREFS
        )
        assert.deepEqual(
            cards.map((c) => c.imageUrl),
            ["/uploads/activities/sub.jpg", "/uploads/activities/solo.jpg", null]
        )
    })
})
