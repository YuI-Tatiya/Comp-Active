"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { EventCard, EventCardBadge, EventCardRow, formatEventDateRange, formatRegistrationWindow } from "@/components/ui/event-card"
import { EVENT_CARD_GRID } from "@/components/ui/event-card-layout"
import { ActivityCardSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { activitiesAPI, eventsAPI, Activity } from "@/lib/api"
import { CATEGORIES, categoriesBadgeLabel } from "@/lib/categories"
import { buildFeaturedCards, type FeaturedCardItem } from "@/lib/events-filter"
import { SOFT_SKILLS } from "@/lib/soft-skills"
import {
  ArrowRight,
  Calendar,
  CalendarClock,
  CalendarX,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { NewsCarousel } from "@/components/ui/news-carousel"


export default function RootPage() {
  const [items, setItems] = useState<FeaturedCardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>("")
  const skillsScrollRef = useRef<HTMLDivElement>(null)

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

  const filteredItems = (category ? items.filter((i) => i.categories.includes(category)) : items)
    .slice()
    .sort((a, b) => a.sortDate - b.sortDate)
    .slice(0, 3)

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* ── Hero (asymmetric, light) ─────────────────────────────────────── */}
      <section className="hero-sky relative isolate overflow-hidden">
        {/* แสงและวงกลมลอยช้า ๆ ด้านหลังภาพ */}
        <div
          className="pointer-events-none absolute right-[5%] top-[4%] hidden h-[28rem] w-[28rem] rounded-full bg-white/60 blur-3xl lg:block"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-10 bottom-[8%] hidden h-64 w-64 rounded-full bg-sky-300/35 blur-3xl lg:block"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute right-[29%] top-[17%] hidden h-36 w-36 rounded-full bg-cyan-100/60 blur-2xl lg:block"
          aria-hidden="true"
        />

        {/* ภาพ — ชิดขอบขวาจริงของจอ ไม่ผูกกับ padding/max-width ของ Container */}
        <div className="hidden isolate lg:absolute lg:right-0 lg:top-1/2 lg:z-0 lg:block lg:w-full lg:max-w-[58rem] lg:-translate-y-1/2">
          {/* สปอตไลท์อบอุ่นด้านหลัง — เพิ่มความอลังการ ให้ภาพเป็นจุดเด่นเหมือนถูกจัดแสง */}
          <div
            className="pointer-events-none absolute inset-[-26%] z-0 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(255,247,224,0.85) 0%, rgba(191,219,254,0.4) 45%, transparent 72%)",
            }}
            aria-hidden="true"
          />
          {/* การ์ดแสงโค้งมนด้านหลัง — กรอบสีฟ้าเอียงเล็กน้อยโผล่มุมขวาบน ให้เข้ากับโทนเว็บ */}
          <div
            className="pointer-events-none absolute inset-[-12%] z-0 rotate-[-5deg] rounded-[3rem] bg-gradient-to-br from-sky-200/60 via-blue-100/50 to-white/30 blur-2xl"
            aria-hidden="true"
          />
          {/* เงาเวทีใต้ภาพ — สองชั้น ให้รู้สึกยิ่งใหญ่ลอยเด่นจากพื้น */}
          <div
            className="pointer-events-none absolute bottom-[6%] left-1/2 z-0 h-14 w-[78%] -translate-x-1/2 rounded-[50%] bg-slate-900/30 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-[9%] left-1/2 z-0 h-6 w-[45%] -translate-x-1/2 rounded-[50%] bg-slate-900/25 blur-xl"
            aria-hidden="true"
          />
          <Image
            src="/college.svg"
            alt="วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น"
            width={620}
            height={413}
            className="relative z-10 h-auto w-full [filter:brightness(1.06)_contrast(1.12)_saturate(1.22)_drop-shadow(0_8px_8px_rgba(15,23,42,0.12))_drop-shadow(0_28px_22px_rgba(15,23,42,0.18))_drop-shadow(0_56px_40px_rgba(15,23,42,0.16))]"
            priority
          />
        </div>

        <Container className="relative z-10 pt-16 pb-16 md:pt-24 md:pb-24">
          <div className="relative">
            <div className="max-w-3xl lg:relative lg:z-20 lg:max-w-xl">
              <p className="mb-3 flex items-center gap-2.5 text-sm font-medium tracking-wide text-slate-500">
                <span className="h-px w-6 bg-slate-900/15" aria-hidden="true" />
                วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น
              </p>

              <h1 className="text-3xl font-bold leading-[1.15] tracking-tight text-slate-900 md:text-5xl">
                Building Skills
                <br />
                <span className="text-brand-600">Through Hands-On Activities</span>
              </h1>

              <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-600 md:text-xl">
                นักศึกษาวิทยาลัยการคอมพิวเตอร์ อย่าลืมเข้ามาลงทะเบียนเข้าร่วมกิจกรรมเพื่อพัฒนาทักษะนอกห้องเรียนของคุณ
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="xl"
                  asChild
                  className="group rounded-lg bg-brand-600 text-white shadow-lg shadow-brand-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-500/40 active:translate-y-0 active:shadow-md"
                >
                  <Link href="/auth">
                    เริ่มต้นใช้งาน
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  asChild
                  className="group rounded-lg border-slate-300 bg-white/70 text-slate-900 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-white hover:shadow-md active:translate-y-0"
                >
                  <Link href="/events">
                    ดูกิจกรรมทั้งหมด
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── 02 กิจกรรมแนะนำ ─────────────────────────────────────────────── */}
      <section>
        <Container className="py-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-fg">
                กำลังเปิดรับสมัคร
              </h2>
            </div>
            <Button variant="link" asChild className="px-0">
              <Link href="/events">
                ดูทั้งหมด
                <ArrowRight />
              </Link>
            </Button>
          </div>

          {/* ตัวกรองหมวดหมู่ */}
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory("")}
              aria-pressed={category === ""}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm transition-colors",
                category === ""
                  ? "border-brand-600 bg-brand-600 font-medium text-white"
                  : "border-border bg-bg text-fg-muted hover:border-border-strong hover:text-fg"
              )}
            >
              ทั้งหมด
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                aria-pressed={category === cat.value}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition-colors",
                  category === cat.value
                    ? "border-brand-600 bg-brand-600 font-medium text-white"
                    : "border-border bg-bg text-fg-muted hover:border-border-strong hover:text-fg"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="mt-8">
            {loading ? (
              <div className={EVENT_CARD_GRID}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <ActivityCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredItems.length > 0 ? (
              <div className={EVENT_CARD_GRID}>
                {filteredItems.map((item) => {
                  const registrationWindow = formatRegistrationWindow(item.registrationOpenAt, item.registrationCloseAt)
                  return (
                    <Link key={item.key} href={item.href} className="block">
                      <EventCard
                        activity={{ name: item.name, imageUrl: item.imageUrl }}
                        description={item.description}
                        badgeLeft={item.categories.length > 0 && <EventCardBadge variant="light">{categoriesBadgeLabel(item.categories)}</EventCardBadge>}
                        badgeRight={
                          <EventCardBadge className={item.status === "open" ? "bg-success/90" : "bg-fg-subtle/90"}>
                            {item.status === "open" ? "กำลังเปิด" : "ปิดรับสมัคร"}
                          </EventCardBadge>
                        }
                      >
                        <EventCardRow icon={Calendar}>
                          จัดกิจกรรม {formatEventDateRange(item.sortDate, item.endDate)}
                        </EventCardRow>
                        {/* กิจกรรมเดี่ยวไม่มีช่วงรับสมัครในสคีมา (ไม่มีฟิลด์นี้เลย) — ซ่อนแถวนี้แทนที่จะโชว์ค่าว่าง */}
                        {registrationWindow && (
                          <EventCardRow icon={CalendarClock} tone="brand">
                            {registrationWindow}
                          </EventCardRow>
                        )}
                      </EventCard>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={CalendarX}
                title="ไม่พบกิจกรรมในหมวดหมู่นี้"
                description="ลองเลือกหมวดหมู่อื่น หรือดูกิจกรรมทั้งหมด"
                action={
                  <Button variant="outline" onClick={() => setCategory("")}>
                    ดูทั้งหมด
                  </Button>
                }
              />
            )}
          </div>
        </Container>
      </section>

      {/* ── 01 กระดานข่าว ───────────────────────────────────────────────── */}
      <NewsCarousel />

      {/* ── 03 ทักษะ 12 ด้าน ────────────────────────────────────────────── */}
      <section className="border-y border-border bg-surface">
        <Container className="py-16">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 className="text-3xl font-semibold leading-tight tracking-tight text-fg">
                12 ทักษะที่คุณสามารถสะสมได้จากกการเข้าร่วมกิจกรรม
              </h2>
              <p className="mt-4 text-base leading-relaxed text-fg-muted">
                เพียงคุณเข้าร่วมกิจกรรมและทำกิจกรรมให้สำเร็จ 
                แล้วคะแนนจะสะสมเข้าโปรไฟล์ของคุณอัตโนมัติ 
              </p>
            </div>

            <div className="relative lg:col-span-8">
              <div
                ref={skillsScrollRef}
                className="flex gap-2.5 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {SOFT_SKILLS.map((s) => (
                  <div
                    key={s.value}
                    className="w-64 shrink-0 rounded-xl border border-border bg-bg p-5 shadow-xs"
                  >
                    <span className="mb-3 flex size-9 items-center justify-center rounded-lg bg-brand-50">
                      <s.icon className="size-4.5 text-brand-600" aria-hidden="true" />
                    </span>
                    <h3 className="text-sm font-semibold text-fg">{s.label}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{s.desc}</p>
                  </div>
                ))}
              </div>

              {/* เงาจางบอกใบ้ว่าเลื่อนได้ */}
              <div
                className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-surface to-transparent"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface to-transparent"
                aria-hidden="true"
              />

              {/* ปุ่มเลื่อนซ้าย/ขวา */}
              <button
                type="button"
                onClick={() => skillsScrollRef.current?.scrollBy({ left: -240, behavior: "smooth" })}
                aria-label="เลื่อนทักษะก่อนหน้า"
                className="absolute -left-3 top-1/2 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-bg text-fg-muted shadow-xs transition-colors hover:text-fg sm:flex"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => skillsScrollRef.current?.scrollBy({ left: 240, behavior: "smooth" })}
                aria-label="เลื่อนทักษะถัดไป"
                className="absolute -right-3 top-1/2 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-bg text-fg-muted shadow-xs transition-colors hover:text-fg sm:flex"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </Container>
      </section>

      <SiteFooter />
    </div>
  )
}
