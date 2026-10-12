"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, CalendarX } from "lucide-react"
import { Container } from "@/components/layout/container"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { ACTIVITY_GRID, ActivityCardSkeleton, DenimSectionHeading } from "@/components/denim/denim-ui"
import { PublicHero } from "@/components/home/home-hero"
import { PublicActivityCard } from "@/components/denim/public-activity-card"
import { NewsShowcase } from "@/components/home/news-showcase"
import { SkillsShowcase } from "@/components/home/skills-showcase"
import { activitiesAPI, eventsAPI, Activity } from "@/lib/api"
import { CATEGORIES } from "@/lib/categories"
import { buildFeaturedCards, type FeaturedCardItem } from "@/lib/events-filter"
import { cn } from "@/lib/utils"

/** หน้าแรกฝั่ง public (ก่อนล็อกอิน) — ธีม Denim Varsity ชุดเดียวกับพอร์ทัลผู้จัด */
export default function RootPage() {
  const [items, setItems] = useState<FeaturedCardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>("")

  useEffect(() => {
    loadActivities()
  }, [])

  async function loadActivities() {
    try {
      setLoading(true)
      // งานหนึ่งงาน (มีกิจกรรมย่อยกี่ตัวก็ตาม) ต้องแสดงเป็นการ์ดเดียว จึงต้องดึงทั้ง Event และ
      // กิจกรรมเดี่ยวมารวมกัน ไม่ใช่ดึงแค่ activitiesAPI.getAll() ที่คืนกิจกรรมย่อยแยกเป็นรายตัว
      const [events, standalone] = await Promise.all([
        eventsAPI.getAllPublic(),
        activitiesAPI.getAll().catch(() => [] as Activity[]),
      ])
      const all = buildFeaturedCards(
        Array.isArray(events) ? events : [],
        Array.isArray(standalone) ? standalone : [],
        { event: (id) => `/events/${id}`, activity: (id) => `/events/activities/${id}` }
      )
      setItems(all)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // หัวข้อคือ "กำลังเปิดรับสมัคร" — เอาเฉพาะที่เปิดอยู่จริง เดิมเรียงตามวันแล้วตัด 3 อันแรกโดยไม่ดูสถานะ
  // งานเก่าที่ปิดไปแล้ว (วันจัดเร็วสุด) จึงขึ้นมาแทนที่งานที่เปิดรับอยู่
  const filteredItems = items
    .filter((i) => i.status === "open" && (!category || i.categories.includes(category)))
    .sort((a, b) => a.sortDate - b.sortDate)
    .slice(0, 3)

  const categoryTabs = [{ value: "", label: "ทั้งหมด" }, ...CATEGORIES.map((c) => ({ value: c.value, label: c.label }))]

  return (
    <div className="flex min-h-screen flex-col bg-denim-paper font-plex text-denim-deep">
      <SiteHeader />

      <main className="flex-1">
        <PublicHero />

        {/* ── กำลังเปิดรับสมัคร ─────────────────────────────────────────────── */}
        <section aria-labelledby="open-heading">
          <Container className="flex flex-col gap-6 py-16">
            <DenimSectionHeading
              id="open-heading"
              comment="events.filter(open)"
              title="กำลังเปิดรับสมัคร"
              action={
                <Link
                  href="/events"
                  className="inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-denim transition-colors hover:text-denim-deep"
                >
                  ดูทั้งหมด
                  <ArrowRight className="size-[18px]" aria-hidden="true" />
                </Link>
              }
            />

            <div role="group" aria-label="กรองตามหมวดหมู่" className="flex flex-wrap gap-2">
              {categoryTabs.map((cat) => {
                const active = category === cat.value
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    aria-pressed={active}
                    className={cn(
                      "min-h-10 rounded-full border-[1.5px] px-4 text-sm transition-colors",
                      active
                        ? "border-denim bg-denim font-semibold text-white"
                        : "border-denim-line bg-white font-medium text-denim-ink hover:border-denim-dash hover:text-denim-deep"
                    )}
                  >
                    {cat.label}
                  </button>
                )
              })}
            </div>

            {loading ? (
              <div className={ACTIVITY_GRID}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <ActivityCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredItems.length > 0 ? (
              <div className={ACTIVITY_GRID}>
                {filteredItems.map((item) => (
                  <PublicActivityCard key={item.key} item={item} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-[22px] border-2 border-dashed border-denim-dash bg-white px-6 py-14 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-denim-chip" aria-hidden="true">
                  <CalendarX className="size-6 text-denim" />
                </span>
                <h3 className="font-display text-lg font-bold text-denim-deep">
                  {category ? "ไม่พบกิจกรรมในหมวดหมู่นี้" : "ยังไม่มีกิจกรรมเปิดรับสมัครในตอนนี้"}
                </h3>
                <p className="max-w-sm text-sm text-denim-muted">
                  {category ? "ลองเลือกหมวดหมู่อื่น หรือดูกิจกรรมทั้งหมด" : "กิจกรรมใหม่จะขึ้นที่นี่ทันทีที่ผู้จัดเปิดรับสมัคร"}
                </p>
                {category && (
                  <button
                    type="button"
                    onClick={() => setCategory("")}
                    className="mt-2 inline-flex min-h-11 items-center rounded-xl border-[1.5px] border-denim px-5 text-sm font-semibold text-denim transition-colors hover:bg-denim hover:text-white"
                  >
                    ดูทั้งหมด
                  </button>
                )}
              </div>
            )}
          </Container>
        </section>

        <NewsShowcase />
        <SkillsShowcase />
      </main>

      <SiteFooter />
    </div>
  )
}
