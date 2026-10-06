"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { X, Trophy, TrendingUp, CalendarCheck, Search, BarChart3, UserRound } from "lucide-react"
import { Toast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Container } from "@/components/layout/container"
import { StatTile } from "@/components/ui/stat-tile"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { formatEventDate } from "@/components/ui/event-card"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts"
import { registrationsAPI, evaluationsAPI, SkillsData, Activity, usersAPI } from "@/lib/api"
import { SOFT_SKILLS, softSkillLabelByField } from "@/lib/soft-skills"
import { Select } from "@/components/ui/select"
import { EDUCATION_LEVELS, getProgramsByLevel } from "@/lib/programs"

interface Registration {
    id: number;
    activityId: number;
    status: string;
    activity?: Activity;
}

const EMPTY_FORM = {
    firstName: "",
    lastName: "",
    studentId: "",
    email: "",
    password: "",
    phone: "",
    educationLevel: "",
    program: "",
}

export default function StudentProfilePage() {
    const { user, refreshUser } = useAuth()
    const [, setRegistrations] = useState<Registration[]>([])
    const [skillsData, setSkillsData] = useState<SkillsData | null>(null)
    const [loading, setLoading] = useState(true)

    // ตัวกรอง "ผลการประเมิน Soft Skills ต่อกิจกรรม"
    const [historySearch, setHistorySearch] = useState("")
    const [historySkillFilter, setHistorySkillFilter] = useState("")
    const [historySort, setHistorySort] = useState<"newest" | "oldest" | "name">("newest")

    const [editForm, setEditForm] = useState(EMPTY_FORM)
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
    const [confirmPassword, setConfirmPassword] = useState("")

    const [modalError, setModalError] = useState("")
    const [submitting, setSubmitting] = useState(false)

    // ป๊อปอัปแจ้งผลสำเร็จ แทนแบนเนอร์แจ้งเตือนแบบเดิม
    const [toast, setToast] = useState<{ open: boolean; message: string; description?: string }>({
        open: false,
        message: "",
    })
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const showToast = (message: string, description?: string) => {
        setToast({ open: true, message, description })
        if (toastTimer.current) clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast((prev) => ({ ...prev, open: false })), 2800)
    }

    useEffect(() => {
        return () => {
            if (toastTimer.current) clearTimeout(toastTimer.current)
        }
    }, [])

    /** ดึงค่าจาก user มาใส่ฟอร์ม — ใช้ทั้งตอนโหลดและตอนกดยกเลิก */
    function formFromUser() {
        return {
            ...EMPTY_FORM,
            firstName: user?.name?.split(" ")[0] || "",
            lastName: user?.name?.split(" ").slice(1).join(" ") || "",
            email: user?.email || "",
            // ห้าม fallback เป็น prefix ของอีเมล — จะกลายเป็นรหัสปลอมที่ validate ไม่ผ่าน
            studentId: user?.studentId || "",
            phone: user?.phone || "",
            educationLevel: user?.educationLevel || "",
            program: user?.program || "",
        }
    }

    useEffect(() => {
        if (user) setEditForm(formFromUser())
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user])

    const fetchData = async () => {
        try {
            setLoading(true)
            const [regData, skillsRes] = await Promise.all([
                registrationsAPI.getMy() as Promise<Registration[]>,
                evaluationsAPI.getMySkills(),
            ])
            setRegistrations(regData)
            setSkillsData(skillsRes)
        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setLoading(false)
        }
    }

    const chartData = SOFT_SKILLS.map((s) => ({
        subject: s.label,
        A: skillsData?.average[s.field] ?? 0,
        fullMark: 1,
    }))

    const historyQuery = historySearch.trim().toLowerCase()
    const filteredHistory = (skillsData?.history ?? [])
        .filter((entry) => !historyQuery || entry.activityName.toLowerCase().includes(historyQuery))
        .filter((entry) => !historySkillFilter || (entry.scores[historySkillFilter as keyof typeof entry.scores] ?? 0) > 0)
        .sort((a, b) => {
            if (historySort === "name") return a.activityName.localeCompare(b.activityName, "th")
            const da = new Date(a.date).getTime()
            const db = new Date(b.date).getTime()
            return historySort === "oldest" ? da - db : db - da
        })

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setEditForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleSaveProfileClick = () => {
        setModalError("")
        setConfirmPassword("")
        setIsConfirmModalOpen(true)
    }

    /** ปิด Dialog แล้วล้างรหัสผ่านที่พิมพ์ค้างไว้ */
    const closeConfirmModal = () => {
        if (submitting) return
        setIsConfirmModalOpen(false)
        setConfirmPassword("")
        setModalError("")
    }

    const handleConfirmSave = async () => {
        if (!confirmPassword) {
            setModalError("กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยัน")
            return
        }

        // ข้อมูลการศึกษาต้องส่งครบชุด backend ถึงจะรับ (validateAcademicInfo)
        const hasAnyAcademic = Boolean(editForm.educationLevel || editForm.program)
        const hasAllAcademic = Boolean(editForm.educationLevel && editForm.program)
        if (hasAnyAcademic && !hasAllAcademic) {
            setModalError("กรุณาเลือกระดับการศึกษาและหลักสูตรให้ครบ")
            return
        }

        // ⚠️ กฎเดียวกับ backend/src/common/constants/index.ts
        if (editForm.studentId && !/^\d{2}3380\d{3}-?\d$/.test(editForm.studentId)) {
            setModalError("รหัสนักศึกษาไม่ถูกต้อง")
            return
        }

        if (editForm.phone && !/^0[689]\d{8}$/.test(editForm.phone)) {
            setModalError("เบอร์มือถือไม่ถูกต้อง")
            return
        }

        setSubmitting(true)
        setModalError("")
        try {
            const body = {
                name: `${editForm.firstName} ${editForm.lastName}`.trim(),
                // ส่งเฉพาะตอนมีค่า — @IsOptional ข้ามให้แค่ undefined ไม่ข้าม "" ที่จะโดน @Matches ตีตก
                ...(editForm.studentId ? { studentId: editForm.studentId } : {}),
                ...(editForm.phone ? { phone: editForm.phone } : {}),
                ...(hasAllAcademic
                    ? { educationLevel: editForm.educationLevel, program: editForm.program }
                    : {}),
                ...(editForm.password ? { newPassword: editForm.password } : {}),
                currentPassword: confirmPassword,
                // ⚠️ ห้ามส่ง email — backend ไม่รับ และ forbidNonWhitelisted จะตีกลับ 400
            }
            await usersAPI.updateMe(body)

            setIsConfirmModalOpen(false)
            setConfirmPassword("")
            setEditForm((prev) => ({ ...prev, password: "" }))
            showToast("บันทึกข้อมูลสำเร็จ!", "ข้อมูลส่วนตัวของคุณได้รับการอัปเดตเรียบร้อยแล้ว")

            // โหลด user ใหม่ ไม่งั้นชื่อบนหัวหน้าและ navbar ยังเป็นของเดิม
            await refreshUser()
            fetchData()
        } catch (error: unknown) {
            setModalError(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        // ไม่ใส่ min-h-screen — app/student/layout.tsx จัดการให้แล้ว
        <div className="bg-surface font-sans">
            <Container className="space-y-8 py-12">
                <div className="mx-auto max-w-4xl space-y-8">
                    {/* หัวโปรไฟล์ */}
                    <div className="space-y-2 rounded-2xl border border-border bg-bg p-8 shadow-xs md:p-12">
                        <h2 className="text-3xl font-bold tracking-tight text-fg">
                            {user?.name || "ผู้ใช้งาน"}
                        </h2>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                            <Badge variant="neutral">{user?.studentId || "ไม่ระบุรหัสนักศึกษา"}</Badge>
                            <Badge variant="neutral">{user?.email || "ไม่ระบุอีเมล"}</Badge>
                        </div>
                    </div>

                    <Tabs defaultValue="softskills" className="w-full">
                        {/* h-auto: TabsList มี h-10 เป็นค่าเริ่มต้น เตี้ยกว่าปุ่ม (py-3) + padding กรอบ ปุ่มจึงโผล่พ้นกรอบ */}
                        <TabsList className="mb-8 grid h-auto w-full grid-cols-2 gap-1 rounded-full bg-surface-2 p-1.5">
                            <TabsTrigger
                                value="softskills"
                                className="gap-2 rounded-full py-3 text-sm font-semibold text-fg-muted data-[state=active]:bg-bg data-[state=active]:text-brand-600 data-[state=active]:shadow-xs"
                            >
                                <BarChart3 className="h-4 w-4 shrink-0" aria-hidden="true" />
                                Soft Skills
                            </TabsTrigger>
                            <TabsTrigger
                                value="edit"
                                className="gap-2 rounded-full py-3 text-sm font-semibold text-fg-muted data-[state=active]:bg-bg data-[state=active]:text-brand-600 data-[state=active]:shadow-xs"
                            >
                                <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
                                แก้ไขข้อมูลส่วนตัว
                            </TabsTrigger>
                        </TabsList>

                        {/* ── แท็บ Soft Skills ───────────────────────────────── */}
                        <TabsContent value="softskills" className="space-y-6">
                            <div className="rounded-2xl border border-border bg-bg p-8 shadow-xs lg:p-12">
                                <h3 className="text-2xl font-bold text-fg">Soft Skills Dashboard</h3>
                                <p className="mb-10 mt-1 text-sm text-fg-muted">
                                    ติดตามและพัฒนาทักษะของคุณผ่านการเข้าร่วมกิจกรรม
                                </p>

                                <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
                                    <StatTile
                                        label="อันดับในระบบ"
                                        value={loading || !skillsData ? "—" : `#${skillsData.rank}`}
                                        caption={loading || !skillsData ? undefined : `จากนักศึกษาทั้งหมด ${skillsData.totalStudents} คน`}
                                        icon={Trophy}
                                    />
                                    <StatTile
                                        label="แต้มสะสมทั้งหมด"
                                        value={loading ? "—" : (skillsData?.totalScore ?? 0).toLocaleString("th-TH")}
                                        icon={TrendingUp}
                                    />
                                    {/* เดิมนับ r.status === 'attended' ซึ่งเป็นไปไม่ได้ (attended อยู่ในฟิลด์ attendance) */}
                                    <StatTile
                                        label="กิจกรรมที่เข้าร่วม"
                                        value={loading ? "—" : (skillsData?.count ?? 0)}
                                        icon={CalendarCheck}
                                    />
                                </div>

                                {/* กราฟเรดาร์ — recharts ต้องการค่าสีจริง ใช้ var() ของ token ได้ */}
                                <div className="mb-10 h-[450px] w-full rounded-2xl border border-border bg-surface p-6">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                                            <PolarGrid stroke="var(--color-border)" />
                                            <PolarAngleAxis
                                                dataKey="subject"
                                                tick={{ fill: "var(--color-fg-muted)", fontSize: 12, fontWeight: 600 }}
                                            />
                                            <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                                            <Radar
                                                name="ทักษะของนักศึกษา"
                                                dataKey="A"
                                                stroke="var(--color-brand-600)"
                                                strokeWidth={2}
                                                fill="var(--color-brand-500)"
                                                fillOpacity={0.35}
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* ประวัติการประเมินรายกิจกรรม */}
                                <div className="rounded-2xl border border-border bg-bg p-8 shadow-xs">
                                    <h4 className="mb-6 text-xl font-bold text-fg">
                                        ผลการประเมิน Soft Skills ต่อกิจกรรม
                                    </h4>

                                    {!loading && skillsData?.history && skillsData.history.length > 0 && (
                                        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                                            <div className="relative w-full sm:max-w-xs">
                                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
                                                <Input
                                                    type="text"
                                                    placeholder="ค้นหาชื่อกิจกรรม..."
                                                    className="h-10 rounded-lg pl-10"
                                                    value={historySearch}
                                                    onChange={(e) => setHistorySearch(e.target.value)}
                                                />
                                            </div>
                                            <Select
                                                className="h-10 rounded-lg sm:w-56"
                                                value={historySkillFilter}
                                                onChange={(e) => setHistorySkillFilter(e.target.value)}
                                            >
                                                <option value="">ทุกทักษะ</option>
                                                {SOFT_SKILLS.map((s) => (
                                                    <option key={s.field} value={s.field}>{s.label}</option>
                                                ))}
                                            </Select>
                                            <Select
                                                className="h-10 rounded-lg sm:w-44"
                                                value={historySort}
                                                onChange={(e) => setHistorySort(e.target.value as typeof historySort)}
                                            >
                                                <option value="newest">ล่าสุดก่อน</option>
                                                <option value="oldest">เก่าสุดก่อน</option>
                                                <option value="name">ชื่อ ก-ฮ</option>
                                            </Select>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        {loading ? (
                                            <div className="animate-pulse py-8 text-center font-medium text-fg-muted">
                                                กำลังโหลดข้อมูล...
                                            </div>
                                        ) : !skillsData?.history || skillsData.history.length === 0 ? (
                                            <div className="rounded-xl border border-border bg-surface py-12 text-center font-medium text-fg-muted">
                                                ยังไม่มีผลประเมิน Soft Skills จากกิจกรรมใดๆ เลย
                                            </div>
                                        ) : filteredHistory.length === 0 ? (
                                            <div className="rounded-xl border border-border bg-surface py-12 text-center">
                                                <p className="font-medium text-fg-muted">ไม่พบผลการประเมินที่ตรงกับตัวกรอง</p>
                                                <Button
                                                    variant="outline"
                                                    className="mt-4 rounded-xl"
                                                    onClick={() => {
                                                        setHistorySearch("")
                                                        setHistorySkillFilter("")
                                                    }}
                                                >
                                                    ล้างตัวกรอง
                                                </Button>
                                            </div>
                                        ) : (
                                            filteredHistory.map((entry) => {
                                                const awarded = Object.entries(entry.scores)
                                                    .filter(([, v]) => v > 0)
                                                    .map(([k]) => softSkillLabelByField(k))
                                                return (
                                                    <div
                                                        key={entry.id}
                                                        className="flex flex-col justify-between gap-4 rounded-xl border border-border p-5 transition-colors hover:bg-surface md:flex-row md:items-start"
                                                    >
                                                        <div className="flex-1">
                                                            <h5 className="mb-3 text-base font-semibold text-fg">
                                                                {entry.activityName}
                                                            </h5>
                                                            {awarded.length > 0 ? (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {awarded.map((skill, i) => (
                                                                        <Badge key={i} variant="success">✓ {skill}</Badge>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-fg-subtle">
                                                                    ไม่มีทักษะที่ได้รับในการประเมินนี้
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="whitespace-nowrap text-sm font-medium text-fg-subtle md:border-l md:border-border md:pl-4">
                                                            {formatEventDate(entry.date)}
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* ── แท็บแก้ไขข้อมูล ────────────────────────────────── */}
                        <TabsContent value="edit" className="space-y-6">
                            <div className="rounded-2xl border border-border bg-bg p-8 shadow-xs lg:p-12">
                                <h3 className="mb-8 border-b border-border pb-4 text-lg font-bold text-fg">
                                    ข้อมูลส่วนตัว
                                </h3>

                                <div className="mx-auto max-w-2xl space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="firstName">ชื่อ</Label>
                                            <Input
                                                id="firstName"
                                                name="firstName"
                                                value={editForm.firstName}
                                                onChange={handleEditChange}
                                                className="h-12 rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="lastName">นามสกุล</Label>
                                            <Input
                                                id="lastName"
                                                name="lastName"
                                                value={editForm.lastName}
                                                onChange={handleEditChange}
                                                className="h-12 rounded-xl"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="studentId">รหัสนักศึกษา</Label>
                                        <Input
                                            id="studentId"
                                            name="studentId"
                                            placeholder="653380123-4"
                                            value={editForm.studentId}
                                            onChange={handleEditChange}
                                            className="h-12 rounded-xl"
                                        />
                                    </div>

                                    {/* อีเมลแก้ไม่ได้ — backend ไม่รับฟิลด์นี้ เดิมช่องนี้แก้ได้แต่ข้อมูลถูกทิ้งเงียบ ๆ */}
                                    <div className="space-y-2">
                                        <Label htmlFor="email">อีเมล</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={editForm.email}
                                            disabled
                                            readOnly
                                            className="h-12 rounded-xl"
                                        />
                                        <p className="text-xs text-fg-subtle">
                                            อีเมลใช้สำหรับเข้าสู่ระบบ เปลี่ยนเองไม่ได้ — ติดต่อผู้ดูแลระบบ
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">เบอร์มือถือ</Label>
                                        <Input
                                            id="phone"
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
                                            className="h-12 rounded-xl"
                                        />
                                    </div>

                                    {/* ── ข้อมูลการศึกษา ─────────────────────────── */}
                                    <div className="space-y-4 rounded-xl border border-border p-4">
                                        <p className="text-sm font-semibold text-fg">ข้อมูลการศึกษา</p>

                                        {(!editForm.educationLevel || !editForm.program) && (
                                            <p className="rounded-lg bg-warning-bg p-3 text-sm text-warning">
                                                กรุณาเพิ่มข้อมูลการศึกษาให้ครบถ้วน (ต้องกรอกครบทั้ง 2 ช่อง)
                                            </p>
                                        )}

                                        <div className="space-y-2">
                                            <Label htmlFor="educationLevel">ระดับการศึกษา</Label>
                                            <Select
                                                id="educationLevel"
                                                value={editForm.educationLevel}
                                                onChange={(e) =>
                                                    setEditForm((prev) => ({
                                                        ...prev,
                                                        educationLevel: e.target.value,
                                                        program: "",
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
                                            <Label htmlFor="program">หลักสูตร</Label>
                                            <Select
                                                id="program"
                                                value={editForm.program}
                                                onChange={(e) =>
                                                    setEditForm((prev) => ({ ...prev, program: e.target.value }))
                                                }
                                                disabled={!editForm.educationLevel}
                                                className="h-12 rounded-xl"
                                            >
                                                <option value="">เลือกหลักสูตร...</option>
                                                {getProgramsByLevel(editForm.educationLevel).map((p) => (
                                                    <option key={p.code} value={p.code}>{p.label}</option>
                                                ))}
                                            </Select>
                                            {!editForm.educationLevel && (
                                                <p className="text-xs text-fg-subtle">เลือกระดับการศึกษาก่อน</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password">แก้ไขรหัสผ่าน</Label>
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autoComplete="new-password"
                                            placeholder="••••••••"
                                            value={editForm.password}
                                            onChange={handleEditChange}
                                            className="h-12 rounded-xl"
                                        />
                                        <p className="text-xs text-fg-subtle">เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน</p>
                                    </div>

                                    <div className="flex justify-end gap-4 border-t border-border pt-8">
                                        {/* เดิมปุ่มนี้ไม่มี onClick — กดแล้วไม่เกิดอะไรขึ้น */}
                                        <Button
                                            variant="outline"
                                            className="h-12 rounded-xl px-8 font-bold"
                                            onClick={() => setEditForm(formFromUser())}
                                        >
                                            ยกเลิก
                                        </Button>
                                        <Button
                                            onClick={handleSaveProfileClick}
                                            className="h-12 rounded-xl px-8 font-bold"
                                        >
                                            ยืนยันการแก้ไข
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </Container>

            {/* Dialog ยืนยันด้วยรหัสผ่าน */}
            <Dialog open={isConfirmModalOpen} onOpenChange={(open) => !open && closeConfirmModal()}>
                <DialogContent className="overflow-hidden rounded-2xl p-0 sm:max-w-md">
                    <div className="p-8">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <h2 className="text-xl font-bold tracking-tight text-fg">
                                กรอกรหัสผ่านเพื่อเปลี่ยนแปลงข้อมูล
                            </h2>
                            <button
                                type="button"
                                onClick={closeConfirmModal}
                                disabled={submitting}
                                aria-label="ปิด"
                                className="shrink-0 text-fg-subtle transition-colors hover:text-fg disabled:opacity-50"
                            >
                                <X className="size-5" aria-hidden="true" />
                            </button>
                        </div>

                        {modalError && (
                            <div
                                role="alert"
                                className="mb-4 rounded-xl border border-border bg-danger-bg p-3 text-sm text-danger"
                            >
                                {modalError}
                            </div>
                        )}

                        <div className="mb-8 space-y-2">
                            <Label htmlFor="confirm-password">รหัสผ่านปัจจุบัน</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                autoComplete="current-password"
                                placeholder="••••••••"
                                className="h-12 rounded-xl"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={submitting}
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={closeConfirmModal}
                                disabled={submitting}
                                className="h-12 w-32 rounded-xl font-bold"
                            >
                                ยกเลิก
                            </Button>
                            <Button
                                onClick={handleConfirmSave}
                                disabled={submitting}
                                className="h-12 w-32 rounded-xl font-bold"
                            >
                                {submitting ? "กำลังบันทึก..." : "ยืนยัน"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Toast open={toast.open} message={toast.message} description={toast.description} />
        </div>
    )
}
