"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Container } from "@/components/layout/container"
import { Toast } from "@/components/ui/toast"
import { Mail, Loader2, AlertTriangle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { authAPI } from "@/lib/api"

const RESEND_COOLDOWN_SECONDS = 60

function VerifyOtpForm() {
    const searchParams = useSearchParams()
    const email = searchParams?.get("email") ?? ""
    const { verifyRegisterOtp, hasPendingRegistration } = useAuth()

    // backend ต้องการรหัสผ่านของคำขอสมัครคู่กับ OTP — มาจากการสมัคร/ล็อกอินเมื่อกี้ แท็บนี้จำไว้แล้วไม่ต้องถามซ้ำ
    // เปิดลิงก์นี้ใหม่หรือรีเฟรชหน้า = ไม่มีให้ใช้ ต้องถาม
    const [askPassword] = useState(() => !hasPendingRegistration(email))
    const [password, setPassword] = useState("")
    const [otp, setOtp] = useState("")
    const [error, setError] = useState("")
    const [verifying, setVerifying] = useState(false)
    const [resending, setResending] = useState(false)
    // เริ่มนับถอยหลังทันทีตั้งแต่เข้าหน้านี้ — มาจาก register() แปลว่าเพิ่งส่ง OTP ไปแล้วจริงๆ
    const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS)
    const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: "" })
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (cooldown <= 0) return
        const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
        return () => clearInterval(t)
    }, [cooldown])

    useEffect(() => {
        return () => {
            if (toastTimer.current) clearTimeout(toastTimer.current)
        }
    }, [])

    const showToast = (message: string) => {
        setToast({ open: true, message })
        if (toastTimer.current) clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast((prev) => ({ ...prev, open: false })), 2500)
    }

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        if (!/^\d{6}$/.test(otp)) {
            setError("กรุณากรอกรหัส OTP ให้ครบ 6 หลัก")
            return
        }
        if (askPassword && !password) {
            setError("กรุณากรอกรหัสผ่านที่ใช้สมัคร")
            return
        }
        setVerifying(true)
        try {
            await verifyRegisterOtp(email, otp, askPassword ? password : undefined)
        } catch (err) {
            setError(err instanceof Error ? err.message : "ยืนยันไม่สำเร็จ")
        } finally {
            setVerifying(false)
        }
    }

    const handleResend = async () => {
        setError("")
        setResending(true)
        try {
            await authAPI.resendRegisterOtp(email)
            setCooldown(RESEND_COOLDOWN_SECONDS)
            showToast("ส่งรหัส OTP ใหม่ไปที่อีเมลแล้ว")
        } catch (err) {
            setError(err instanceof Error ? err.message : "ส่งรหัสใหม่ไม่สำเร็จ")
        } finally {
            setResending(false)
        }
    }

    if (!email) {
        return (
            <Card className="overflow-hidden border-border shadow-xs">
                <div className="space-y-4 p-8 text-center">
                    <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-danger-bg">
                        <AlertTriangle className="size-9 text-danger" aria-hidden="true" />
                    </div>
                    <h1 className="text-xl font-bold text-fg">ไม่พบอีเมลที่จะยืนยัน</h1>
                    <p className="text-fg-muted">ลิงก์นี้ไม่สมบูรณ์ กรุณาสมัครสมาชิกใหม่อีกครั้ง</p>
                    <Button asChild className="w-full">
                        <Link href="/auth">กลับไปหน้าสมัครสมาชิก</Link>
                    </Button>
                </div>
            </Card>
        )
    }

    return (
        <Card className="overflow-hidden border-border shadow-xs">
            <div className="space-y-5 p-8">
                <div className="space-y-2 text-center">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-50">
                        <Mail className="size-7 text-brand-600" aria-hidden="true" />
                    </div>
                    <h1 className="text-xl font-bold text-fg">ยืนยันอีเมลของคุณ</h1>
                    <p className="text-sm text-fg-muted">
                        เราส่งรหัส OTP 6 หลักไปที่ <span className="font-medium text-fg">{email}</span> แล้ว
                        กรอกรหัสด้านล่างเพื่อเปิดใช้งานบัญชี
                    </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-4">
                    {error && (
                        <div role="alert" className="rounded-lg border border-danger/20 bg-danger-bg p-3 text-sm text-danger">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="otp">รหัส OTP</Label>
                        <Input
                            id="otp"
                            inputMode="numeric"
                            maxLength={6}
                            autoFocus
                            placeholder="------"
                            className="text-center text-2xl font-bold tracking-[0.4em]"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            disabled={verifying}
                        />
                    </div>

                    {askPassword && (
                        <div className="space-y-2">
                            <Label htmlFor="verify-password">รหัสผ่านที่ตั้งไว้ตอนสมัคร</Label>
                            <Input
                                id="verify-password"
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={verifying}
                            />
                        </div>
                    )}

                    <Button
                        type="submit"
                        size="lg"
                        className="w-full bg-gradient-to-r from-brand-500 to-brand-700 hover:opacity-90"
                        disabled={verifying}
                    >
                        {verifying ? (
                            <>
                                <Loader2 className="animate-spin" />
                                กำลังยืนยัน...
                            </>
                        ) : (
                            "ยืนยันและเข้าสู่ระบบ"
                        )}
                    </Button>
                </form>

                <div className="text-center text-sm text-fg-muted">
                    ไม่ได้รับรหัส?{" "}
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={resending || cooldown > 0}
                        className="font-medium text-brand-600 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-fg-subtle disabled:no-underline"
                    >
                        {resending ? "กำลังส่ง..." : cooldown > 0 ? `ส่งรหัสใหม่ได้ใน ${cooldown} วิ` : "ส่งรหัสใหม่"}
                    </button>
                </div>

                <p className="text-center text-xs text-fg-subtle">
                    <Link href="/auth" className="underline-offset-4 hover:underline">
                        กลับไปหน้าเข้าสู่ระบบ
                    </Link>
                </p>
            </div>

            <Toast open={toast.open} message={toast.message} />
        </Card>
    )
}

/** หน้ากรอก OTP หลังสมัครสมาชิก — มาจาก register() เสมอ (ยังไม่เข้าสู่ระบบจนกว่าจะยืนยันสำเร็จ) */
export default function VerifyOtpPage() {
    return (
        <div className="flex min-h-[70vh] items-center bg-surface">
            <Container className="mx-auto max-w-md py-12">
                <Suspense fallback={null}>
                    <VerifyOtpForm />
                </Suspense>
            </Container>
        </div>
    )
}
