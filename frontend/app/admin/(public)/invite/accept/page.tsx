"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2, Lock, ShieldCheck, XCircle, CheckCircle2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { authAPI } from "@/lib/api"

type LoadState = "loading" | "valid" | "invalid"
type SubmitState = "idle" | "submitting" | "done"

function AcceptInviteForm() {
    const token = useSearchParams().get("token") || ""
    const [loadState, setLoadState] = useState<LoadState>(token ? "loading" : "invalid")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [submitState, setSubmitState] = useState<SubmitState>("idle")

    useEffect(() => {
        if (!token) return
        authAPI.getAdminInvite(token)
            .then((info) => {
                setEmail(info.email)
                setLoadState("valid")
            })
            .catch(() => setLoadState("invalid"))
    }, [token])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError("")

        if (!password || password.length < 6) {
            setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
            return
        }
        if (password !== confirmPassword) {
            setError("รหัสผ่านไม่ตรงกัน")
            return
        }

        setSubmitState("submitting")
        try {
            await authAPI.acceptAdminInvite(token, password)
            setSubmitState("done")
        } catch (err) {
            setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่")
            setSubmitState("idle")
        }
    }

    return (
        <div className="min-h-screen bg-denim-paper flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-8">
                {loadState === "loading" && (
                    <div className="flex flex-col items-center py-10 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-fg-muted mb-4" />
                        <p className="text-fg-muted">กำลังตรวจสอบคำเชิญ...</p>
                    </div>
                )}

                {loadState === "invalid" && (
                    <div className="flex flex-col items-center py-10 text-center">
                        <div className="w-16 h-16 rounded-full bg-danger-bg flex items-center justify-center mb-5">
                            <XCircle className="w-8 h-8 text-danger" />
                        </div>
                        <h2 className="text-xl font-bold text-fg mb-2">ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว</h2>
                        <p className="text-fg-muted text-sm">กรุณาติดต่อผู้ดูแลระบบเพื่อขอคำเชิญใหม่</p>
                    </div>
                )}

                {loadState === "valid" && submitState === "done" && (
                    <div className="flex flex-col items-center py-10 text-center">
                        <div className="w-16 h-16 rounded-full bg-success-bg flex items-center justify-center mb-5">
                            <CheckCircle2 className="w-8 h-8 text-success" />
                        </div>
                        <h2 className="text-xl font-bold text-fg mb-2">ตั้งรหัสผ่านสำเร็จ</h2>
                        <p className="text-fg-muted text-sm mb-6">บัญชี Admin ของคุณพร้อมใช้งานแล้ว</p>
                        <Link href="/login" className="w-full">
                            <Button className="w-full">เข้าสู่ระบบ</Button>
                        </Link>
                    </div>
                )}

                {loadState === "valid" && submitState !== "done" && (
                    <>
                        <div className="text-center mb-8">
                            <div className="w-14 h-14 rounded-full bg-surface-2 flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck className="w-7 h-7 text-fg" />
                            </div>
                            <h2 className="text-xl font-bold text-fg mb-1">ตั้งรหัสผ่าน Admin</h2>
                            <p className="text-fg-muted text-sm">สำหรับบัญชี <span className="font-medium text-fg">{email}</span></p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-danger-bg border border-danger/20 text-danger text-sm rounded-lg p-3">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="password">รหัสผ่านใหม่</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-fg-subtle" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-10"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={submitState === "submitting"}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">ยืนยันรหัสผ่าน</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-fg-subtle" />
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-10"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        disabled={submitState === "submitting"}
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full" disabled={submitState === "submitting"}>
                                {submitState === "submitting" ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        กำลังบันทึก...
                                    </>
                                ) : (
                                    "ตั้งรหัสผ่านและเปิดใช้งานบัญชี"
                                )}
                            </Button>
                        </form>
                    </>
                )}
            </div>
        </div>
    )
}

export default function AcceptInvitePage() {
    return (
        <Suspense fallback={null}>
            <AcceptInviteForm />
        </Suspense>
    )
}
