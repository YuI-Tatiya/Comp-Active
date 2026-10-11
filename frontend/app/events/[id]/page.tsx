"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Toast } from "@/components/ui/toast"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { AlertTriangle, Loader2 } from "lucide-react"
import { eventsAPI, EventSummary } from "@/lib/api"
import { resolveEventImageUrl } from "@/lib/event-image"
import { ActivityRegistrationView } from "@/components/activity/activity-registration-view"

type EventActivity = EventSummary["activities"][number]

/**
 * หน้ารายละเอียดงานสำหรับผู้เยี่ยมชมทั่วไป (ไม่ต้องล็อกอิน) — คู่กับ /student/events/[id]
 *
 * ใช้ ActivityRegistrationView ชุดเดียวกับฝั่งนักศึกษา (เดิมหน้านี้มีหน้าตาของตัวเองแยกต่างหาก
 * ก่อนที่ /student/events/[id] จะย้ายไปใช้คอมโพเนนต์ร่วมนี้ ทำให้สองหน้าเพี้ยนออกจากกัน) ต่างกันแค่
 * myRegistrations เป็น [] เสมอ (ผู้เยี่ยมชมไม่เคยลงทะเบียนอะไรเลย — describeAction จึงตกไปที่
 * เส้นทาง "ยังไม่ได้สมัคร" เองโดยอัตโนมัติ ไม่ต้องเขียนเงื่อนไขแยก) และ onRegister พาไปหน้า login
 * แทนที่จะเปิดฟอร์มลงทะเบียนจริง — ปุ่ม "ยกเลิกการลงทะเบียน" จึงไม่มีทางถูกกดได้ (ไม่มี mine ให้ตรงเงื่อนไข)
 */
export default function PublicEventDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const [event, setEvent] = useState<EventSummary | null>(null)
    const [activeActivityId, setActiveActivityId] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [toast, setToast] = useState<{ open: boolean; message: string; description?: string }>({
        open: false,
        message: "",
    })
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        return () => {
            if (toastTimer.current) clearTimeout(toastTimer.current)
        }
    }, [])

    const showToast = (message: string, description?: string) => {
        setToast({ open: true, message, description })
        if (toastTimer.current) clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast((prev) => ({ ...prev, open: false })), 2500)
    }

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

    const handleRegisterClick = () => {
        alert("กรุณาเข้าสู่ระบบก่อนทำการลงทะเบียน")
        router.push("/auth")
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-surface flex flex-col">
                <SiteHeader />
                <div className="flex flex-1 flex-col items-center justify-center">
                    <Loader2 className="mx-auto mb-4 size-8 animate-spin text-brand-600" aria-hidden="true" />
                    <p className="text-fg-muted">กำลังโหลดรายละเอียดงาน...</p>
                </div>
                <SiteFooter />
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="min-h-screen bg-surface flex flex-col">
                <SiteHeader />
                <div className="flex flex-1 flex-col items-center justify-center p-4">
                    <div className="bg-bg p-8 rounded-xl shadow-sm max-w-md w-full text-center border border-border">
                        <AlertTriangle className="mx-auto mb-4 size-12 text-danger" aria-hidden="true" />
                        <h2 className="text-xl font-bold mb-2 text-fg">ไม่พบงาน</h2>
                        <p className="text-fg-muted mb-6">{error || "งานนี้อาจถูกลบหรือไม่มีอยู่จริง"}</p>
                        <Button onClick={() => router.push("/events")} className="w-full">กลับไปหน้าค้นหากิจกรรม</Button>
                    </div>
                </div>
                <SiteFooter />
            </div>
        )
    }

    const activeActivity: EventActivity | undefined = event.activities.find((a) => a.id === activeActivityId)

    return (
        <div className="flex min-h-screen flex-col bg-surface">
            <SiteHeader />
            <ActivityRegistrationView
                title={event.name}
                imageUrl={resolveEventImageUrl(event, activeActivity)}
                organizerName={activeActivity?.organizer?.name ?? event.activities[0]?.organizer?.name}
                intro={event.description}
                activities={event.activities}
                activeId={activeActivityId}
                onSelectActivity={setActiveActivityId}
                registrationOpenAt={event.registrationOpenAt}
                registrationCloseAt={event.registrationCloseAt}
                myRegistrations={[]}
                onRegister={handleRegisterClick}
                onCancel={() => {}}
                shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/events/${event.id}`}
                onShareCopied={() => showToast("คัดลอกลิงก์แล้ว!", "วางลิงก์เพื่อแชร์กิจกรรมนี้ให้เพื่อนได้เลย")}
                backHref="/events"
                showActivityImage
            >
                <Toast open={toast.open} message={toast.message} description={toast.description} />
            </ActivityRegistrationView>
            <SiteFooter />
        </div>
    )
}
