"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Lock, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

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

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-danger-bg border border-danger/20 text-danger text-sm rounded-lg p-3">
                    {error}
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="identifier">อีเมล (นักศึกษา) หรือ Username (ผู้จัดกิจกรรม)</Label>
                <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-fg-subtle" />
                    <Input
                        id="identifier"
                        type="text"
                        placeholder="your.email@kkumail.com หรือ username"
                        className="pl-10"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        disabled={loading}
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">รหัสผ่าน</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-fg-subtle" />
                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                    />
                </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        กำลังเข้าสู่ระบบ...
                    </>
                ) : (
                    "เข้าสู่ระบบ"
                )}
            </Button>
        </form>
    )
}
