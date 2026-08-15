"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Target, Users, BookOpen, Trophy } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Container } from "@/components/layout/container"

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-surface font-sans">
            <SiteHeader />

            {/* Hero Section */}
            <div className="bg-gradient-to-br from-brand-600 to-brand-900 py-24 relative overflow-hidden">
                {/* Background Patterns */}

                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-500/30 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/4"></div>

                <Container className="relative z-10 text-center">
                    <h1 className="text-4xl md:text-6xl font-black text-white mb-6">เกี่ยวกับระบบจัดการกิจกรรม</h1>
                    <p className="text-xl text-brand-100 max-w-3xl mx-auto font-medium">
                        แพลตฟอร์มที่เชื่อมโยงนักศึกษาเข้ากับโอกาสในการพัฒนาตนเองผ่านกิจกรรมนอกห้องเรียน<br className="hidden md:block" />
                        เสริมสร้างประสบการณ์และเติมเต็มศักยภาพอย่างรอบด้าน
                    </p>
                </Container>
            </div>

            {/* Core Values / Business Logic */}
            <Container className="py-24 -mt-10 relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-bg p-8 rounded-[24px] shadow-xl shadow-fg/5 border border-border hover:-translate-y-2 transition-transform duration-300">
                        <div className="w-14 h-14 bg-cat-tech-bg text-cat-tech rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                            <Target className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-fg mb-3">เป้าหมายชัดเจน</h3>
                        <p className="text-fg-muted">รวบรวมกิจกรรมจากทุกภาคส่วน เพื่อให้นักศึกษาค้นพบกิจกรรมที่ตอบโจทย์ความสนใจและเป้าหมายในอาชีพของตนเอง</p>
                    </div>
                    <div className="bg-bg p-8 rounded-[24px] shadow-xl shadow-fg/5 border border-border hover:-translate-y-2 transition-transform duration-300">
                        <div className="w-14 h-14 bg-cat-volunteer-bg text-cat-volunteer rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                            <Users className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-fg mb-3">พัฒนาเครือข่าย</h3>
                        <p className="text-fg-muted">เปิดโอกาสให้นักศึกษาได้เรียนรู้การทำงานร่วมกับผู้อื่น สร้างเครือข่ายและความสัมพันธ์ที่ดีในรั้วมหาวิทยาลัย</p>
                    </div>
                    <div className="bg-bg p-8 rounded-[24px] shadow-xl shadow-fg/5 border border-border hover:-translate-y-2 transition-transform duration-300">
                        <div className="w-14 h-14 bg-cat-sports-bg text-cat-sports rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                            <BookOpen className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-fg mb-3">เรียนรู้ตลอดชีวิต</h3>
                        <p className="text-fg-muted">ส่งเสริมและวัดประเมินผลทักษะ Soft Skills ต่างๆ นอกเหนือจากวิชาการ ผ่านระบบสะสมทักษะ (Skill Profile)</p>
                    </div>
                    <div className="bg-bg p-8 rounded-[24px] shadow-xl shadow-fg/5 border border-border hover:-translate-y-2 transition-transform duration-300">
                        <div className="w-14 h-14 bg-cat-academic-bg text-cat-academic rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                            <Trophy className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-fg mb-3">บันทึกความสำเร็จ</h3>
                        <p className="text-fg-muted">รองรับการออกใบรับรอง (E-Certificate) อัตโนมัติเมื่อเข้าร่วมกิจกรรม เพื่อใช้เป็นแฟ้มผลงานในอนาคต</p>
                    </div>
                </div>
            </Container>

            {/* College Info */}
            <div className="bg-bg border-y border-border py-24">
                <Container className="flex flex-col md:flex-row items-center gap-16">
                    <div className="md:w-1/2">
                        <div className="p-2 bg-surface rounded-[32px] overflow-hidden aspect-[4/3] shadow-inner relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/about.jpg"
                                alt="University Campus"
                                className="w-full h-full object-cover rounded-[24px]"
                            />

                        </div>
                    </div>

                    <div className="md:w-1/2">
                        <h2 className="text-sm font-black tracking-widest text-brand-600 uppercase mb-3">วิศวกรรมซอฟต์แวร์ และ วิทยาการคอมพิวเตอร์</h2>
                        <h3 className="text-4xl font-black text-fg mb-6 leading-tight">สร้างสรรค์นวัตกรรม<br />เพื่อความก้าวหน้า</h3>
                        <p className="text-lg text-fg-muted mb-8 leading-relaxed">
                            วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น มุ่งมั่นพัฒนาระบบนี้ขึ้นเพื่อตอบสนองการบริหารจัดการกิจกรรมภายในวิทยาลัย ลดขั้นตอนที่ซ้ำซ้อน และเปลี่ยนกระบวนการต่างๆ ให้อยู่ในรูปแบบดิจิทัลแบบ 100%
                        </p>
                        <ul className="space-y-4 mb-10">
                            <li className="flex items-center text-fg-muted font-medium">
                                <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mr-3 shrink-0">✓</div>
                                ระบบจัดการผู้ใช้อัจฉริยะ (Role-based Access)
                            </li>
                            <li className="flex items-center text-fg-muted font-medium">
                                <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mr-3 shrink-0">✓</div>
                                ระบบประเมินวัดทักษะอัตโนมัติ (Skill Assessment)
                            </li>
                            <li className="flex items-center text-fg-muted font-medium">
                                <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mr-3 shrink-0">✓</div>
                                แดชบอร์ดติดตามสถานะและวิเคราะห์ข้อมูลแบบภาพรวม
                            </li>
                        </ul>
                        <Button size="lg" className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl px-8 shadow-xl font-bold h-14" asChild>
                            <Link href="/auth">เริ่มต้นใช้งานระบบ</Link>
                        </Button>
                    </div>
                </Container>
            </div>

            <SiteFooter />
        </div>
    )
}
