// frontend/app/student/checkin/[activityId]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Container } from "@/components/layout/container"
import { registrationsAPI, activitiesAPI, CheckInSelfResult } from "@/lib/api"
import { CheckCircle2, XCircle, Loader2, Clock, Smartphone } from "lucide-react"
import { SCAN_MOBILE_ONLY_MESSAGE, IN_APP_BROWSER_MESSAGE } from "@/lib/device"
import { useScanCapable } from "@/lib/use-scan-capable"
import { useInAppBrowser } from "@/lib/use-in-app-browser"

type Status = "loading" | "success" | "error"

/** สแกน QR code ที่ผู้จัดแสดงหน้างานแล้วมาเปิดหน้านี้ — เช็คอินตัวเองทันทีเมื่อโหลดหน้า ไม่ต้องกดอะไรเพิ่ม */
export default function StudentSelfCheckInPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    // publicId จาก URL — ไม่ใช่เลข id ภายในอีกต่อไป ต้อง resolve เป็นเลขจริงผ่าน activitiesAPI.getById()
    // ก่อนค่อยเรียก checkInSelf (token ของ checkin-token.util.ts ผูกกับเลข id ภายในโดยตรง เปลี่ยนไม่ได้)
    const activityPublicId = String(params?.activityId ?? "")
    // QR หมุนรหัสทุก 5 นาที (ดู ActivityCheckinQr ฝั่งผู้จัด) — token มาจากลิงก์ที่สแกนเท่านั้น ไม่มี fallback
    const token = searchParams?.get("token") ?? ""
    // รู้ได้จากลิงก์ตรงๆ ตั้งแต่ render แรก ไม่ต้องรอ effect/เรียก API เลยถ้าไม่มี token มาด้วย
    const tokenMissing = !token

    const [status, setStatus] = useState<Status>("loading")
    const [result, setResult] = useState<CheckInSelfResult | null>(null)
    const [errorMessage, setErrorMessage] = useState("")
    const [activityName, setActivityName] = useState("")
    // เช็คอินด้วย QR ทำได้เฉพาะมือถือ/iPad — เปิดลิงก์นี้บนคอมแล้วต้องไม่เช็คอินให้ (ดู lib/device.ts)
    const capable = useScanCapable()
    // สแกนผ่านแอปอย่าง LINE มักเปิดลิงก์ในเบราว์เซอร์ฝังในแอป ซึ่งคนละที่เก็บคุกกี้กับเบราว์เซอร์หลักของเครื่อง —
    // ต่อให้ล็อกอินไว้แล้วตามปกติ คำขอเช็คอินก็จะเงียบๆ ได้ 401 เพราะไม่มี session ติดมาด้วย (เจอจริง) กันไว้ก่อน
    // ไม่ให้ยิง API ไปเปล่าๆ แล้วบอกวิธีแก้ตรงๆ แทน
    const inAppBrowser = useInAppBrowser()
    const blockedByInAppBrowser = inAppBrowser === true

    // ไม่มี token หรือเปิดจากเบราว์เซอร์ฝังในแอป ต้องขึ้น error ทันทีโดยไม่ผ่าน "loading" เลย —
    // รวมเป็นค่าเดียวให้ JSX ด้านล่างใช้เส้นทางเดิม
    const effectiveStatus: Status = tokenMissing || blockedByInAppBrowser ? "error" : status
    const effectiveErrorMessage = tokenMissing
        ? "ลิงก์นี้ไม่สมบูรณ์ กรุณาสแกน QR code ที่หน้างานใหม่อีกครั้ง"
        : blockedByInAppBrowser
          ? IN_APP_BROWSER_MESSAGE
          : errorMessage

    useEffect(() => {
        // ไม่มี token แนบมา (ลิงก์พิมพ์มือ/เก่า/แชร์ภาพหน้าจอ QR แทนตัวจริง) หรือเปิดจากเบราว์เซอร์ฝังในแอป —
        // ฟันธงได้ตรงๆ ไม่ต้องยิง API เลย (เช็คที่ JSX ด้านล่างแทน ไม่ใช่ที่นี่ เพราะรู้ผลตั้งแต่ render แรกแล้ว)
        if (!activityPublicId || capable !== true || tokenMissing || blockedByInAppBrowser) return
        let cancelled = false

        // ต้อง resolve publicId → เลข id ภายในก่อนเสมอ (sequential ไม่ใช่ยิงคู่ขนานแบบเดิม) เพราะ
        // checkInSelf ผูกกับเลข id ภายในโดยตรงผ่าน token (ดู checkin-token.util.ts ฝั่ง backend)
        activitiesAPI
            .getById(activityPublicId)
            .then((a) => {
                if (cancelled) return
                setActivityName(a.name)
                return registrationsAPI.checkInSelf(a.id, token)
            })
            .then((res) => {
                if (cancelled || !res) return
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
    }, [activityPublicId, capable, tokenMissing, token, blockedByInAppBrowser])

    return (
        <div className="flex min-h-[70vh] items-center bg-surface">
            <Container className="mx-auto max-w-lg py-12">
                <Card className="overflow-hidden border-border shadow-xs">
                    <div className="space-y-4 p-8 text-center">
                        {capable === false && (
                            <>
                                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-surface-2">
                                    <Smartphone className="size-9 text-fg-muted" aria-hidden="true" />
                                </div>
                                <h1 className="text-xl font-bold text-fg">เช็คอินบนอุปกรณ์นี้ไม่ได้</h1>
                                <p className="text-fg-muted">{SCAN_MOBILE_ONLY_MESSAGE}</p>
                            </>
                        )}

                        {capable !== false && effectiveStatus === "loading" && (
                            <>
                                <Loader2 className="mx-auto size-12 animate-spin text-brand-600" aria-hidden="true" />
                                <p className="text-lg font-medium text-fg">กำลังเช็คอิน...</p>
                            </>
                        )}

                        {capable !== false && effectiveStatus === "success" && result && (
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

                        {capable !== false && effectiveStatus === "error" && (
                            <>
                                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-danger-bg">
                                    <XCircle className="size-9 text-danger" aria-hidden="true" />
                                </div>
                                <h1 className="text-xl font-bold text-fg">เช็คอินไม่สำเร็จ</h1>
                                <p className="text-fg-muted">{effectiveErrorMessage}</p>
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
