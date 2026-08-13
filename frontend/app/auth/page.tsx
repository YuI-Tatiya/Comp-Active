"use client"

import { useState } from "react"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"
import { GraduationCap, Search, UserPlus, QrCode } from "lucide-react"
import Link from "next/link"

export default function AuthPage() {
    const [activeTab, setActiveTab] = useState<"login" | "register">("login")

    return (
        <div className="min-h-screen bg-brand-50/30 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl bg-bg rounded-2xl shadow-xl overflow-hidden grid md:grid-cols-2 min-h-[600px]">
                {/* Left Side - Info */}
                <div className="bg-brand-600 p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                        <div className="absolute top-10 -left-10 w-40 h-40 bg-white rounded-full mix-blend-overlay blur-3xl"></div>
                        <div className="absolute bottom-10 -right-10 w-60 h-60 bg-white rounded-full mix-blend-overlay blur-3xl"></div>
                    </div>

                    <div className="relative z-10">
                        <div className="mb-6">
                            <GraduationCap className="h-16 w-16 mb-4" />
                            <h1 className="text-3xl font-bold mb-2">Comp Active</h1>
                            <p className="text-brand-100 text-lg">วิทยาลัยการคอมพิวเตอร์</p>
                        </div>
                    </div>

                    <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm">1</div>
                                <div>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Search className="h-4 w-4" /> ค้นหากิจกรรม</h3>
                                    <p className="text-brand-100 text-sm">เลือกกิจกรรมที่คุณสนใจจากหลากหลายหมวดหมู่</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm">2</div>
                                <div>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><UserPlus className="h-4 w-4" /> ลงทะเบียน</h3>
                                    <p className="text-brand-100 text-sm">ลงทะเบียนเข้าร่วมกิจกรรมได้ง่ายๆ ในไม่กี่คลิก</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm">3</div>
                                <div>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><QrCode className="h-4 w-4" /> เข้าร่วมกิจกรรม</h3>
                                    <p className="text-brand-100 text-sm">แสดง QR Code เพื่อเช็คอินเข้าร่วมกิจกรรม</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Forms */}
                <div className="p-8 md:p-12 flex flex-col justify-center bg-bg">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-fg mb-2">ยินดีต้อนรับ</h2>
                        <p className="text-fg-muted">เข้าสู่ระบบหรือสร้างบัญชีใหม่เพื่อเริ่มใช้งาน</p>
                    </div>

                    {/* Toggle Tabs */}
                    <div className="bg-surface p-1 rounded-lg flex mb-8">
                        <button
                            onClick={() => setActiveTab("login")}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${activeTab === "login"
                                    ? "bg-bg text-brand-600 shadow-sm"
                                    : "text-fg-muted hover:text-fg"
                                }`}
                        >
                            เข้าสู่ระบบ
                        </button>
                        <button
                            onClick={() => setActiveTab("register")}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${activeTab === "register"
                                    ? "bg-bg text-brand-600 shadow-sm"
                                    : "text-fg-muted hover:text-fg"
                                }`}
                        >
                            สมัครสมาชิก
                        </button>
                    </div>

                    {/* Form Container */}
                    <div className="transition-all duration-300 ease-in-out">
                        {activeTab === "login" ? <LoginForm /> : <RegisterForm />}
                    </div>

                    {activeTab === "login" && (
                        <div className="text-center mt-6 text-sm text-fg-muted">
                            อยากร่วมเป็นผู้สร้างกิจกรรมใช่ไหม?{" "}
                            <Link href="/auth/organizer/register" className="font-semibold text-brand-600 hover:text-brand-700">
                                สมัครที่นี่
                            </Link>
                        </div>
                    )}

                    <div className="text-center mt-4">
                        <Link href="/" className="text-sm text-fg-muted hover:text-fg">
                            กลับไปหน้าหลัก
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
