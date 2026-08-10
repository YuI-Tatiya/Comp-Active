"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { ActivityCard } from "@/components/ui/activity-card"
import { ActivityCardSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { activitiesAPI, Activity } from "@/lib/api"
import { CATEGORIES } from "@/lib/categories"
import {
  ArrowRight,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  Users,
  MessageSquare,
  Lightbulb,
  Repeat,
  Crown,
} from "lucide-react"
import { cn } from "@/lib/utils"

const SOFT_SKILLS = [
  { icon: Users, label: "ทีมเวิร์ก", desc: "ทำงานร่วมกับผู้อื่นได้อย่างราบรื่น" },
  { icon: Crown, label: "ภาวะผู้นำ", desc: "นำทีมและตัดสินใจอย่างมีความรับผิดชอบ" },
  { icon: MessageSquare, label: "การสื่อสาร", desc: "ถ่ายทอดความคิดได้ชัดเจนและตรงประเด็น" },
  { icon: Lightbulb, label: "การแก้ปัญหา", desc: "วิเคราะห์และหาทางออกอย่างเป็นระบบ" },
  { icon: Repeat, label: "การปรับตัว", desc: "รับมือกับสถานการณ์ที่เปลี่ยนแปลงได้" },
]

const NEWS_ITEMS = [
  {
    tag: "ประกาศ",
    title: "เปิดลงทะเบียนกิจกรรม AI Workshop รอบใหม่",
    desc: "นักศึกษาที่สนใจสามารถลงทะเบียนเข้าร่วมได้แล้ววันนี้ รับจำนวนจำกัด",
    date: "8 ส.ค. 2569",
  },
  {
    tag: "ข่าวสาร",
    title: "ประกาศผลการประเมินซอฟต์สกิลประจำภาคเรียน",
    desc: "ตรวจสอบคะแนนสะสมทั้ง 5 ด้านของคุณได้แล้วที่หน้าโปรไฟล์",
    date: "5 ส.ค. 2569",
  },
  {
    tag: "กิจกรรมเด่น",
    title: "Coding Challenge ชิงรางวัลรวมมูลค่ากว่า 10,000 บาท",
    desc: "ร่วมท้าทายทักษะการเขียนโปรแกรมกับเพื่อนๆ ทั่วทั้งวิทยาลัย",
    date: "1 ส.ค. 2569",
  },
]

/** ป้ายกำกับหัวข้อแบบมีเลข */
function SectionLabel({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2.5 text-xs font-medium tracking-wide text-fg-subtle">
      <span className="tabular-nums text-brand-600">{n}</span>
      <span className="h-px w-6 bg-border" aria-hidden="true" />
      {children}
    </p>
  )
}

export default function RootPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>("")
  const [newsIndex, setNewsIndex] = useState(0)

  useEffect(() => {
    loadActivities(category)
  }, [category])

  useEffect(() => {
    const timer = setInterval(() => {
      setNewsIndex((i) => (i + 1) % NEWS_ITEMS.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  async function loadActivities(cat: string) {
    try {
      setLoading(true)
      const data = await activitiesAPI.getAll(cat ? { category: cat } : undefined)
      // Show only up to 3 for the recommended section
      setActivities(Array.isArray(data) ? data.slice(0, 3) : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* ── Hero (asymmetric, light) ─────────────────────────────────────── */}
      <section className="hero-sky relative isolate overflow-hidden">
        {/* ลายจุดละเอียดเฉพาะบริเวณภาพ — สื่อถึงโลกเทคโนโลยีโดยไม่รบกวนข้อความ */}
        <div
          className="hero-grid pointer-events-none absolute inset-0 hidden opacity-35 lg:block"
          aria-hidden="true"
        />

        {/* ชั้นสีเขียวอ่อนด้านล่างรับกับพื้นหญ้าในภาพประกอบ */}
        <div
          className="pointer-events-none absolute -bottom-52 -right-40 h-[27rem] w-[52rem] rounded-[50%] bg-gradient-to-tl from-emerald-100/60 via-sky-100/35 to-transparent blur-3xl"
          aria-hidden="true"
        />

        {/* แสงและวงกลมลอยช้า ๆ ด้านหลังภาพ */}
        <div
          className="pointer-events-none absolute right-[5%] top-[4%] hidden h-[28rem] w-[28rem] rounded-full bg-white/60 blur-3xl motion-safe:animate-glow motion-reduce:animate-none lg:block"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-10 bottom-[8%] hidden h-64 w-64 rounded-full bg-sky-300/35 blur-3xl motion-safe:animate-float motion-reduce:animate-none lg:block"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute right-[29%] top-[17%] hidden h-36 w-36 rounded-full bg-cyan-100/60 blur-2xl motion-safe:animate-float-delay motion-reduce:animate-none lg:block"
          aria-hidden="true"
        />
        <Container className="relative z-10 pt-16 pb-16 md:pt-24 md:pb-24">
          <div className="relative">
            <div className="max-w-3xl lg:max-w-xl">
              <p className="mb-3 flex items-center gap-2.5 text-sm font-medium tracking-wide text-slate-500">
                <span className="h-px w-6 bg-slate-900/15" aria-hidden="true" />
                วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น
              </p>

              <h1 className="text-4xl font-bold leading-[1.15] tracking-tight text-slate-900 md:text-6xl">
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
                  className="bg-gradient-to-r from-brand-300 to-brand-500 text-white shadow-md hover:from-brand-300 hover:to-brand-600"
                >
                  <Link href="/auth">เริ่มต้นใช้งาน</Link>
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  asChild
                  className="border-slate-300 bg-white/60 text-slate-900 hover:bg-white"
                >
                  <Link href="/events">
                    ดูกิจกรรมทั้งหมด
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>

            {/* วางลอยทับ ไม่ผูกกับความสูงของข้อความฝั่งซ้าย */}
            <div className="hidden isolate lg:absolute lg:right-0 lg:top-1/2 lg:block lg:w-full lg:max-w-xl lg:-translate-y-1/2">
              {/* แสงเรืองด้านหลัง — เพิ่มมิติให้ภาพลอยเด่นจากพื้นหลัง เคลื่อนไหวเบา ๆ */}
              <div
                className="pointer-events-none absolute inset-[-14%] z-0 rounded-full bg-gradient-to-br from-white/75 via-sky-200/50 to-blue-300/30 blur-3xl motion-safe:animate-glow motion-reduce:animate-none"
                aria-hidden="true"
              />
              {/* เงาสัมผัสพื้น — แยกภาพออกจาก background ให้รู้สึกลอยจริง */}
              <div
                className="pointer-events-none absolute bottom-[8%] left-1/2 z-0 h-10 w-[65%] -translate-x-1/2 rounded-[50%] bg-slate-900/25 blur-2xl"
                aria-hidden="true"
              />
              <Image
                src="/student_home.svg"
                alt="นักศึกษาเข้าร่วมกิจกรรม"
                width={620}
                height={412}
                className="relative z-10 h-auto w-full [filter:brightness(1.04)_contrast(1.06)_saturate(1.12)_drop-shadow(0_18px_14px_rgba(15,23,42,0.18))_drop-shadow(0_45px_38px_rgba(15,23,42,0.22))]"
                priority
              />
            </div>
          </div>
        </Container>
      </section>

      {/* ── 01 กระดานข่าว ───────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <Container className="py-16">
          <SectionLabel n="01">กระดานข่าว</SectionLabel>
          <h2 className="text-3xl font-semibold tracking-tight text-fg">ข่าวสารและประกาศ</h2>

          <div className="relative mt-8">
            <div className="overflow-hidden rounded-xl border border-border bg-bg">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${newsIndex * 100}%)` }}
              >
                {NEWS_ITEMS.map((news) => (
                  <div
                    key={news.title}
                    className="flex w-full shrink-0 flex-col items-center p-8 text-center sm:p-10"
                  >
                    <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600">
                      {news.tag}
                    </span>
                    <h3 className="mt-4 text-xl font-semibold text-fg sm:text-2xl">
                      {news.title}
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-base">
                      {news.desc}
                    </p>
                    <p className="mt-4 text-xs text-fg-subtle">{news.date}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ปุ่มเลื่อนซ้าย/ขวา */}
            <button
              type="button"
              onClick={() =>
                setNewsIndex((i) => (i - 1 + NEWS_ITEMS.length) % NEWS_ITEMS.length)
              }
              aria-label="ข่าวก่อนหน้า"
              className="absolute left-2 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-bg text-fg-muted shadow-xs transition-colors hover:text-fg sm:flex"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setNewsIndex((i) => (i + 1) % NEWS_ITEMS.length)}
              aria-label="ข่าวถัดไป"
              className="absolute right-2 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-bg text-fg-muted shadow-xs transition-colors hover:text-fg sm:flex"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>

            {/* จุดไข่ปลา — บอกตำแหน่งสไลด์ */}
            <div className="mt-5 flex items-center justify-center gap-2">
              {NEWS_ITEMS.map((news, i) => (
                <button
                  key={news.title}
                  type="button"
                  onClick={() => setNewsIndex(i)}
                  aria-label={`ไปที่ข่าว ${i + 1}`}
                  aria-current={newsIndex === i}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    newsIndex === i ? "w-6 bg-brand-600" : "w-1.5 bg-border-strong"
                  )}
                />
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ── 02 กิจกรรมแนะนำ ─────────────────────────────────────────────── */}
      <section>
        <Container className="py-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionLabel n="02">กิจกรรมแนะนำ</SectionLabel>
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

          {/* ตัวกรองหมวดหมู่ — มีจุดสีประจำหมวด */}
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
                  "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors",
                  category === cat.value
                    ? "border-brand-600 bg-brand-600 font-medium text-white"
                    : "border-border bg-bg text-fg-muted hover:border-border-strong hover:text-fg"
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    category === cat.value ? "bg-white" : cat.dot
                  )}
                  aria-hidden="true"
                />
                {cat.label}
              </button>
            ))}
          </div>

          <div className="mt-8">
            {loading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <ActivityCardSkeleton key={i} />
                ))}
              </div>
            ) : activities.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {activities.map((ev) => (
                  <ActivityCard key={ev.id} activity={ev} />
                ))}
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

      {/* ── 03 ทักษะ 5 ด้าน ─────────────────────────────────────────────── */}
      <section className="border-y border-border bg-surface">
        <Container className="py-16">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <SectionLabel n="03">Soft Skills</SectionLabel>
              <h2 className="text-3xl font-semibold leading-tight tracking-tight text-fg">
                5 ทักษะที่คุณจะได้
              </h2>
              <p className="mt-4 text-base leading-relaxed text-fg-muted">
                ทุกกิจกรรมกำหนดคะแนนทักษะไว้ล่วงหน้า
                ผู้จัดจะประเมินหลังจบกิจกรรม แล้วคะแนนจะสะสมเข้าโปรไฟล์ของคุณอัตโนมัติ
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-3">
              {SOFT_SKILLS.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-border bg-bg p-5 shadow-xs"
                >
                  <span className="mb-3 flex size-9 items-center justify-center rounded-lg bg-brand-50">
                    <s.icon className="size-4.5 text-brand-600" aria-hidden="true" />
                  </span>
                  <h3 className="text-sm font-semibold text-fg">{s.label}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <SiteFooter />
    </div>
  )
}
