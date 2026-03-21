"use client"

import { useState } from "react"
import { GraduationCap, Search, UserPlus, QrCode, Loader2, Mail, Lock } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"

export default function OrganizerAuthPage() {
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
                <div className="bg-blue-600 p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                        <div className="absolute top-10 -left-10 w-40 h-40 bg-white rounded-full mix-blend-overlay blur-3xl"></div>
                        <div className="absolute bottom-10 -right-10 w-60 h-60 bg-white rounded-full mix-blend-overlay blur-3xl"></div>
                    </div>

                    <div className="relative z-10">
                        <div className="mb-6">
                            <GraduationCap className="h-16 w-16 mb-4" />
                            <h1 className="text-3xl font-bold mb-2">ระบบจัดการกิจกรรม</h1>
                            <p className="text-blue-100 text-lg">วิทยาลัยการคอมพิวเตอร์</p>
                        </div>
                    </div>

                    <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">1</div>
                                <div>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Search className="h-4 w-4" /> ค้นหากิจกรรม</h3>
                                    <p className="text-blue-100 text-sm">เลือกกิจกรรมที่คุณสนใจจากหลากหลายหมวดหมู่</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">2</div>
                                <div>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><UserPlus className="h-4 w-4" /> ลงทะเบียน</h3>
                                    <p className="text-blue-100 text-sm">ลงทะเบียนเข้าร่วมกิจกรรมได้ง่ายๆ ในไม่กี่คลิก</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">3</div>
                                <div>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><QrCode className="h-4 w-4" /> เข้าร่วมกิจกรรม</h3>
                                    <p className="text-blue-100 text-sm">แสดง QR Code เพื่อเช็คอินเข้าร่วมกิจกรรม</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Forms */}
                <div className="p-8 md:p-12 flex flex-col justify-center bg-slate-50 relative">


                    <div className="text-center mb-10 mt-4">
                        <h2 className="text-3xl font-black text-slate-900 mb-2">ยินดีต้อนรับ</h2>
                        <p className="text-slate-500 font-medium">เข้าสู่ระบบเพื่อสร้างสรรค์กิจกรรม</p>
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
                                <Label htmlFor="email" className="text-gray-700">username</Label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="email"
                                        type="text"
                                        placeholder="username"
                                        className="pl-11 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-500 h-12 rounded-xl shadow-sm"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-700 font-bold ml-1">รหัสผ่าน</Label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-11 bg-white border-slate-200 text-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 h-12 rounded-xl shadow-sm"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                                <div className="flex justify-end mt-1">
                                    <a href="#" className="text-sm text-gray-600 hover:text-gray-800">ลืมรหัสผ่าน?</a>
                                </div>
                            </div>

                            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 font-bold mt-6 shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                                        กำลังเข้าสู่ระบบ...
                                    </>
                                ) : (
                                    "เข้าสู่ระบบ"
                                )}
                            </Button>

                            <div className="mt-8 flex flex-col items-center space-y-4">
                                <div className="text-sm font-medium text-slate-600">
                                    อยากร่วมเป็นผู้สร้างกิจกรรมใช่ไหม?{" "}
                                    <Link
                                        href="/auth/organizer/register"
                                        className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors border-b-2 border-transparent hover:border-indigo-600 pb-0.5"
                                    >
                                        สมัครที่นี่
                                    </Link>
                                </div>
                                <div className="h-px w-full max-w-[200px] bg-slate-200"></div>
                                <Link href="/" className="text-sm font-bold text-slate-400 hover:text-slate-700 transition-colors">
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
