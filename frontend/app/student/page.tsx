"use client"

import { useState, useEffect } from "react"
import { CalendarCheck, Clock, Search, TrendingUp, Trophy } from "lucide-react"
import { Container } from "@/components/layout/container"
import {
  ACTIVITY_GRID,
  ActivityCardSkeleton,
  DashedLinkTile,
  DenimSectionHeading,
  OrganizerStatCards,
  type OrganizerStat,
} from "@/components/denim/denim-ui"
import { PublicActivityCard } from "@/components/denim/public-activity-card"
import {
  HeadingLink,
  HomePanel,
  NoSkillScoresNotice,
  SkillTiles,
  SkillTilesSkeleton,
  StudentHomeHero,
  UpcomingCard,
  UpcomingCardSkeleton,
  UpcomingEmpty,
  scoredSkillCount,
  type HomeRegistration,
} from "@/components/student/student-home-ui"
import {
  activitiesAPI,
  eventsAPI,
  registrationsAPI,
  evaluationsAPI,
  certificatesAPI,
  Activity,
  SkillsData,
} from "@/lib/api"
import { buildFeaturedCards, type FeaturedCardItem } from "@/lib/events-filter"
import { activityStart, calendarDaysUntil, selectUpcoming } from "@/lib/student-home"
import { useAuth } from "@/lib/auth-context"

/** การ์ด "กำลังจะถึง" สูงสุด 2 แถว (กริด 2 คอลัมน์) — ที่เหลือดูต่อในหน้ากิจกรรมของฉัน */
const UPCOMING_LIMIT = 4
/** การ์ดแนะนำ 2 ใบ + ช่องสำรวจกิจกรรม = เต็มแถวเดียวพอดีบนจอกว้าง (ACTIVITY_GRID 3 คอลัมน์) */
const RECOMMENDED_LIMIT = 2

export default function StudentDashboardPage() {
  const { user } = useAuth()
  const [recommended, setRecommended] = useState<FeaturedCardItem[]>([])
  const [registrations, setRegistrations] = useState<HomeRegistration[]>([])
  const [skills, setSkills] = useState<SkillsData | null>(null)
  const [totalVolunteerHours, setTotalVolunteerHours] = useState<number | null>(null)
  const [loadingActivities, setLoadingActivities] = useState(true)
  const [loadingMine, setLoadingMine] = useState(true)
  // เวลาอ้างอิงตอนเปิดหน้า — ใช้นับวันถึงกิจกรรม (ตามปฏิทินไทย) ทั้งหน้าให้ตรงกัน
  const [now] = useState(() => new Date())

  useEffect(() => {
    // งานหนึ่งงาน (มีกิจกรรมย่อยกี่ตัวก็ตาม) ต้องแสดงเป็นการ์ดเดียว จึงต้องดึงทั้ง Event และ
    // กิจกรรมเดี่ยวมารวมกัน ไม่ใช่ดึงแค่ activitiesAPI.getAll() ที่คืนกิจกรรมย่อยแยกเป็นรายตัว
    Promise.all([eventsAPI.getAllPublic(), activitiesAPI.getAll().catch(() => [] as Activity[])])
      .then(([events, standalone]) => {
        const all = buildFeaturedCards(
          Array.isArray(events) ? events : [],
          Array.isArray(standalone) ? standalone : [],
          { event: (id) => `/student/events/${id}`, activity: (id) => `/student/activities/${id}` }
        )
        // หัวข้อบอกว่า "กิจกรรมที่กำลังเปิดรับสมัคร" — เอาเฉพาะที่เปิดอยู่จริง (กติกาเดียวกับหน้าแรก public)
        setRecommended(
          all
            .filter((i) => i.status === "open")
            .sort((a, b) => a.sortDate - b.sortDate)
            .slice(0, RECOMMENDED_LIMIT)
        )
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingActivities(false))
  }, [])

  useEffect(() => {
    Promise.allSettled([
      registrationsAPI.getMy(),
      evaluationsAPI.getMySkills(),
      certificatesAPI.getMy(),
    ])
      .then(([regRes, skillRes, certRes]) => {
        if (regRes.status === "fulfilled" && Array.isArray(regRes.value)) {
          setRegistrations(regRes.value as HomeRegistration[])
        }
        if (skillRes.status === "fulfilled") setSkills(skillRes.value)
        if (certRes.status === "fulfilled" && Array.isArray(certRes.value)) {
          const hours = certRes.value.reduce((sum, c) => sum + (Number(c.volunteerHours) || 0), 0)
          setTotalVolunteerHours(hours)
        }
      })
      .finally(() => setLoadingMine(false))
  }, [])

  const allUpcoming = selectUpcoming(registrations, now)
  const upcoming = allUpcoming.slice(0, UPCOMING_LIMIT)
  const daysToNext = loadingMine
    ? undefined
    : allUpcoming.length > 0
      ? calendarDaysUntil(activityStart(allUpcoming[0].activity), now)
      : null

  const scored = scoredSkillCount(skills?.average)

  const stats: OrganizerStat[] = [
    {
      code: "JOINED",
      label: "กิจกรรมที่เข้าร่วม",
      value: loadingMine ? "–" : (skills?.count ?? 0),
      icon: CalendarCheck,
    },
    {
      code: "SCORE",
      label: "คะแนนสะสม",
      value: loadingMine ? "–" : (skills?.totalScore ?? 0).toLocaleString("th-TH"),
      icon: TrendingUp,
    },
    {
      code: "RANK",
      label: "อันดับในระบบ",
      value: loadingMine || !skills ? "–" : `#${skills.rank}`,
      caption: loadingMine || !skills ? undefined : `จากนักศึกษาทั้งหมด ${skills.totalStudents.toLocaleString("th-TH")} คน`,
      icon: Trophy,
      highlight: true,
    },
    {
      code: "VOLUNTEER_HRS",
      label: "ชั่วโมงจิตอาสา",
      value:
        totalVolunteerHours === null ? (
          "–"
        ) : (
          <>
            {totalVolunteerHours.toLocaleString("th-TH", { maximumFractionDigits: 2 })}
            <span className="ml-1.5 text-lg font-semibold sm:text-2xl">ชม.</span>
          </>
        ),
      icon: Clock,
    },
  ]

  return (
    // ไม่ใส่ min-h-screen — app/student/layout.tsx จัดการให้แล้ว
    <div className="bg-surface pb-16">
      <StudentHomeHero name={user?.name || "นักศึกษา"} daysToNext={daysToNext} />
      <OrganizerStatCards stats={stats} strongLabels />

      <Container className="mt-8 flex flex-col gap-8">
        {/* ── กำลังจะถึง ─────────────────────────────────────────────────── */}
        <HomePanel labelledBy="upcoming-heading">
          <DenimSectionHeading
            id="upcoming-heading"
            comment="upcoming"
            title="กำลังจะถึง"
            size="card"
            description={
              !loadingMine && allUpcoming.length > 0 ? `${allUpcoming.length} กิจกรรมที่คุณลงทะเบียนไว้` : undefined
            }
            action={<HeadingLink href="/student/my-registrations">กิจกรรมของฉัน</HeadingLink>}
          />
          <div className="mt-5">
            {loadingMine ? (
              <div className="grid gap-4 md:grid-cols-2">
                <UpcomingCardSkeleton />
                <UpcomingCardSkeleton />
              </div>
            ) : upcoming.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {upcoming.map((r) => (
                  <UpcomingCard key={r.id} reg={r} now={now} />
                ))}
              </div>
            ) : (
              <UpcomingEmpty />
            )}
          </div>
        </HomePanel>

        {/* ── ทักษะของคุณ ────────────────────────────────────────────────── */}
        <HomePanel labelledBy="skills-heading">
          <DenimSectionHeading
            id="skills-heading"
            comment={loadingMine ? "skills[12]" : `skills[12] · มีคะแนนแล้ว ${scored}`}
            title="ทักษะของคุณ"
            size="card"
            action={<HeadingLink href="/student/profile">ดูรายละเอียด</HeadingLink>}
          />
          <div className="mt-5 flex flex-col gap-4">
            {!loadingMine && scored === 0 && <NoSkillScoresNotice />}
            {loadingMine ? <SkillTilesSkeleton /> : <SkillTiles average={skills?.average} />}
          </div>
        </HomePanel>

        {/* ── แนะนำสำหรับคุณ ─────────────────────────────────────────────── */}
        <section aria-labelledby="recommended-heading" className="mt-2">
          <DenimSectionHeading
            id="recommended-heading"
            comment="events.filter(open)"
            title="แนะนำสำหรับคุณ"
            size="card"
            description={
              !loadingActivities && recommended.length === 0
                ? "ยังไม่มีกิจกรรมเปิดรับสมัครในตอนนี้"
                : "กิจกรรมที่กำลังเปิดรับสมัคร"
            }
            action={<HeadingLink href="/student/events">ดูทั้งหมด</HeadingLink>}
          />
          {/* กริดและการ์ดชุดเดียวกับหน้าแรก public — การ์ดกิจกรรมทุกหน้าขนาดเท่ากัน */}
          <div className={`mt-5 ${ACTIVITY_GRID}`}>
            {loadingActivities
              ? Array.from({ length: RECOMMENDED_LIMIT }).map((_, i) => <ActivityCardSkeleton key={i} />)
              : recommended.map((item) => <PublicActivityCard key={item.key} item={item} />)}
            <DashedLinkTile
              href="/student/events"
              icon={Search}
              title="สำรวจกิจกรรมทั้งหมด"
              description="กรองตามหมวดหมู่ สถานะ และใบรับรองจิตอาสา"
            />
          </div>
        </section>
      </Container>
    </div>
  )
}
