"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Container } from "@/components/layout/container"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatEventDate } from "@/components/ui/event-card"
import { registrationsAPI, API_BASE_URL, EventSurveyQuestion, SurveyAnswerBody } from "@/lib/api"
import { Calendar, Clock, MapPin, Plus, Loader2, CalendarX, X, Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface Registration {
  id: number
  status: string
  attendance: string
  registerDate: string
  evaluation?: unknown
  activity: {
    id: number
    name: string
    date: string
    startTime: string
    endTime: string
    location: string
    category: string
    imageUrl?: string
  }
}

/** สถานะการลงทะเบียน — ตรงกับ RegistrationStatus ใน backend/prisma/schema.prisma */
const STATUS_BADGE: Record<string, { label: string; variant: "success" | "warning" | "danger" }> = {
  confirmed: { label: "ยืนยันแล้ว", variant: "success" },
  cancelled: { label: "ยกเลิกแล้ว", variant: "danger" },
  pending: { label: "รอดำเนินการ", variant: "warning" },
}

export default function MyRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"upcoming" | "history">("upcoming")
  const [message, setMessage] = useState("")
  // เก็บชนิดของข้อความแยกไว้ ไม่เดาจากตัวข้อความ —
  // "ยกเลิกไม่สำเร็จ".includes("สำเร็จ") เป็น true จึงเคยขึ้นกล่องเขียวตอนพัง
  const [messageType, setMessageType] = useState<"success" | "error">("success")

  // แบบสำรวจความพึงพอใจ — เปิดเป็น dialog ต่อรายการลงทะเบียน
  const [surveyRegId, setSurveyRegId] = useState<number | null>(null)
  const [surveyQuestions, setSurveyQuestions] = useState<EventSurveyQuestion[]>([])
  const [surveyAnswers, setSurveyAnswers] = useState<Record<number, { ratingValue?: number; textValue?: string }>>({})
  const [surveyLoading, setSurveyLoading] = useState(false)
  const [surveySubmitting, setSurveySubmitting] = useState(false)
  const [surveyError, setSurveyError] = useState("")

  useEffect(() => {
    loadRegistrations()
  }, [])

  async function loadRegistrations() {
    try {
      setLoading(true)
      const data = await registrationsAPI.getMy()
      setRegistrations(Array.isArray(data) ? data : [])
    } catch {
      setRegistrations([])
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel(id: number) {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะยกเลิกการลงทะเบียน?")) return
    setMessage("")
    try {
      await registrationsAPI.cancel(id)
      setMessageType("success")
      setMessage("ยกเลิกสำเร็จ")
      loadRegistrations()
    } catch (err: unknown) {
      const e = err as Error
      setMessageType("error")
      setMessage(e.message || "ยกเลิกไม่สำเร็จ")
    }
  }

  async function openSurvey(regId: number) {
    setSurveyRegId(regId)
    setSurveyAnswers({})
    setSurveyError("")
    setSurveyLoading(true)
    try {
      const qs = await registrationsAPI.getSurveyQuestions(regId)
      setSurveyQuestions(qs)
    } catch (err: unknown) {
      const e = err as Error
      setSurveyError(e.message || "โหลดแบบสำรวจไม่สำเร็จ")
      setSurveyQuestions([])
    } finally {
      setSurveyLoading(false)
    }
  }

  async function handleSubmitSurvey() {
    if (!surveyRegId) return
    setSurveySubmitting(true)
    setSurveyError("")
    try {
      const payload: SurveyAnswerBody[] = Object.entries(surveyAnswers).map(([questionId, a]) => ({
        questionId: Number(questionId),
        ratingValue: a.ratingValue,
        textValue: a.textValue,
      }))
      await registrationsAPI.submitSurvey(surveyRegId, payload)
      setSurveyRegId(null)
      setMessageType("success")
      setMessage("ขอบคุณสำหรับการให้คะแนน!")
      loadRegistrations()
    } catch (err: unknown) {
      const e = err as Error
      setSurveyError(e.message || "ส่งแบบสำรวจไม่สำเร็จ")
    } finally {
      setSurveySubmitting(false)
    }
  }

  const filteredRegs = registrations.filter((r) => {
    if (activeTab === "upcoming") return r.status !== "cancelled" && !r.evaluation
    return r.status === "cancelled" || r.evaluation
  })

  const upcomingCount = registrations.filter((r) => r.status !== "cancelled" && !r.evaluation).length
  const historyCount = registrations.filter((r) => r.status === "cancelled" || r.evaluation).length

  const TABS = [
    { key: "upcoming" as const, label: `กิจกรรมเร็วๆ นี้ (${upcomingCount})` },
    { key: "history" as const, label: `ประวัติและผลการประเมิน (${historyCount})` },
  ]

  return (
    // ไม่ใส่ min-h-screen — app/student/layout.tsx จัดการให้แล้ว
    <div className="bg-surface pb-12">
      {/* หัวข้อ — ไม่ใส่ sticky เพราะ AppHeader ปักที่ top-0 z-50 อยู่แล้ว แถบนี้จะมุดหายไปใต้มัน */}
      <div className="border-b border-border bg-bg">
        <Container className="py-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="mb-1 text-3xl font-bold tracking-tight text-fg">กิจกรรมของฉัน</h1>
              <p className="text-fg-muted">ติดตามสถานะการเข้าร่วมและการประเมินผลของคุณ</p>
            </div>
            <Button size="lg" className="rounded-xl" asChild>
              <Link href="/student/events">
                <Plus />
                ค้นหากิจกรรมเพิ่ม
              </Link>
            </Button>
          </div>
        </Container>
      </div>

      <Container className="py-8">
        {message && (
          <div
            role="alert"
            className={cn(
              "mb-6 flex items-center justify-between gap-3 rounded-xl border border-border p-4 text-sm font-medium",
              messageType === "success" ? "bg-success-bg text-success" : "bg-danger-bg text-danger"
            )}
          >
            {message}
            <button
              type="button"
              onClick={() => setMessage("")}
              aria-label="ปิดข้อความ"
              className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* แท็บ — ใช้ทรง pill เดียวกับเมนูใน navbar */}
        <div className="mb-8 flex w-fit gap-1 rounded-full bg-surface-2 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-pressed={activeTab === tab.key}
              className={cn(
                "rounded-full px-6 py-2.5 text-sm font-semibold transition-colors",
                activeTab === tab.key
                  ? "bg-bg text-brand-600 shadow-xs"
                  : "text-fg-muted hover:text-fg"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="mb-4 size-12 animate-spin text-brand-600" />
            <p className="text-lg font-medium text-fg-muted">กำลังโหลดกิจกรรมของคุณ...</p>
          </div>
        ) : filteredRegs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-bg p-16 text-center shadow-xs">
            <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-surface">
              <CalendarX className="size-8 text-fg-subtle" aria-hidden="true" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-fg">ไม่มีรายการกิจกรรม</h3>
            <p className="mx-auto mb-8 max-w-sm text-fg-muted">
              คุณยังไม่มีกิจกรรมในหมวดนี้ เริ่มสำรวจกิจกรรมใหม่ๆ ได้เลย!
            </p>
            <Button className="rounded-xl px-8" asChild>
              <Link href="/student/events">ไปหน้ากิจกรรม</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredRegs.map((reg) => {
              const st = STATUS_BADGE[reg.status] ?? STATUS_BADGE.pending

              return (
                <div
                  key={reg.id}
                  className="rounded-2xl border border-border bg-bg p-2 pr-6 shadow-xs transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-6 md:flex-row">
                    {/* รูปกิจกรรม */}
                    <div className="relative h-48 w-full shrink-0 overflow-hidden rounded-2xl bg-surface-2 md:h-auto md:w-48">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          reg.activity?.imageUrl
                            ? `${API_BASE_URL}${reg.activity.imageUrl}`
                            : "/activity-placeholder.svg"
                        }
                        alt={reg.activity.name}
                        className="size-full object-cover"
                      />
                      {reg.activity.category && (
                        <div className="absolute left-3 top-3">
                          <span className="rounded-lg bg-bg/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-700 shadow-sm">
                            {reg.activity.category}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 py-4">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Badge variant={st.variant}>{st.label}</Badge>

                        {reg.status === "confirmed" && (
                          <Badge variant={reg.attendance === "attended" ? "info" : "neutral"}>
                            {reg.attendance === "attended" ? "✓ เข้าร่วมแล้ว" : "ยังไม่เข้างาน"}
                          </Badge>
                        )}

                        {!!reg.evaluation && <Badge variant="default">ประเมินแล้ว</Badge>}
                      </div>

                      <h3 className="mb-4 text-xl font-bold text-fg">{reg.activity.name}</h3>

                      <div className="mb-6 grid grid-cols-1 gap-y-3 gap-x-12 sm:grid-cols-2">
                        <div className="flex items-center gap-2 text-sm text-fg-muted">
                          <Calendar className="size-4 shrink-0 text-brand-500" aria-hidden="true" />
                          <span className="font-medium">{formatEventDate(reg.activity.date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-fg-muted">
                          <MapPin className="size-4 shrink-0 text-danger" aria-hidden="true" />
                          <span className="truncate font-medium">{reg.activity.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-fg-muted">
                          <Clock className="size-4 shrink-0 text-info" aria-hidden="true" />
                          <span className="font-medium">
                            {reg.activity.startTime} - {reg.activity.endTime}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 pt-2">
                        {reg.status !== "cancelled" && reg.status !== "confirmed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl font-bold text-danger"
                            onClick={() => handleCancel(reg.id)}
                          >
                            ยกเลิกกิจกรรม
                          </Button>
                        )}

                        <Button size="sm" className="rounded-xl font-bold" asChild>
                          <Link href={`/student/events/${reg.activity.id}`}>ดูรายละเอียดกิจกรรม</Link>
                        </Button>

                        {reg.attendance === "attended" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl font-bold"
                            onClick={() => openSurvey(reg.id)}
                          >
                            ให้คะแนนกิจกรรม
                          </Button>
                        )}

                        {!!reg.evaluation && (
                          <Button variant="outline" size="sm" className="rounded-xl font-bold" asChild>
                            <Link href="/student/profile">ดูผลประเมิน Soft Skills</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Container>

      {/* แบบสำรวจความพึงพอใจ */}
      <Dialog open={surveyRegId !== null} onOpenChange={(open) => !open && setSurveyRegId(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>แบบสำรวจความพึงพอใจ</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {surveyError && (
              <div className="rounded-lg border border-danger bg-danger-bg px-4 py-3 text-sm text-danger">
                {surveyError}
              </div>
            )}

            {surveyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-8 animate-spin text-brand-600" aria-hidden="true" />
              </div>
            ) : surveyQuestions.length === 0 ? (
              !surveyError && <p className="text-sm text-fg-muted">กิจกรรมนี้ไม่มีแบบสำรวจ</p>
            ) : (
              surveyQuestions.map((q) => (
                <div key={q.id} className="space-y-2">
                  <Label>{q.label}</Label>
                  {q.type === "rating" ? (
                    <div className="flex gap-1">
                      {Array.from({ length: q.scaleMax }).map((_, i) => {
                        const value = i + 1
                        const selected = (surveyAnswers[q.id]?.ratingValue ?? 0) >= value
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setSurveyAnswers((prev) => ({ ...prev, [q.id]: { ratingValue: value } }))}
                            aria-label={`${value} ดาว`}
                          >
                            <Star
                              className={cn("size-7", selected ? "fill-warning text-warning" : "text-border-strong")}
                              aria-hidden="true"
                            />
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <Textarea
                      value={surveyAnswers[q.id]?.textValue || ""}
                      onChange={(e) =>
                        setSurveyAnswers((prev) => ({ ...prev, [q.id]: { textValue: e.target.value } }))
                      }
                      className="min-h-[80px]"
                    />
                  )}
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSurveyRegId(null)} disabled={surveySubmitting}>
              ปิด
            </Button>
            {surveyQuestions.length > 0 && (
              <Button onClick={handleSubmitSurvey} disabled={surveySubmitting}>
                {surveySubmitting ? "กำลังส่ง..." : "ส่งแบบสำรวจ"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
