"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts"
import { registrationsAPI, evaluationsAPI, SkillsData, Activity, usersAPI } from "@/lib/api"
import { Select } from "@/components/ui/select"
import { EDUCATION_LEVELS, getProgramsByLevel, getYearOptions } from "@/lib/programs"

interface Registration {
    id: number;
    activityId: number;
    status: string;
    activity?: Activity;
}

export default function StudentProfilePage() {
    const { user } = useAuth()
    const [registrations, setRegistrations] = useState<Registration[]>([])
    const [skillsData, setSkillsData] = useState<SkillsData | null>(null)
    const [loading, setLoading] = useState(true)

    // Edit Profile State
    const [editForm, setEditForm] = useState({
        firstName: '',
        lastName: '',
        studentId: '',
        email: '',
        password: '',
        phone: '',
        educationLevel: '',
        program: '',
        yearLevel: ''
    })
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
    const [confirmPassword, setConfirmPassword] = useState("")

    useEffect(() => {
        if (user) {
            setEditForm(prev => ({
                ...prev,
                firstName: user.name?.split(' ')[0] || '',
                lastName: user.name?.split(' ').slice(1).join(' ') || '',
                email: user.email || '',
                // ห้าม fallback เป็น prefix ของอีเมล — จะกลายเป็นรหัสปลอมที่ validate ไม่ผ่าน
                studentId: user.studentId || '',
                phone: user.phone || '',
                educationLevel: user.educationLevel || '',
                program: user.program || '',
                yearLevel: user.yearLevel != null ? String(user.yearLevel) : ''
            }))
        }
        fetchData()
    }, [user])

    const fetchData = async () => {
        try {
            setLoading(true)
            const [regData, skillsRes] = await Promise.all([
                registrationsAPI.getMy() as Promise<Registration[]>,
                evaluationsAPI.getMySkills()
            ])
            setRegistrations(regData)
            setSkillsData(skillsRes)
        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setLoading(false)
        }
    }

    const chartData = skillsData ? [
        { subject: 'Teamwork', A: skillsData.average.teamwork, fullMark: 10 },
        { subject: 'Leadership', A: skillsData.average.leadership, fullMark: 10 },
        { subject: 'Communication', A: skillsData.average.communication, fullMark: 10 },
        { subject: 'Problem Solving', A: skillsData.average.problemSolving, fullMark: 10 },
        { subject: 'Adaptability', A: skillsData.average.adaptability, fullMark: 10 },
    ] : [
        { subject: 'Teamwork', A: 0, fullMark: 10 },
        { subject: 'Leadership', A: 0, fullMark: 10 },
        { subject: 'Communication', A: 0, fullMark: 10 },
        { subject: 'Problem Solving', A: 0, fullMark: 10 },
        { subject: 'Adaptability', A: 0, fullMark: 10 },
    ];

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setEditForm(prev => ({ ...prev, [name]: value }))
    }

    const handleSaveProfileClick = () => {
        setIsConfirmModalOpen(true)
    }

    const handleConfirmSave = async () => {
        if (!confirmPassword) {
            alert("กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยัน")
            return
        }

        // ข้อมูลการศึกษาต้องส่งครบชุด backend ถึงจะรับ (validateAcademicInfo)
        const hasAnyAcademic = Boolean(
            editForm.educationLevel || editForm.program || editForm.yearLevel
        )
        const hasAllAcademic = Boolean(
            editForm.educationLevel && editForm.program && editForm.yearLevel
        )
        if (hasAnyAcademic && !hasAllAcademic) {
            alert("กรุณาเลือกระดับการศึกษา สาขาวิชา และชั้นปีให้ครบทั้ง 3 ช่อง")
            return
        }

        // ⚠️ กฎเดียวกับ backend/src/common/constants/index.ts
        if (editForm.studentId && !/^\d{2}3380\d{3}-?\d$/.test(editForm.studentId)) {
            alert("รหัสนักศึกษาไม่ถูกต้อง")
            return
        }

        if (editForm.phone && !/^0[689]\d{8}$/.test(editForm.phone)) {
            alert("เบอร์มือถือไม่ถูกต้อง")
            return
        }

        try {
            const body = {
                name: `${editForm.firstName} ${editForm.lastName}`.trim(),
                // ส่งเฉพาะตอนมีค่า — @IsOptional ข้ามให้แค่ undefined ไม่ข้าม "" ที่จะโดน @Matches ตีตก
                ...(editForm.studentId ? { studentId: editForm.studentId } : {}),
                ...(editForm.phone ? { phone: editForm.phone } : {}),
                ...(hasAllAcademic
                    ? {
                        educationLevel: editForm.educationLevel,
                        program: editForm.program,
                        yearLevel: Number(editForm.yearLevel),
                    }
                    : {}),
                ...(editForm.password ? { newPassword: editForm.password } : {}),
                currentPassword: confirmPassword
            }
            await usersAPI.updateMe(body)
            alert("บันทึกข้อมูลส่วนตัวและรหัสผ่านเรียบร้อยแล้ว")
            setIsConfirmModalOpen(false)
            setConfirmPassword("")
            setEditForm(prev => ({ ...prev, password: '' })) // Clear password field
            
            // Reload user data
            fetchData()
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล")
        }
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Profile Header Widget */}
                <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div className="relative z-10 w-28 h-28 shrink-0 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-500/20 ring-4 ring-white">
                        <span className="text-4xl font-black">{user?.name?.charAt(0) || 'U'}</span>
                    </div>

                    <div className="relative z-10 flex-1 text-center md:text-left space-y-2">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{user?.name || 'ผู้ใช้งาน'}</h2>
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4 text-slate-500 font-medium">
                            <span className="bg-slate-100 px-3 py-1 rounded-full text-sm">{editForm.studentId || 'ไม่ระบุรหัสนักศึกษา'}</span>
                            <span className="bg-slate-100 px-3 py-1 rounded-full text-sm">{user?.email || 'ไม่ระบุอีเมล'}</span>
                        </div>
                    </div>
                </div>

                {/* Tabs Section */}
                <Tabs defaultValue="softskills" className="w-full">
                    <TabsList className="w-full h-auto p-1.5 bg-slate-200/60 rounded-full grid grid-cols-2 gap-1 shadow-inner mb-8 border border-slate-200/60">
                        <TabsTrigger
                            value="softskills"
                            className="rounded-full py-3 text-sm font-bold text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md transition-all"
                        >
                            Softskills
                        </TabsTrigger>
                        <TabsTrigger
                            value="edit"
                            className="rounded-full py-3 text-sm font-bold text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md transition-all"
                        >
                            แก้ไขข้อมูลส่วนตัว
                        </TabsTrigger>
                    </TabsList>

                    {/* SOFTSKILLS TAB */}
                    <TabsContent value="softskills" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                        <div className="bg-white rounded-[32px] p-8 lg:p-12 shadow-sm border border-slate-100">
                            <h3 className="text-2xl font-black text-slate-900 mb-1">Soft Skills Dashboard</h3>
                            <p className="text-slate-500 text-sm font-medium mb-12">ติดตามและพัฒนาทักษะของคุณผ่านการเข้าร่วมกิจกรรม</p>

                            {/* Stat Boxes */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                                <div className="h-28 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 flex flex-col items-center justify-center text-white shadow-lg shadow-blue-500/20 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <span className="font-black text-4xl mb-1 mt-auto z-10">LV {skillsData?.level || 1}</span>
                                    <span className="text-xs font-bold text-blue-100 uppercase tracking-wider mt-auto z-10">นักศึกษาปัจจุบัน</span>
                                </div>
                                <div className="h-28 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl p-6 flex flex-col items-center justify-center text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <span className="font-black text-4xl mb-1 mt-auto z-10">{skillsData?.points || 0}</span>
                                    <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider mt-auto z-10">แต้มสะสมทั้งหมด</span>
                                </div>
                                <div className="h-28 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-6 flex flex-col items-center justify-center text-white shadow-lg shadow-orange-500/20 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <span className="font-black text-4xl mb-1 mt-auto z-10">{registrations.filter(r => r.status === 'attended').length}</span>
                                    <span className="text-xs font-bold text-orange-100 uppercase tracking-wider mt-auto z-10">กิจกรรมที่เข้าร่วม</span>
                                </div>
                            </div>

                            {/* Radar Chart */}
                            <div className="w-full h-[450px] bg-slate-50 rounded-3xl p-6 border border-slate-100 mb-12 shadow-inner">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                                        <Radar name="Student Skills" dataKey="A" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorUv)" fillOpacity={0.7} />
                                        <defs>
                                            <linearGradient id="colorUv" x1="0" y1="0" x2="1" y2="1">
                                                <stop offset="0%" stopColor="#c084fc" stopOpacity={0.8} />
                                                <stop offset="50%" stopColor="#60a5fa" stopOpacity={0.8} />
                                                <stop offset="100%" stopColor="#34d399" stopOpacity={0.8} />
                                            </linearGradient>
                                        </defs>
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Evaluation History per Activity */}
                            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <h4 className="text-xl font-black text-slate-900">ผลการประเมิน Soft Skills ต่อกิจกรรม</h4>
                                </div>
                                <div className="space-y-4">
                                    {loading ? (
                                        <div className="text-center py-8 text-slate-500 font-medium animate-pulse">กำลังโหลดข้อมูล...</div>
                                    ) : skillsData?.history && skillsData.history.length > 0 ? (
                                        skillsData.history.map((entry) => {
                                            const awarded = Object.entries(entry.scores)
                                                .filter(([, v]) => v > 0)
                                                .map(([k]) => ({
                                                    teamwork: 'การทำงานเป็นทีม',
                                                    leadership: 'ภาวะผู้นำ',
                                                    communication: 'การสื่อสาร',
                                                    problemSolving: 'การแก้ปัญหา',
                                                    adaptability: 'การปรับตัว'
                                                }[k] || k))
                                            return (
                                                <div key={entry.id} className="p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between md:items-start gap-4 hover:bg-slate-50 transition-colors">
                                                    <div className="flex-1">
                                                        <h5 className="font-bold text-slate-900 text-base mb-3">{entry.activityName}</h5>
                                                        {awarded.length > 0 ? (
                                                            <div className="flex flex-wrap gap-2">
                                                                {awarded.map((skill, i) => (
                                                                    <span key={i} className="bg-purple-50 text-purple-700 border border-purple-100 px-3 py-1 rounded-lg text-xs font-bold">
                                                                        ✓ {skill}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 text-xs">ไม่มีทักษะที่ได้รับในการประเมินนี้</span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-slate-400 font-bold whitespace-nowrap md:pl-4 md:border-l md:border-slate-100">
                                                        {entry.date}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <div className="text-center py-12 text-slate-400 text-base font-bold bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                            ยังไม่มีผลประเมิน Soft Skills จากกิจกรรมใดๆ เลย
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </TabsContent>



                    {/* EDIT PROFILE TAB */}
                    <TabsContent value="edit" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                        <div className="bg-white rounded-[32px] p-8 lg:p-12 shadow-sm border border-slate-100">
                            <h3 className="font-black text-slate-900 mb-8 border-b border-slate-100 pb-4">Profile</h3>

                            <div className="space-y-6 max-w-2xl mx-auto">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-700">ชื่อ</Label>
                                        <Input
                                            name="firstName"
                                            value={editForm.firstName}
                                            onChange={handleEditChange}
                                            className="h-12 rounded-xl border-slate-200 font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-700">นามสกุล</Label>
                                        <Input
                                            name="lastName"
                                            value={editForm.lastName}
                                            onChange={handleEditChange}
                                            className="h-12 rounded-xl border-slate-200 font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-slate-700">รหัสนักศึกษา</Label>
                                    <Input
                                        name="studentId"
                                        placeholder="653380123-4"
                                        value={editForm.studentId}
                                        onChange={handleEditChange}
                                        className="h-12 rounded-xl border-slate-200 font-medium"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-slate-700">email (เฉพาะ KKU mail เท่านั้น)</Label>
                                    <Input
                                        name="email"
                                        type="email"
                                        value={editForm.email}
                                        onChange={handleEditChange}
                                        className="h-12 rounded-xl border-slate-200 font-medium"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-slate-700">เบอร์มือถือ</Label>
                                    <Input
                                        name="phone"
                                        type="tel"
                                        inputMode="numeric"
                                        maxLength={10}
                                        placeholder="0812345678"
                                        value={editForm.phone}
                                        onChange={(e) =>
                                            setEditForm((prev) => ({
                                                ...prev,
                                                phone: e.target.value.replace(/\D/g, ""),
                                            }))
                                        }
                                        className="h-12 rounded-xl border-slate-200 font-medium"
                                    />
                                </div>

                                {/* ── ข้อมูลการศึกษา ─────────────────────────────────── */}
                                <div className="rounded-xl border border-slate-200 p-4 space-y-4">
                                    <p className="text-sm font-bold text-slate-700">ข้อมูลการศึกษา</p>

                                    {(!editForm.educationLevel || !editForm.program || !editForm.yearLevel) && (
                                        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                                            กรุณาเพิ่มข้อมูลการศึกษาให้ครบถ้วน (ต้องกรอกครบทั้ง 3 ช่อง)
                                        </p>
                                    )}

                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-700">ระดับการศึกษา</Label>
                                        <Select
                                            value={editForm.educationLevel}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    educationLevel: e.target.value,
                                                    program: "",
                                                    yearLevel: "",
                                                }))
                                            }
                                            className="h-12 rounded-xl"
                                        >
                                            <option value="">เลือกระดับการศึกษา...</option>
                                            {EDUCATION_LEVELS.map((lv) => (
                                                <option key={lv.code} value={lv.code}>{lv.label}</option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-700">สาขาวิชา</Label>
                                        <Select
                                            value={editForm.program}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({ ...prev, program: e.target.value }))
                                            }
                                            disabled={!editForm.educationLevel}
                                            className="h-12 rounded-xl"
                                        >
                                            <option value="">เลือกสาขาวิชา...</option>
                                            {getProgramsByLevel(editForm.educationLevel).map((p) => (
                                                <option key={p.code} value={p.code}>{p.label}</option>
                                            ))}
                                        </Select>
                                        {!editForm.educationLevel && (
                                            <p className="text-xs text-slate-500">เลือกระดับการศึกษาก่อน</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-700">ชั้นปี</Label>
                                        <Select
                                            value={editForm.yearLevel}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({ ...prev, yearLevel: e.target.value }))
                                            }
                                            disabled={!editForm.educationLevel}
                                            className="h-12 rounded-xl"
                                        >
                                            <option value="">เลือกชั้นปี...</option>
                                            {getYearOptions(editForm.educationLevel).plan.length > 0 && (
                                                <optgroup label="ตามแผนการเรียน">
                                                    {getYearOptions(editForm.educationLevel).plan.map((y) => (
                                                        <option key={y} value={y}>ปี {y}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            {getYearOptions(editForm.educationLevel).extended.length > 0 && (
                                                <optgroup label="เกินแผนการเรียน">
                                                    {getYearOptions(editForm.educationLevel).extended.map((y) => (
                                                        <option key={y} value={y}>ปี {y}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </Select>
                                        {!editForm.educationLevel && (
                                            <p className="text-xs text-slate-500">เลือกระดับการศึกษาก่อน</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-slate-700">แก้ไขรหัสผ่าน</Label>
                                    <Input
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={editForm.password}
                                        onChange={handleEditChange}
                                        className="h-12 rounded-xl border-slate-200 font-medium"
                                    />
                                </div>

                                <div className="pt-8 flex justify-end gap-4 border-t border-slate-100">
                                    <Button variant="outline" className="h-12 px-8 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50">ยกเลิก</Button>
                                    <Button onClick={handleSaveProfileClick} className="h-12 px-8 rounded-xl font-bold bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-sm">ยืนยันการแก้ไข</Button>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Confirmation Modal */}
            <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
                <DialogContent className="sm:max-w-md rounded-[24px] p-0 overflow-hidden bg-slate-200 border-none shadow-2xl">
                    <div className="p-8 pb-10">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">กรอกรหัสผ่านเพื่อเปลี่ยนแปลงข้อมูล</h2>
                            <button onClick={() => setIsConfirmModalOpen(false)} className="text-slate-500 hover:text-slate-900 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <Input
                            type="password"
                            className="h-14 bg-white rounded-xl border-none shadow-inner text-center font-bold text-lg mb-8"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />

                        <div className="flex justify-center mb-10">
                            <button className="text-sm font-bold text-slate-600 border-b border-slate-500 pb-0.5 hover:text-slate-900 hover:border-slate-900 transition-all">
                                ยืนยันตัวตนด้วย KKU Mail
                            </button>
                        </div>

                        <div className="flex justify-center gap-4">
                            <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)} className="h-12 w-32 rounded-xl font-bold bg-white/80 border-slate-300 text-slate-600 hover:bg-white hover:text-slate-900">ยกเลิก</Button>
                            <Button onClick={handleConfirmSave} className="h-12 w-32 rounded-xl font-bold bg-white/80 border-slate-300 text-slate-800 hover:bg-white border">ยืนยันการแก้ไข</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    )
}
