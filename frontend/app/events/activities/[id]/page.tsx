"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Toast } from "@/components/ui/toast"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { AlertTriangle, Loader2 } from "lucide-react"
import { activitiesAPI, Activity } from "@/lib/api"
import { resolveEventImageUrl } from "@/lib/event-image"
import { ActivityRegistrationView } from "@/components/activity/activity-registration-view"

/**
 * หน้ารายละเอียดกิจกรรมเดี่ยวสำหรับผู้เยี่ยมชมทั่วไป (ไม่ต้องล็อกอิน) — คู่กับ /student/activities/[id]
 *
 * ใช้ ActivityRegistrationView ชุดเดียวกับฝั่งนักศึกษา เหมือนกับ /events/[id] — ดูเหตุผลที่นั่น
 */
export default function PublicActivityDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const [event, setEvent] = useState<Activity | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [toast, setToast] = useState<{ open: boolean; message: string; description?: string }>({
        open: false,
        message: "",
    })
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (params.id) {
            fetchEventDetails(Number(params.id))
        }
    }, [params.id])

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

    const fetchEventDetails = async (id: number) => {
        try {
            setLoading(true)
            const data = await activitiesAPI.getById(id)
            setEvent(data)
        } catch (err: unknown) {
            const e = err as Error
            setError(e.message || "โหลดข้อมูลกิจกรรมไม่สำเร็จ")
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
                    <p className="text-fg-muted">กำลังโหลดรายละเอียดกิจกรรม...</p>
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
                        <h2 className="text-xl font-bold mb-2 text-fg">ไม่พบกิจกรรม</h2>
                        <p className="text-fg-muted mb-6">{error || "กิจกรรมนี้อาจถูกลบหรือไม่มีอยู่จริง"}</p>
                        <Button onClick={() => router.push("/events")} className="w-full">กลับไปหน้าค้นหากิจกรรม</Button>
                    </div>
                </div>
                <SiteFooter />
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col bg-surface">
            <SiteHeader />
            <ActivityRegistrationView
                title={event.name}
                imageUrl={resolveEventImageUrl(event)}
                organizerName={event.organizer?.name}
                activities={[event]}
                activeId={event.id}
                onSelectActivity={() => {}}
                myRegistrations={[]}
                onRegister={handleRegisterClick}
                onCancel={() => {}}
                shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/events/activities/${event.id}`}
                onShareCopied={() => showToast("คัดลอกลิงก์แล้ว!", "วางลิงก์เพื่อแชร์กิจกรรมนี้ให้เพื่อนได้เลย")}
                backHref="/events"
            >
                <Toast open={toast.open} message={toast.message} description={toast.description} />
            </ActivityRegistrationView>
            <SiteFooter />
        </div>
    )
}
