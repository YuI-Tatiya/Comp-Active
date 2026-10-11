"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { User, Lock, Loader2 } from "lucide-react"
import { ACCOUNT_NOT_VERIFIED_HINT, useAuth } from "@/lib/auth-context"

export function LoginForm() {
    const { login } = useAuth()
    const [identifier, setIdentifier] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!identifier || !password) {
            setError("กรุณากรอกอีเมล/Username และรหัสผ่าน")
            return
        }

        setLoading(true)
        try {
            await login(identifier, password)
        } catch (err) {
            const message = err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูล"
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    const needsVerification = error.includes(ACCOUNT_NOT_VERIFIED_HINT)

    return (
        // โครงเดียวกับ register-form เพื่อให้ปุ่มอยู่ตำแหน่งเดียวกันทั้ง 2 แท็บ
        <form onSubmit={handleSubmit} className="flex min-h-full flex-col gap-4">
            {error && (
                <div className="bg-danger-bg border border-danger/20 text-danger text-sm rounded-lg p-3">
                    {error}
                    {needsVerification && (
                        <Link
                            href={`/auth/verify?email=${encodeURIComponent(identifier)}`}
                            className="mt-1.5 block font-medium underline underline-offset-4"
                        >
                            ไปหน้ายืนยัน OTP
                        </Link>
                    )}
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="identifier">Username</Label>
                <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-fg-subtle" />
                    <Input
                        id="identifier"
                        type="text"
                        className="pl-10"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        disabled={loading}
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-fg-subtle" />
                    <Input
                        id="password"
                        type="password"
                        className="pl-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                    />
                </div>
            </div>
            {/* ใช้โครงเดียวกับ register-form เพื่อให้ปุ่มอยู่ตำแหน่งเดียวกันทั้ง 2 แท็บ ไม่กระโดด */}
            <div className="sticky bottom-0 -mx-6 mt-auto border-t border-border bg-bg px-6 py-4 sm:-mx-8 sm:px-8">
                <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-gradient-to-r from-brand-500 to-brand-700 hover:opacity-90"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" />
                            กำลังเข้าสู่ระบบ...
                        </>
                    ) : (
                        "เข้าสู่ระบบ"
                    )}
                </Button>
            </div>
        </form>
    )
}
