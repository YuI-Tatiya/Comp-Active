import Link from "next/link"
import { Shield, ArrowLeft, GraduationCap, Building2 } from "lucide-react"

export default function RoleSelectorPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative font-sans">
            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[100px] opacity-70"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[100px] opacity-70"></div>
            </div>

            <div className="w-full max-w-4xl relative z-10">
                <Link
                    href="/"
                    className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors mb-12 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    กลับไปหน้าหลัก
                </Link>

                <div className="text-center mb-16 animate-in slide-in-from-bottom-4 duration-500 fade-in">
                    <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">เลือกประเภทผู้ใช้งาน</h1>
                    <p className="text-lg text-slate-600 max-w-xl mx-auto">กรุณาเลือกว่าคุณต้องการใช้งานระบบในฐานะผู้ใช้งาน/นักศึกษา หรือผู้จัดกิจกรรม</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-16 animate-in slide-in-from-bottom-8 duration-700 fade-in">
                    {/* Student Card */}
                    <Link
                        href="/auth/student"
                        className="group bg-white p-10 rounded-[32px] flex flex-col items-center justify-center text-center transition-all duration-300 hover:-translate-y-2 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 border border-slate-100 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        <div className="w-32 h-32 bg-blue-50 rounded-[32px] mb-8 flex items-center justify-center text-blue-500 group-hover:rotate-12 transition-transform duration-500 shadow-inner rotate-3">
                            <GraduationCap className="w-16 h-16" />
                        </div>

                        <h2 className="text-2xl font-bold mb-4 text-slate-800">นักศึกษา</h2>
                        <p className="text-slate-500 mb-8 text-sm">เข้าสู่ระบบเพื่อค้นหาและลงทะเบียนเข้าร่วมกิจกรรมต่างๆ</p>

                        <div className="w-full py-4 px-6 bg-slate-50 group-hover:bg-blue-600 text-slate-700 group-hover:text-white rounded-xl font-bold transition-colors">
                            เข้าใช้งานในฐานะผู้ใช้งาน
                        </div>
                    </Link>

                    {/* Event Organizer Card */}
                    <Link
                        href="/auth/organizer"
                        className="group bg-white p-10 rounded-[32px] flex flex-col items-center justify-center text-center transition-all duration-300 hover:-translate-y-2 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 border border-slate-100 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        <div className="w-32 h-32 bg-indigo-50 rounded-[32px] mb-8 flex items-center justify-center text-indigo-500 group-hover:rotate-12 transition-transform duration-500 shadow-inner -rotate-3">
                            <Building2 className="w-16 h-16" />
                        </div>

                        <h2 className="text-2xl font-bold mb-4 text-slate-800">ผู้จัดกิจกรรม</h2>
                        <p className="text-slate-500 mb-8 text-sm">ส่วนสำหรับหน่วยงานหรือผู้จัดการเพื่อสร้างและบริหารกิจกรรม</p>

                        <div className="w-full py-4 px-6 bg-slate-50 group-hover:bg-indigo-600 text-slate-700 group-hover:text-white rounded-xl font-bold transition-colors">
                            เข้าใช้งานในฐานะผู้จัดกิจกรรม
                        </div>
                    </Link>
                </div>

                <div className="text-center animate-in slide-in-from-bottom-10 duration-1000 fade-in delay-200">
                    <Link
                        href="/auth/admin"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                    >
                        <Shield className="w-4 h-4" />
                        เข้าสู่ระบบสำหรับ Admin
                    </Link>
                </div>
            </div>
        </div>
    )
}
