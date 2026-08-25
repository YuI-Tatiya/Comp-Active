// frontend/app/student/checkin/[activityId]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Container } from "@/components/layout/container"
import { registrationsAPI, activitiesAPI, CheckInSelfResult } from "@/lib/api"
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react"

type Status = "loading" | "success" | "error"

/** สแกน QR code ที่ผู้จัดแสดงหน้างานแล้วมาเปิดหน้านี้ — เช็คอินตัวเองทันทีเมื่อโหลดหน้า ไม่ต้องกดอะไรเพิ่ม */
export default function StudentSelfCheckInPage() {
    const params = useParams()
    const activityId = Number(params?.activityId)

    const [status, setStatus] = useState<Status>("loading")
    const [result, setResult] = useState<CheckInSelfResult | null>(null)
    const [errorMessage, setErrorMessage] = useState("")
    const [activityName, setActivityName] = useState("")

    useEffect(() => {
        if (!activityId) return
        let cancelled = false

        activitiesAPI
            .getById(activityId)
            .then((a) => { if (!cancelled) setActivityName(a.name) })
            .catch(() => {})

        registrationsAPI
            .checkInSelf(activityId)
            .then((res) => {
                if (cancelled) return
                setResult(res)
                setStatus("success")
            })
            .catch((err: unknown) => {
                if (cancelled) return
                const e = err as Error
                setErrorMessage(e.message || "เช็คอินไม่สำเร็จ")
                setStatus("error")
            })

        return () => { cancelled = true }
    }, [activityId])

    return (
        <div className="flex min-h-[70vh] items-center bg-surface">
            <Container className="mx-auto max-w-lg py-12">
                <Card className="overflow-hidden border-border shadow-xs">
                    <div className="space-y-4 p-8 text-center">
                        {status === "loading" && (
                            <>
                                <Loader2 className="mx-auto size-12 animate-spin text-brand-600" aria-hidden="true" />
                                <p className="text-lg font-medium text-fg">กำลังเช็คอิน...</p>
                            </>
                        )}

                        {status === "success" && result && (
                            <>
                                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-bg">
                                    <CheckCircle2 className="size-9 text-success" aria-hidden="true" />
                                </div>
                                <h1 className="text-xl font-bold text-fg">
                                    {result.alreadyCheckedIn ? "คุณเช็คอินไปแล้ว" : "เช็คอินสำเร็จ!"}
                                </h1>
                                {activityName && <p className="font-medium text-fg-muted">{activityName}</p>}
                                {result.checkInTime && (
                                    <p className="inline-flex items-center gap-1.5 text-sm text-fg-subtle">
                                        <Clock className="size-4" aria-hidden="true" />
                                        เช็คอินเมื่อ{" "}
                                        {new Date(result.checkInTime).toLocaleString("th-TH", {
                                            dateStyle: "medium",
                                            timeStyle: "short",
                                        })}
                                    </p>
                                )}
                            </>
                        )}

                        {status === "error" && (
                            <>
                                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-danger-bg">
                                    <XCircle className="size-9 text-danger" aria-hidden="true" />
                                </div>
                                <h1 className="text-xl font-bold text-fg">เช็คอินไม่สำเร็จ</h1>
                                <p className="text-fg-muted">{errorMessage}</p>
                            </>
                        )}

                        <div className="pt-4">
                            <Button asChild className="w-full">
                                <Link href="/student/my-registrations">ไปหน้ากิจกรรมของฉัน</Link>
                            </Button>
                        </div>
                    </div>
                </Card>
            </Container>
        </div>
    )
}
