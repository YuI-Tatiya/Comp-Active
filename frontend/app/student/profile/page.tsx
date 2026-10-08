"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { X, Trophy, TrendingUp, CalendarCheck, Search, BarChart3, UserRound, FileDown, Loader2, Sparkles, Hash, Mail, GraduationCap, ShieldCheck } from "lucide-react"
import { Toast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Container } from "@/components/layout/container"
import { StatCard } from "@/components/student/animated-stat"
import { SkillScoreList } from "@/components/ui/skill-radar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { formatEventDate } from "@/components/ui/event-card"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts"
import { registrationsAPI, evaluationsAPI, SkillsData, Activity, usersAPI } from "@/lib/api"
import { SOFT_SKILLS, softSkillLabelByField } from "@/lib/soft-skills"
import { Select } from "@/components/ui/select"
import { EDUCATION_LEVELS, getProgramsByLevel } from "@/lib/programs"
import { skillTranscriptsAPI } from "@/lib/api"
import { formatTranscriptCode, type TranscriptListItem } from "@/lib/transcript"
import { IssuedTranscriptsList } from "@/components/transcript/issued-transcripts-list"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

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
    const router = useRouter()
    const [, setRegistrations] = useState<Registration[]>([])
    const [skillsData, setSkillsData] = useState<SkillsData | null>(null)
    const [loading, setLoading] = useState(true)

    // เอกสารรับรองผล Soft Skills
    const [transcripts, setTranscripts] = useState<TranscriptListItem[]>([])
    const [exporting, setExporting] = useState(false)
    const [revokeTarget, setRevokeTarget] = useState<string | null>(null)
    const [revoking, setRevoking] = useState(false)

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

    const loadTranscripts = async () => {
        try {
            setTranscripts(await skillTranscriptsAPI.mine())
        } catch (error) {
            console.error("Error fetching transcripts:", error)
        }
    }

    useEffect(() => {
        loadTranscripts()
    }, [])

    const openTranscript = (code: string) => {
        const url = `/verify/${formatTranscriptCode(code)}/print`
        const tab = window.open(url, "_blank")
        if (!tab) router.push(url) // popup ถูกบล็อก → นำทางในแท็บเดิม
    }

    const handleExport = async () => {
        // เปิดแท็บก่อน await — ถ้าเปิดหลังรอ API เบราว์เซอร์จะมองว่าไม่ได้มาจากการคลิกแล้วบล็อก popup
        const popup = window.open("", "_blank")
        setExporting(true)
        try {
            const { code } = await skillTranscriptsAPI.issue()
            if (popup) popup.location.href = `/verify/${formatTranscriptCode(code)}/print`
            else router.push(`/verify/${formatTranscriptCode(code)}/print`)
            loadTranscripts()
        } catch (error) {
            popup?.close()
            showToast("ออกเอกสารไม่สำเร็จ", error instanceof Error ? error.message : undefined)
        } finally {
            setExporting(false)
        }
    }

    const handleRevoke = async () => {
        if (!revokeTarget) return
        setRevoking(true)
        try {
            await skillTranscriptsAPI.revoke(revokeTarget)
            showToast("ยกเลิกเอกสารแล้ว", "เอกสารฉบับนี้จะตรวจสอบไม่ผ่านอีกต่อไป")
            setRevokeTarget(null)
            loadTranscripts()
        } catch (error) {
            showToast("ยกเลิกเอกสารไม่สำเร็จ", error instanceof Error ? error.message : undefined)
        } finally {
            setRevoking(false)
        }
    }

    const canExport = !loading && (skillsData?.count ?? 0) > 0

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
            <Container className="space-y-6 py-6 sm:py-8">
                {/* ── หัวโปรไฟล์ ───────────────────────────────────────── */}
                <section className="relative isolate overflow-hidden rounded-[32px] bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 text-white shadow-[0_18px_40px_-18px_rgb(43_108_176/0.6)] motion-safe:animate-rise-in">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_90%_at_8%_0%,rgb(255_255_255/0.22),transparent_70%)]" />
                        <div className="ph-float absolute -right-16 -top-20 size-72 rounded-full bg-white/10 blur-2xl" />
                        <div className="ph-float ph-delay-2 absolute -bottom-24 left-1/3 size-64 rounded-full bg-brand-300/20 blur-2xl" />
                        <div
                            className="absolute inset-0 opacity-[0.08]"
                            style={{
                                backgroundImage:
                                    "linear-gradient(rgb(255 255 255) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255) 1px, transparent 1px)",
                                backgroundSize: "32px 32px",
                                maskImage: "radial-gradient(ellipse 50% 80% at 85% 50%, black, transparent)",
                                WebkitMaskImage: "radial-gradient(ellipse 50% 80% at 85% 50%, black, transparent)",
                            }}
                        />
                    </div>

                    <div className="flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center md:justify-between lg:px-10">
                        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                            {/* อวาตาร์ตัวอักษรแรกของชื่อ + วงโคจรเส้นประ */}
                            <div className="relative size-24 shrink-0">
                                <svg aria-hidden="true" className="ph-orbit absolute -inset-3 size-[calc(100%+1.5rem)]" viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r="57" fill="none" stroke="rgb(255 255 255 / 0.35)" strokeWidth="1.5" strokeDasharray="3 7" />
                                </svg>
                                <span className="relative flex size-full items-center justify-center rounded-full border border-white/40 bg-white/15 text-4xl font-bold shadow-[inset_0_1px_0_rgb(255_255_255/0.4)] backdrop-blur-md">
                                    {(user?.name || "ส").trim().charAt(0)}
                                </span>
                                <span className="absolute bottom-0 right-0 flex size-7 items-center justify-center rounded-full bg-emerald-400 text-white ring-4 ring-brand-600">
                                    <Sparkles className="size-3.5" aria-hidden="true" />
                                </span>
                            </div>

                            <div className="min-w-0">
                                <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm">
                                    <span className="size-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
                                    โปรไฟล์นักศึกษา
                                </span>
                                <h1 className="truncate text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                                    {user?.name || "ผู้ใช้งาน"}
                                </h1>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm transition-colors hover:bg-white/25">
                                        <Hash className="size-3.5" aria-hidden="true" />
                                        {user?.studentId || "ไม่ระบุรหัสนักศึกษา"}
                                    </span>
                                    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm transition-colors hover:bg-white/25">
                                        <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                                        <span className="truncate">{user?.email || "ไม่ระบุอีเมล"}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="md:text-right">
                            <button
                                type="button"
                                onClick={handleExport}
                                disabled={!canExport || exporting}
                                className="group inline-flex items-center gap-2.5 rounded-full bg-white py-2 pl-5 pr-2 text-sm font-bold text-brand-700 shadow-lg shadow-brand-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-50 hover:shadow-xl active:translate-y-0 active:scale-95 disabled:pointer-events-none disabled:opacity-60"
                            >
                                ส่งออกเอกสารรับรอง (PDF)
                                <span className="flex size-8 items-center justify-center rounded-full bg-brand-600 text-white transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">
                                    {exporting ? (
                                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                    ) : (
                                        <FileDown className="size-4" aria-hidden="true" />
                                    )}
                                </span>
                            </button>
                            {!loading && !canExport && (
                                <p className="mt-2 max-w-[16rem] text-xs text-white/80 md:ml-auto">
                                    ต้องมีผลประเมินที่อนุมัติแล้วอย่างน้อย 1 กิจกรรมจึงจะออกเอกสารได้
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                {/* ── เมนูซ้าย + เนื้อหาขวา ─────────────────────────────── */}
                <Tabs defaultValue="softskills" className="grid grid-cols-1 gap-6 lg:grid-cols-[250px_1fr] lg:items-start lg:gap-8">
                    <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 rounded-[24px] border border-border bg-bg p-2 text-fg shadow-xs lg:sticky lg:top-24 lg:grid-cols-1">
                        {[
                            { value: "softskills", label: "Soft Skills", hint: "ภาพรวมทักษะและผลประเมิน", icon: BarChart3 },
                            { value: "edit", label: "ข้อมูลส่วนตัว", hint: "แก้ไขโปรไฟล์และรหัสผ่าน", icon: UserRound },
                        ].map((tab) => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="group h-auto justify-start gap-3 whitespace-normal rounded-2xl bg-transparent px-3 py-2.5 text-left text-fg-muted shadow-none transition-all duration-300 hover:bg-surface data-[state=active]:bg-brand-50 data-[state=active]:text-brand-700 data-[state=active]:shadow-none"
                            >
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-fg-muted transition-all duration-300 group-hover:scale-105 group-data-[state=active]:rotate-3 group-data-[state=active]:bg-brand-600 group-data-[state=active]:text-white group-data-[state=active]:shadow-md">
                                    <tab.icon className="size-5" aria-hidden="true" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-bold">{tab.label}</span>
                                    <span className="hidden text-xs font-normal text-fg-subtle lg:block">{tab.hint}</span>
                                </span>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <div className="min-w-0">
                        {/* ── แท็บ Soft Skills ───────────────────────────── */}
                        <TabsContent value="softskills" className="mt-0 space-y-6">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <StatCard
                                    index={0}
                                    tone="warning"
                                    icon={Trophy}
                                    label="อันดับในระบบ"
                                    value={loading || !skillsData ? null : skillsData.rank}
                                    format={(n) => `#${Math.max(1, Math.round(n))}`}
                                    caption={loading || !skillsData ? undefined : `จากนักศึกษาทั้งหมด ${skillsData.totalStudents} คน`}
                                />
                                <StatCard
                                    index={1}
                                    tone="success"
                                    icon={TrendingUp}
                                    label="แต้มสะสมทั้งหมด"
                                    value={loading ? null : (skillsData?.totalScore ?? 0)}
                                    format={(n) => Math.round(n).toLocaleString("th-TH")}
                                />
                                {/* เดิมนับ r.status === 'attended' ซึ่งเป็นไปไม่ได้ (attended อยู่ในฟิลด์ attendance) */}
                                <StatCard
                                    index={2}
                                    tone="brand"
                                    icon={CalendarCheck}
                                    label="กิจกรรมที่เข้าร่วม"
                                    value={loading ? null : (skillsData?.count ?? 0)}
                                    format={(n) => Math.round(n).toLocaleString("th-TH")}
                                />
                            </div>

                            {/* กราฟเรดาร์ + คะแนนรายทักษะ — recharts ต้องการค่าสีจริง ใช้ var() ของ token ได้ */}
                            <section
                                style={{ animationDelay: "260ms" }}
                                className="rounded-[28px] border border-border bg-bg p-5 shadow-xs motion-safe:animate-rise-in sm:p-6"
                            >
                                <div className="mb-4 flex items-center gap-3">
                                    <span className="flex size-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                                        <BarChart3 className="size-5" aria-hidden="true" />
                                    </span>
                                    <div>
                                        <h2 className="text-lg font-bold text-fg">ภาพรวมทักษะของคุณ</h2>
                                        <p className="text-sm text-fg-muted">ติดตามและพัฒนาทักษะผ่านการเข้าร่วมกิจกรรม</p>
                                    </div>
                                </div>
                                <div className="grid items-center gap-6 xl:grid-cols-[1.25fr_1fr]">
                                    <div className="h-[400px] w-full rounded-2xl bg-surface p-3">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="68%" data={chartData}>
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
                                                    animationDuration={1200}
                                                />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <SkillScoreList average={skillsData?.average} />
                                </div>
                            </section>

                            {/* ประวัติการประเมินรายกิจกรรม */}
                            <section
                                style={{ animationDelay: "340ms" }}
                                className="rounded-[28px] border border-border bg-bg p-5 shadow-xs motion-safe:animate-rise-in sm:p-6"
                            >
                                <h2 className="mb-5 text-lg font-bold text-fg">ผลการประเมิน Soft Skills ต่อกิจกรรม</h2>

                                {!loading && skillsData?.history && skillsData.history.length > 0 && (
                                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                                        <div className="relative w-full sm:max-w-xs">
                                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
                                            <Input
                                                type="text"
                                                placeholder="ค้นหาชื่อกิจกรรม..."
                                                className="h-10 rounded-full pl-10"
                                                value={historySearch}
                                                onChange={(e) => setHistorySearch(e.target.value)}
                                            />
                                        </div>
                                        <Select
                                            className="h-10 rounded-full sm:w-56"
                                            value={historySkillFilter}
                                            onChange={(e) => setHistorySkillFilter(e.target.value)}
                                        >
                                            <option value="">ทุกทักษะ</option>
                                            {SOFT_SKILLS.map((s) => (
                                                <option key={s.field} value={s.field}>{s.label}</option>
                                            ))}
                                        </Select>
                                        <Select
                                            className="h-10 rounded-full sm:w-44"
                                            value={historySort}
                                            onChange={(e) => setHistorySort(e.target.value as typeof historySort)}
                                        >
                                            <option value="newest">ล่าสุดก่อน</option>
                                            <option value="oldest">เก่าสุดก่อน</option>
                                            <option value="name">ชื่อ ก-ฮ</option>
                                        </Select>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {loading ? (
                                        <div className="animate-pulse py-8 text-center font-medium text-fg-muted">
                                            กำลังโหลดข้อมูล...
                                        </div>
                                    ) : !skillsData?.history || skillsData.history.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-border-strong bg-surface py-12 text-center font-medium text-fg-muted">
                                            ยังไม่มีผลประเมิน Soft Skills จากกิจกรรมใดๆ เลย
                                        </div>
                                    ) : filteredHistory.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-border-strong bg-surface py-12 text-center">
                                            <p className="font-medium text-fg-muted">ไม่พบผลการประเมินที่ตรงกับตัวกรอง</p>
                                            <Button
                                                variant="outline"
                                                className="mt-4 rounded-full"
                                                onClick={() => {
                                                    setHistorySearch("")
                                                    setHistorySkillFilter("")
                                                }}
                                            >
                                                ล้างตัวกรอง
                                            </Button>
                                        </div>
                                    ) : (
                                        filteredHistory.map((entry, idx) => {
                                            const awarded = Object.entries(entry.scores)
                                                .filter(([, v]) => v > 0)
                                                .map(([k]) => softSkillLabelByField(k))
                                            return (
                                                <div
                                                    key={entry.id}
                                                    style={{ animationDelay: `${Math.min(idx, 8) * 50}ms` }}
                                                    className="group flex flex-col justify-between gap-3 rounded-2xl border border-border p-4 transition-all duration-300 motion-safe:animate-rise-in hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50/40 hover:shadow-sm md:flex-row md:items-start"
                                                >
                                                    <div className="flex-1">
                                                        <h3 className="mb-2.5 text-base font-semibold text-fg">{entry.activityName}</h3>
                                                        {awarded.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1.5">
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
                                                    <span className="inline-flex shrink-0 items-center gap-1.5 self-start whitespace-nowrap rounded-full bg-surface px-3 py-1 text-xs font-semibold text-fg-muted transition-colors group-hover:bg-brand-100 group-hover:text-brand-700">
                                                        <CalendarCheck className="size-3.5" aria-hidden="true" />
                                                        {formatEventDate(entry.date)}
                                                    </span>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </section>

                            <IssuedTranscriptsList items={transcripts} onOpen={(code) => openTranscript(code)} onRevoke={setRevokeTarget} />
                        </TabsContent>

                        {/* ── แท็บแก้ไขข้อมูล ────────────────────────────── */}
                        <TabsContent value="edit" className="mt-0 space-y-6">
                            {/* ข้อมูลพื้นฐาน */}
                            <section className="rounded-[28px] border border-border bg-bg p-5 shadow-xs motion-safe:animate-rise-in sm:p-6">
                                <div className="mb-6 flex items-center gap-3">
                                    <span className="flex size-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                                        <UserRound className="size-5" aria-hidden="true" />
                                    </span>
                                    <div>
                                        <h2 className="text-lg font-bold text-fg">ข้อมูลส่วนตัว</h2>
                                        <p className="text-sm text-fg-muted">ชื่อ รหัสนักศึกษา และช่องทางติดต่อ</p>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                                </div>
                            </section>

                            {/* ข้อมูลการศึกษา */}
                            <section
                                style={{ animationDelay: "90ms" }}
                                className="rounded-[28px] border border-border bg-bg p-5 shadow-xs motion-safe:animate-rise-in sm:p-6"
                            >
                                <div className="mb-6 flex items-center gap-3">
                                    <span className="flex size-10 items-center justify-center rounded-2xl bg-success-bg text-success">
                                        <GraduationCap className="size-5" aria-hidden="true" />
                                    </span>
                                    <div>
                                        <h2 className="text-lg font-bold text-fg">ข้อมูลการศึกษา</h2>
                                        <p className="text-sm text-fg-muted">ระดับการศึกษาและหลักสูตรที่กำลังศึกษา</p>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    {(!editForm.educationLevel || !editForm.program) && (
                                        <p className="rounded-xl bg-warning-bg p-3 text-sm text-warning">
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
                            </section>

                            {/* ความปลอดภัย + ปุ่ม */}
                            <section
                                style={{ animationDelay: "180ms" }}
                                className="rounded-[28px] border border-border bg-bg p-5 shadow-xs motion-safe:animate-rise-in sm:p-6"
                            >
                                <div className="mb-6 flex items-center gap-3">
                                    <span className="flex size-10 items-center justify-center rounded-2xl bg-warning-bg text-warning">
                                        <ShieldCheck className="size-5" aria-hidden="true" />
                                    </span>
                                    <div>
                                        <h2 className="text-lg font-bold text-fg">ความปลอดภัย</h2>
                                        <p className="text-sm text-fg-muted">เปลี่ยนรหัสผ่านเมื่อต้องการ</p>
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

                                <div className="mt-8 flex flex-col-reverse justify-end gap-3 border-t border-border pt-6 sm:flex-row">
                                    {/* เดิมปุ่มนี้ไม่มี onClick — กดแล้วไม่เกิดอะไรขึ้น */}
                                    <Button
                                        variant="outline"
                                        className="h-12 rounded-full px-8 font-bold transition-all hover:-translate-y-0.5 active:scale-95"
                                        onClick={() => setEditForm(formFromUser())}
                                    >
                                        ยกเลิก
                                    </Button>
                                    <Button
                                        onClick={handleSaveProfileClick}
                                        className="h-12 rounded-full px-8 font-bold shadow-md shadow-brand-600/25 transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
                                    >
                                        ยืนยันการแก้ไข
                                    </Button>
                                </div>
                            </section>
                        </TabsContent>
                    </div>
                </Tabs>
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

            <ConfirmDialog
                open={revokeTarget !== null}
                onOpenChange={(open) => !open && !revoking && setRevokeTarget(null)}
                title="ยกเลิกเอกสารฉบับนี้?"
                description={`เลขที่ ${revokeTarget ? formatTranscriptCode(revokeTarget) : ""} จะตรวจสอบไม่ผ่านทันที และไม่สามารถกู้คืนได้ (ออกเอกสารใหม่ได้ภายหลัง)`}
                confirmLabel="ยกเลิกเอกสาร"
                tone="danger"
                loading={revoking}
                onConfirm={handleRevoke}
            />

            <Toast open={toast.open} message={toast.message} description={toast.description} />
        </div>
    )
}
