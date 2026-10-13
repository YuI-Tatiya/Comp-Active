"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { referenceCode } from "@/components/denim/denim-ui"
import { ActivityRegistrationView } from "@/components/activity/activity-registration-view"
import { eventsAPI, EventSummary } from "@/lib/api"
import { eventImagePathFor } from "@/lib/event-image"

type EventActivity = EventSummary["activities"][number]

/**
 * มุมมอง "ดูอย่างเดียว" ของงาน (Event) สำหรับผู้จัด — ใช้ ActivityRegistrationView ชุดเดียวกับหน้ารายละเอียดงาน
 * ฝั่งนักศึกษา (/student/events/:id) ในโหมด preview: แถบท้ายการ์ดเป็นจำนวนผู้ลงทะเบียนแทนปุ่มสมัคร
 * ใช้ตอนกดดูงานที่ไม่ใช่ของตัวเอง (เช่นจากฟีดกิจกรรมทั้งหมดในหน้าแรก) — อยู่ใน layout ของผู้จัดเอง
 * (AppHeader/RoleGuard ยังคุมอยู่) ต่างจาก /organizer/events/:id ที่เป็นหน้าจัดการเต็มรูปแบบและ
 * ล็อกไว้เฉพาะเจ้าของงาน
 */
export default function OrganizerEventViewPage() {
    const params = useParams()
    const router = useRouter()
    const [event, setEvent] = useState<EventSummary | null>(null)
    const [activeActivityId, setActiveActivityId] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        if (params.id) {
            fetchEventDetails(Number(params.id))
        }
    }, [params.id])

    const fetchEventDetails = async (id: number) => {
        try {
            setLoading(true)
            const data = await eventsAPI.getPublicById(id)
            setEvent(data)
            setActiveActivityId((prev) => prev ?? data.activities[0]?.id ?? null)
        } catch (err: unknown) {
            const e = err as Error
            setError(e.message || "โหลดข้อมูลงานไม่สำเร็จ")
        } finally {
            setLoading(false)
        }
    }

    const activeActivity: EventActivity | undefined = event?.activities.find((a) => a.id === activeActivityId)

    if (loading) {
        return (
            <div className="bg-surface flex items-center justify-center">
                <Container className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="mx-auto mb-4 size-8 animate-spin text-brand-600" aria-hidden="true" />
                    <p className="text-fg-muted">กำลังโหลดรายละเอียดงาน...</p>
                </Container>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="bg-surface flex flex-col items-center justify-center p-4">
                <div className="bg-bg p-8 rounded-xl shadow-sm max-w-md w-full text-center border border-border">
                    <AlertTriangle className="mx-auto mb-4 size-12 text-danger" aria-hidden="true" />
                    <h2 className="text-xl font-bold mb-2 text-fg">ไม่พบงาน</h2>
                    <p className="text-fg-muted mb-6">{error || "งานนี้อาจถูกลบหรือไม่มีอยู่จริง"}</p>
                    <Button onClick={() => router.push("/organizer")} className="w-full">กลับไปหน้าแรก</Button>
                </div>
            </div>
        )
    }

    return (
        <ActivityRegistrationView
            mode="preview"
            title={event.name}
            imagePath={eventImagePathFor(event, activeActivity)}
            code={referenceCode("EVT", event.id)}
            organizerName={activeActivity?.organizer?.name ?? event.activities[0]?.organizer?.name}
            intro={event.description}
            activities={event.activities}
            activeId={activeActivityId}
            onSelectActivity={setActiveActivityId}
            registrationOpenAt={event.registrationOpenAt}
            registrationCloseAt={event.registrationCloseAt}
            shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/events/${event.id}`}
            onShareCopied={() => alert("คัดลอกลิงก์สำหรับแชร์ให้บุคคลทั่วไปเรียบร้อยแล้ว!")}
            backHref="/organizer"
            showActivityImage
            notice={
                // backend ส่งงานที่ไม่เผยแพร่มาให้เฉพาะเจ้าของ (และแอดมิน) — บอกให้ชัดว่านี่คือการดูตัวอย่าง ไม่ใช่สิ่งที่นักศึกษาเห็น
                event.isPublic === false ? (
                    <div
                        role="note"
                        className="flex items-start gap-3 rounded-xl border border-amber/40 bg-denim-deep/70 px-4 py-3 text-sm leading-relaxed text-denim-on backdrop-blur-sm"
                    >
                        <EyeOff className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden="true" />
                        <p>
                            <strong className="font-semibold text-white">งานนี้ยังไม่เผยแพร่</strong> — นักศึกษาและบุคคลทั่วไปจะไม่เห็นหน้านี้
                            และลงทะเบียนไม่ได้ (ลิงก์แชร์จะยังเปิดไม่ได้) คุณเห็นได้เพราะเป็นเจ้าของงาน · เปิดเผยแพร่ได้ที่{" "}
                            <Link href="/organizer/manage" className="font-semibold text-amber underline underline-offset-2">
                                หน้าจัดการกิจกรรม
                            </Link>
                        </p>
                    </div>
                ) : undefined
            }
        />
    )
}
