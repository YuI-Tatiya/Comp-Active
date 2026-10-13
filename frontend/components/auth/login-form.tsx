"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, AtSign, Loader2, User } from "lucide-react"
import { AMBER_BUTTON } from "@/components/denim/denim-ui"
import { AuthError, AuthIconInput, AuthLabel, AuthPasswordInput } from "@/components/auth/auth-shell"
import { ACCOUNT_NOT_VERIFIED_HINT, useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

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
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            {error && (
                <AuthError>
                    {error}
                    {needsVerification && (
                        <Link
                            href={`/auth/verify?email=${encodeURIComponent(identifier)}`}
                            className="mt-1.5 block font-semibold underline underline-offset-4"
                        >
                            ไปหน้ายืนยัน OTP
                        </Link>
                    )}
                </AuthError>
            )}

            <div>
                <AuthLabel htmlFor="identifier">Username</AuthLabel>
                <AuthIconInput
                    id="identifier"
                    icon={User}
                    type="text"
                    autoComplete="username"
                    placeholder="yourname@kkumail.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    disabled={loading}
                    aria-describedby="identifier-hint"
                />
                <p id="identifier-hint" className="mt-2 flex items-center gap-1.5 text-xs text-denim-muted">
                    <AtSign className="size-3.5 shrink-0" aria-hidden="true" />
                    นักศึกษา: กรอกอีเมล <strong className="font-semibold text-denim-deep">@kkumail.com</strong> ของคุณ
                </p>
            </div>

            <div>
                <AuthLabel htmlFor="password">Password</AuthLabel>
                <AuthPasswordInput
                    id="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                />
            </div>

            <button type="submit" disabled={loading} className={cn(AMBER_BUTTON, "mt-1 w-full disabled:cursor-wait disabled:opacity-80")}>
                {loading ? (
                    <>
                        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                        กำลังเข้าสู่ระบบ...
                    </>
                ) : (
                    <>
                        เข้าสู่ระบบ
                        <ArrowRight className="size-5" aria-hidden="true" />
                    </>
                )}
            </button>
        </form>
    )
}
