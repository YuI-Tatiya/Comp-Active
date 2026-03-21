"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Target, Users, BookOpen, Trophy } from "lucide-react"

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        {/* Logo area */}
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shrink-0 overflow-hidden shadow-md">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/logo.png" alt="Logo" className="w-full h-full object-cover fallback-bg" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerText = 'CP'; }} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 leading-tight">ระบบจัดการกิจกรรม</span>
                                <span className="text-sm text-gray-500 font-medium leading-tight">วิทยาลัยการคอมพิวเตอร์</span>
                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-8">
                            <Link href="/" className="text-gray-600 font-medium hover:text-blue-600 transition-colors">หน้าหลัก</Link>
                            <Link href="/events" className="text-gray-600 font-medium hover:text-blue-600 transition-colors">กิจกรรมทั้งหมด</Link>
                            <Link href="/about" className="text-blue-600 font-bold border-b-2 border-blue-600 pb-1">เกี่ยวกับเรา</Link>

                            <div className="bg-blue-50 text-blue-700 px-5 py-1.5 rounded-full text-xs font-bold ring-1 ring-blue-200 uppercase tracking-widest">
                                ทั่วไป
                            </div>

                            <Link href="/auth">
                                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-8 shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 font-bold">
                                    เข้าสู่ระบบ
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 py-24 relative overflow-hidden">
                {/* Background Patterns */}

                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/30 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/4"></div>

                <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
                    <h1 className="text-4xl md:text-6xl font-black text-white mb-6">เกี่ยวกับระบบจัดการกิจกรรม</h1>
                    <p className="text-xl text-blue-100 max-w-3xl mx-auto font-medium">
                        แพลตฟอร์มที่เชื่อมโยงนักศึกษาเข้ากับโอกาสในการพัฒนาตนเองผ่านกิจกรรมนอกห้องเรียน<br className="hidden md:block" />
                        เสริมสร้างประสบการณ์และเติมเต็มศักยภาพอย่างรอบด้าน
                    </p>
                </div>
            </div>

            {/* Core Values / Business Logic */}
            <div className="max-w-7xl mx-auto px-4 py-24 -mt-10 relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-8 rounded-[24px] shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-transform duration-300">
                        <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                            <Target className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">เป้าหมายชัดเจน</h3>
                        <p className="text-slate-600">รวบรวมกิจกรรมจากทุกภาคส่วน เพื่อให้นักศึกษาค้นพบกิจกรรมที่ตอบโจทย์ความสนใจและเป้าหมายในอาชีพของตนเอง</p>
                    </div>
                    <div className="bg-white p-8 rounded-[24px] shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-transform duration-300">
                        <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                            <Users className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">พัฒนาเครือข่าย</h3>
                        <p className="text-slate-600">เปิดโอกาสให้นักศึกษาได้เรียนรู้การทำงานร่วมกับผู้อื่น สร้างเครือข่ายและความสัมพันธ์ที่ดีในรั้วมหาวิทยาลัย</p>
                    </div>
                    <div className="bg-white p-8 rounded-[24px] shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-transform duration-300">
                        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                            <BookOpen className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">เรียนรู้ตลอดชีวิต</h3>
                        <p className="text-slate-600">ส่งเสริมและวัดประเมินผลทักษะ Soft Skills ต่างๆ นอกเหนือจากวิชาการ ผ่านระบบสะสมทักษะ (Skill Profile)</p>
                    </div>
                    <div className="bg-white p-8 rounded-[24px] shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-transform duration-300">
                        <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                            <Trophy className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">บันทึกความสำเร็จ</h3>
                        <p className="text-slate-600">รองรับการออกใบรับรอง (E-Certificate) อัตโนมัติเมื่อเข้าร่วมกิจกรรม เพื่อใช้เป็นแฟ้มผลงานในอนาคต</p>
                    </div>
                </div>
            </div>

            {/* College Info */}
            <div className="bg-white border-y border-slate-200 py-24">
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center gap-16">
                    <div className="md:w-1/2">
                        <div className="p-2 bg-slate-100 rounded-[32px] overflow-hidden aspect-[4/3] shadow-inner relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/about.jpg"
                                alt="University Campus"
                                className="w-full h-full object-cover rounded-[24px]"
                            />

                        </div>
                    </div>

                    <div className="md:w-1/2">
                        <h2 className="text-sm font-black tracking-widest text-blue-600 uppercase mb-3">วิศวกรรมซอฟต์แวร์ และ วิทยาการคอมพิวเตอร์</h2>
                        <h3 className="text-4xl font-black text-slate-900 mb-6 leading-tight">สร้างสรรค์นวัตกรรม<br />เพื่อความก้าวหน้า</h3>
                        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                            วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น มุ่งมั่นพัฒนาระบบนี้ขึ้นเพื่อตอบสนองการบริหารจัดการกิจกรรมภายในวิทยาลัย ลดขั้นตอนที่ซ้ำซ้อน และเปลี่ยนกระบวนการต่างๆ ให้อยู่ในรูปแบบดิจิทัลแบบ 100%
                        </p>
                        <ul className="space-y-4 mb-10">
                            <li className="flex items-center text-slate-700 font-medium">
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 shrink-0">✓</div>
                                ระบบจัดการผู้ใช้อัจฉริยะ (Role-based Access)
                            </li>
                            <li className="flex items-center text-slate-700 font-medium">
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 shrink-0">✓</div>
                                ระบบประเมินวัดทักษะอัตโนมัติ (Skill Assessment)
                            </li>
                            <li className="flex items-center text-slate-700 font-medium">
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 shrink-0">✓</div>
                                แดชบอร์ดติดตามสถานะและวิเคราะห์ข้อมูลแบบภาพรวม
                            </li>
                        </ul>
                        <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-8 shadow-xl font-bold h-14" asChild>
                            <Link href="/auth">เริ่มต้นใช้งานระบบ</Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-400 py-12 text-center text-sm font-medium">
                <p>© {new Date().getFullYear()} College of Computing, Khon Kaen University. All rights reserved.</p>
            </footer>
        </div>
    )
}
