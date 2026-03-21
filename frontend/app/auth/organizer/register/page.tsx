"use client"

import Link from "next/link"
import { ArrowLeft, CheckCircle2, ClipboardList, Clock, Mail, ExternalLink, CalendarPlus, ShieldCheck, Zap, Users, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function OrganizerRegisterPage() {
    // ผู้พัฒนาระบบสามารถเปลี่ยน Link Google Form ตรงนี้ได้เลย
    const GOOGLE_FORM_URL = "https://forms.google.com/"

    const benefits = [
        {
            icon: <CalendarPlus className="w-6 h-6 text-indigo-500" />,
            title: "สร้างและจัดการกิจกรรม",
            description: "ระบบดูแลการจัดการกิจกรรมครบวงจรตั้งแต่เริ่มจนจบ"
        },
        {
            icon: <Users className="w-6 h-6 text-blue-500" />,
            title: "ระบบจัดการผู้เข้าร่วมที่รวดเร็ว",
            description: "เช็คอินด้วย QR Code และติดตามสถานะผู้เข้าร่วมเรียลไทม์"
        },
        {
            icon: <Zap className="w-6 h-6 text-amber-500" />,
            title: "เครื่องมือวิเคราะห์สถิติ",
            description: "ดูข้อมูลเชิงลึกและประสิทธิภาพของกิจกรรมที่คุณจัด"
        },
        {
            icon: <ShieldCheck className="w-6 h-6 text-emerald-500" />,
            title: "ออกเกียรติบัตรอัตโนมัติ",
            description: "ระบบสร้างและแจกจ่ายเกียรติบัตรออนไลน์ให้ผู้ผ่านกิจกรรม"
        }
    ]

    const steps = [
        {
            icon: <ClipboardList className="w-5 h-5 text-indigo-600" />,
            title: "กรอกแบบฟอร์มลงทะเบียน",
            description: "ให้ข้อมูลเบื้องต้นและรายละเอียดหน่วยงานของคุณผ่าน Google Form"
        },
        {
            icon: <Clock className="w-5 h-5 text-indigo-600" />,
            title: "รอการตรวจสอบ",
            description: "ผู้ดูแลระบบจะใช้เวลา 1-2 วันทำการในการตรวจสอบข้อมูลของคุณ"
        },
        {
            icon: <Mail className="w-5 h-5 text-indigo-600" />,
            title: "รับอีเมลยืนยัน",
            description: "เมื่อผ่านการอนุมัติ คุณจะได้รับอีเมลพร้อมรหัสผ่านเพื่อเข้าสู่ระบบ"
        },
        {
            icon: <CheckCircle2 className="w-5 h-5 text-indigo-600" />,
            title: "เริ่มต้นใช้งานได้ทันที",
            description: "เข้าสู่ระบบและเริ่มสร้างสรรค์กิจกรรมแรกของคุณได้เลย!"
        }
    ]

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-indigo-100 selection:text-indigo-900">
            <div className="max-w-5xl mx-auto">

                {/* Header / Nav */}
                <div className="mb-8">
                    <Link
                        href="/auth/organizer"
                        className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 hover:border-indigo-200"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        ย้อนกลับไปหน้าเข้าสู่ระบบ
                    </Link>
                </div>

                {/* Main Content Area */}
                <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="grid lg:grid-cols-5 min-h-[600px]">

                        {/* Left Side: Hero Information */}
                        <div className="lg:col-span-3 p-10 lg:p-14 bg-gradient-to-br from-indigo-50 to-white relative overflow-hidden">
                            {/* Decorative background blooms */}
                            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-indigo-100/50 mix-blend-multiply blur-3xl pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-100/50 mix-blend-multiply blur-3xl pointer-events-none"></div>

                            <div className="relative z-10">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wider mb-6">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                    </span>
                                    เปิดรับสมัคร Organizer
                                </div>
                                <h1 className="text-4xl lg:text-5xl font-black text-slate-900 mb-6 leading-[1.15] tracking-tight">
                                    ยกระดับการจัดกิจกรรม <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">
                                        แบบมืออาชีพ
                                    </span>
                                </h1>
                                <p className="text-lg text-slate-600 font-medium mb-12 max-w-xl leading-relaxed">
                                    ร่วมเป็นส่วนหนึ่งในฐานะผู้จัดกิจกรรมของวิทยาลัยการคอมพิวเตอร์ เพื่อเข้าถึงเครื่องมือจัดการที่ครบครัน และสร้างสรรค์ประสบการณ์ที่ดีให้กับผู้เข้าร่วม
                                </p>

                                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-8 mt-12">
                                    {benefits.map((benefit, idx) => (
                                        <div key={idx} className="flex gap-4">
                                            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center">
                                                {benefit.icon}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 mb-1 leading-snug">{benefit.title}</h3>
                                                <p className="text-sm text-slate-500 leading-relaxed font-medium">{benefit.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Process and CTA */}
                        <div className="lg:col-span-2 p-10 lg:p-14 bg-white border-l border-slate-100 flex flex-col justify-center">
                            <h2 className="text-2xl font-black text-slate-900 mb-8">ขั้นตอนการสมัคร</h2>

                            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                {steps.map((step, idx) => (
                                    <div key={idx} className="relative flex items-start gap-4">
                                        <div className="absolute left-0 w-[24px] h-[24px] rounded-full bg-indigo-50 border-[4px] border-white shadow-sm flex items-center justify-center z-10 ring-1 ring-slate-200 ring-offset-2 ring-offset-white">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                        </div>
                                        <div className="pl-10">
                                            <div className="flex items-center gap-2 mb-1">
                                                {step.icon}
                                                <h4 className="font-bold text-slate-800 text-sm">{step.title}</h4>
                                            </div>
                                            <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                                {step.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-12 pt-8 border-t border-slate-100">
                                <Link href={GOOGLE_FORM_URL} target="_blank" rel="noopener noreferrer" className="block w-full">
                                    <Button className="w-full h-14 bg-indigo-600 hover:bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 transition-all hover:-translate-y-1 flex items-center justify-center gap-3">
                                        <FileText className="w-5 h-5" />
                                        ไปที่ฟอร์มลงทะเบียน
                                        <ExternalLink className="w-4 h-4 ml-1 opacity-70" />
                                    </Button>
                                </Link>
                                <p className="text-center text-xs text-slate-400 font-medium mt-4">
                                    ลิงก์จะพาคุณไปยัง Google Form เพื่อกรอกข้อมูล
                                </p>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    )
}
