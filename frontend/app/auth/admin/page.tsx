"use client"

import { useState } from "react"
import { Loader2, Mail, Lock, ShieldAlert } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"

export default function AdminAuthPage() {
    const { login } = useAuth()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!email || !password) {
            setError("กรุณากรอก username และรหัสผ่าน")
            return
        }

        setLoading(true)
        try {
            await login(email, password)
        } catch (err) {
            const message = err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูล"
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-blue-50/30 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden grid md:grid-cols-2 min-h-[600px]">
                {/* Left Side - Info */}
                <div className="bg-slate-800 p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                        <div className="absolute top-10 -left-10 w-40 h-40 bg-white rounded-full mix-blend-overlay blur-3xl"></div>
                        <div className="absolute bottom-10 -right-10 w-60 h-60 bg-white rounded-full mix-blend-overlay blur-3xl"></div>
                    </div>

                    <div className="relative z-10">
                        <div className="mb-6">
                            <ShieldAlert className="h-16 w-16 mb-4 text-blue-400" />
                            <h1 className="text-3xl font-bold mb-2">ระบบจัดการผู้ดูแลระบบ</h1>
                            <p className="text-slate-300 text-lg">Admin Management System</p>
                        </div>
                    </div>

                    <div className="relative z-10 bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-600 text-white flex items-center justify-center font-bold text-sm">1</div>
                                <div>
                                    <h3 className="font-semibold text-lg flex items-center gap-2">จัดการผู้ใช้งาน</h3>
                                    <p className="text-slate-300 text-sm">ควบคุมและดูแลสิทธิ์การใช้งานในระบบ</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-600 text-white flex items-center justify-center font-bold text-sm">2</div>
                                <div>
                                    <h3 className="font-semibold text-lg flex items-center gap-2">อนุมัติกิจกรรม</h3>
                                    <p className="text-slate-300 text-sm">ตรวจสอบและอนุมัติกิจกรรมจากผู้จัด</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-600 text-white flex items-center justify-center font-bold text-sm">3</div>
                                <div>
                                    <h3 className="font-semibold text-lg flex items-center gap-2">รายงานสถิติ</h3>
                                    <p className="text-slate-300 text-sm">ดูสถิติภาพรวมของการใช้งานแบบ Real-time</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Forms */}
                <div className="p-8 md:p-12 flex flex-col justify-center bg-white relative">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">เข้าสู่ระบบสำหรับ Admin</h2>
                        <p className="text-gray-500">สำหรับผู้ดูแลระบบเท่านั้น</p>
                    </div>

                    {/* Form Container */}
                    <div className="transition-all duration-300 ease-in-out">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">Admin ID / Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="email"
                                        type="text"
                                        placeholder="admin@example.com"
                                        className="pl-10 focus-visible:ring-slate-500"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">รหัสผ่าน</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-10 focus-visible:ring-slate-500"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 py-6 mt-4" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        กำลังเข้าสู่ระบบ...
                                    </>
                                ) : (
                                    "เข้าสู่ระบบ Admin"
                                )}
                            </Button>

                            <div className="text-center mt-6">
                                <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
                                    กลับไปหน้าหลัก
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
