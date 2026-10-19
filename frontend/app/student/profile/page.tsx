"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { X, Trophy, TrendingUp, CalendarCheck, Search, LogOut } from "lucide-react"
import { Toast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Container } from "@/components/layout/container"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
    DENIM_FIELD,
    DenimPanel,
    DenimSectionHeading,
    DenimStatCard,
    type OrganizerStat,
} from "@/components/denim/denim-ui"
import { MobileAppBar, MobileAppBarPill } from "@/components/student/mobile-app-bar"
import {
    AssessmentRow,
    AssessmentsEmpty,
    ExportTranscriptButton,
    IssuedTranscriptsPanel,
    ProfileHero,
    SkillRadarPanel,
    profilePanelId,
    profileTabId,
    type ProfileTab,
} from "@/components/student/profile-ui"
import { evaluationsAPI, SkillsData, usersAPI } from "@/lib/api"
import { SOFT_SKILLS } from "@/lib/soft-skills"
import { Select } from "@/components/ui/select"
import { EDUCATION_LEVELS, getProgramsByLevel } from "@/lib/programs"
import { skillTranscriptsAPI } from "@/lib/api"
import { formatTranscriptCode, type TranscriptListItem } from "@/lib/transcript"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"

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
    const { user, refreshUser, logout } = useAuth()
    const router = useRouter()
    const [tab, setTab] = useState<ProfileTab>("softskills")
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

    // เดิมดึง registrationsAPI.getMy() มาด้วยแต่ไม่เคยใช้ผล — ตัดออก (นับรวมใน request budget ของ nginx)
    const fetchData = async () => {
        try {
            setLoading(true)
            setSkillsData(await evaluationsAPI.getMySkills())
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
        const popup = window.open(url, "_blank")
        if (!popup) router.push(url) // popup ถูกบล็อก → นำทางในแท็บเดิม
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

    const history = skillsData?.history ?? []
    const historyQuery = historySearch.trim().toLowerCase()
    const filteredHistory = history
        .filter((entry) => !historyQuery || entry.activityName.toLowerCase().includes(historyQuery))
        .filter((entry) => !historySkillFilter || (entry.scores[historySkillFilter as keyof typeof entry.scores] ?? 0) > 0)
        .sort((a, b) => {
            if (historySort === "name") return a.activityName.localeCompare(b.activityName, "th")
            const da = new Date(a.date).getTime()
            const db = new Date(b.date).getTime()
            return historySort === "oldest" ? da - db : db - da
        })

    // เดิมนับ r.status === 'attended' ซึ่งเป็นไปไม่ได้ (attended อยู่ในฟิลด์ attendance) — ใช้จำนวนผลประเมินแทน
    const stats: OrganizerStat[] = [
        {
            code: "RANK",
            label: "อันดับในระบบ",
            value: loading || !skillsData ? "–" : `#${skillsData.rank}`,
            caption:
                loading || !skillsData ? undefined : `จากนักศึกษาทั้งหมด ${skillsData.totalStudents.toLocaleString("th-TH")} คน`,
            icon: Trophy,
            highlight: true,
        },
        {
            code: "POINTS",
            label: "แต้มสะสมทั้งหมด",
            value: loading ? "–" : (skillsData?.totalScore ?? 0).toLocaleString("th-TH"),
            icon: TrendingUp,
        },
        {
            code: "JOINED",
            label: "กิจกรรมที่เข้าร่วม",
            value: loading ? "–" : (skillsData?.count ?? 0),
            icon: CalendarCheck,
        },
    ]

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

    // การ์ดโปรไฟล์บนมือถือ — ตัวเลขชุดเดียวกับ stats ของจอกว้าง แต่ป้ายสั้นพอดีช่องแคบ
    const summary = [
        {
            code: "RANK",
            label: "อันดับในระบบ",
            value: loading || !skillsData ? "–" : `#${skillsData.rank}`,
            note: loading || !skillsData ? "" : `จาก ${skillsData.totalStudents.toLocaleString("th-TH")} คน`,
        },
        {
            code: "POINTS",
            label: "แต้มสะสม",
            value: loading ? "–" : (skillsData?.totalScore ?? 0).toLocaleString("th-TH"),
            note: "แต้มสะสม",
        },
        { code: "JOINED", label: "กิจกรรมที่เข้าร่วม", value: loading ? "–" : String(skillsData?.count ?? 0), note: "กิจกรรม" },
    ]

    return (
        // ไม่ใส่ min-h-screen — app/student/layout.tsx จัดการให้แล้ว
        <div className="bg-surface pb-16">
            {/* แถบหัวมือถือของหน้านี้วาดเองที่นี่ (layout เว้นไว้ให้) เพราะป้ายอันดับขวามือต้องใช้ข้อมูลของหน้า */}
            <MobileAppBar
                prompt="~/student $ cat profile"
                title="โปรไฟล์"
                action={!loading && skillsData ? <MobileAppBarPill>RANK #{skillsData.rank}</MobileAppBarPill> : <span />}
            />
            <ProfileHero
                name={user?.name || "ผู้ใช้งาน"}
                studentId={user?.studentId}
                email={user?.email}
                summary={summary}
                tab={tab}
                onTabChange={setTab}
            />

            <Container className="mt-5 lg:mt-8">
                {tab === "softskills" ? (
                    <div
                        role="tabpanel"
                        id={profilePanelId("softskills")}
                        aria-labelledby={profileTabId("softskills")}
                        className="flex flex-col gap-6"
                    >
                        {/* จอแคบ: หัวข้อย้ายเข้าไปในการ์ดเรดาร์ สถิติอยู่ในการ์ดโปรไฟล์ด้านบน ปุ่มส่งออกอยู่ใต้เรดาร์ */}
                        <div className="max-lg:hidden">
                            <DenimSectionHeading
                                id="dashboard-heading"
                                comment="soft_skills.dashboard"
                                title="Soft Skills Dashboard"
                                description="ติดตามและพัฒนาทักษะของคุณผ่านการเข้าร่วมกิจกรรม"
                                action={
                                    <ExportTranscriptButton
                                        canExport={canExport}
                                        loading={loading}
                                        exporting={exporting}
                                        onExport={handleExport}
                                    />
                                }
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4 max-lg:hidden">
                            {stats.map((stat) => (
                                <DenimStatCard key={stat.code} stat={stat} strongLabel />
                            ))}
                        </div>

                        <SkillRadarPanel skills={skillsData} loading={loading} />
                        <div className="lg:hidden">
                            <ExportTranscriptButton canExport={canExport} loading={loading} exporting={exporting} onExport={handleExport} />
                        </div>

                        {/* ประวัติการประเมินรายกิจกรรม */}
                        <DenimPanel labelledBy="assessments-heading">
                            <DenimSectionHeading
                                id="assessments-heading"
                                comment="assessments"
                                title="ผลการประเมิน Soft Skills ต่อกิจกรรม"
                                size="card"
                            />

                            {!loading && history.length > 0 && (
                                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <div className="relative w-full sm:max-w-xs">
                                        <Search
                                            className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-denim-muted"
                                            aria-hidden="true"
                                        />
                                        <input
                                            type="search"
                                            aria-label="ค้นหาชื่อกิจกรรม"
                                            placeholder="ค้นหาชื่อกิจกรรม..."
                                            className={cn(DENIM_FIELD, "w-full pl-[38px] pr-3 placeholder:text-denim-muted/80")}
                                            value={historySearch}
                                            onChange={(e) => setHistorySearch(e.target.value)}
                                        />
                                    </div>
                                    <Select
                                        aria-label="กรองตามทักษะ"
                                        className={cn(DENIM_FIELD, "sm:w-60")}
                                        value={historySkillFilter}
                                        onChange={(e) => setHistorySkillFilter(e.target.value)}
                                    >
                                        <option value="">ทุกทักษะ</option>
                                        {SOFT_SKILLS.map((s) => (
                                            <option key={s.field} value={s.field}>
                                                {s.label}
                                            </option>
                                        ))}
                                    </Select>
                                    <Select
                                        aria-label="เรียงลำดับ"
                                        className={cn(DENIM_FIELD, "sm:w-44")}
                                        value={historySort}
                                        onChange={(e) => setHistorySort(e.target.value as typeof historySort)}
                                    >
                                        <option value="newest">ล่าสุดก่อน</option>
                                        <option value="oldest">เก่าสุดก่อน</option>
                                        <option value="name">ชื่อ ก-ฮ</option>
                                    </Select>
                                </div>
                            )}

                            <div className="mt-5">
                                {loading ? (
                                    <div className="h-24 animate-pulse rounded-[18px] bg-denim-paper" aria-hidden="true" />
                                ) : history.length === 0 ? (
                                    <AssessmentsEmpty />
                                ) : filteredHistory.length === 0 ? (
                                    <div className="flex flex-col items-center gap-3 rounded-[18px] border border-dashed border-denim-field px-5 py-8 text-center">
                                        <p className="font-medium text-denim-muted">ไม่พบผลการประเมินที่ตรงกับตัวกรอง</p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setHistorySearch("")
                                                setHistorySkillFilter("")
                                            }}
                                            className="inline-flex min-h-10 items-center rounded-[10px] border-[1.5px] border-denim-field bg-white px-4 text-sm font-semibold text-denim-deep transition-colors hover:border-denim hover:bg-denim-paper focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
                                        >
                                            ล้างตัวกรอง
                                        </button>
                                    </div>
                                ) : (
                                    <ul className="flex flex-col gap-3">
                                        {filteredHistory.map((entry) => (
                                            <AssessmentRow key={entry.id} entry={entry} />
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </DenimPanel>

                        <IssuedTranscriptsPanel items={transcripts} onOpen={openTranscript} onRevoke={setRevokeTarget} />
                    </div>
                ) : (
                    <div role="tabpanel" id={profilePanelId("edit")} aria-labelledby={profileTabId("edit")}>
                        <DenimPanel labelledBy="edit-heading">
                            <DenimSectionHeading
                                id="edit-heading"
                                comment="profile.edit()"
                                title="ข้อมูลส่วนตัว"
                                description="แก้ไขแล้วต้องยืนยันด้วยรหัสผ่านปัจจุบันก่อนบันทึก"
                                size="card"
                            />

                            {/* จอกว้าง 2 คอลัมน์: ซ้าย = ข้อมูลติดต่อ, ขวา = การศึกษา + รหัสผ่าน (คอลัมน์เดียว ช่องจะยืดยาวเกินอ่าน) */}
                            <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:gap-x-10">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4 sm:gap-6">
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
                                        <p className="text-xs text-denim-muted">
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

                                <div className="space-y-6">
                                    {/* ── ข้อมูลการศึกษา ─────────────────────────── */}
                                    <fieldset className="space-y-4 rounded-[18px] border border-denim-line bg-denim-paper/50 p-4 sm:p-5">
                                        <legend className="px-1 text-sm font-semibold text-denim-deep">ข้อมูลการศึกษา</legend>

                                        {(!editForm.educationLevel || !editForm.program) && (
                                            <p className="rounded-xl bg-amber/15 p-3 text-sm text-amber-ink">
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
                                                    <option key={lv.code} value={lv.code}>
                                                        {lv.label}
                                                    </option>
                                                ))}
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="program">หลักสูตร</Label>
                                            <Select
                                                id="program"
                                                value={editForm.program}
                                                onChange={(e) => setEditForm((prev) => ({ ...prev, program: e.target.value }))}
                                                disabled={!editForm.educationLevel}
                                                className="h-12 rounded-xl"
                                            >
                                                <option value="">เลือกหลักสูตร...</option>
                                                {getProgramsByLevel(editForm.educationLevel).map((p) => (
                                                    <option key={p.code} value={p.code}>
                                                        {p.label}
                                                    </option>
                                                ))}
                                            </Select>
                                            {!editForm.educationLevel && (
                                                <p className="text-xs text-denim-muted">เลือกระดับการศึกษาก่อน</p>
                                            )}
                                        </div>
                                    </fieldset>

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
                                        <p className="text-xs text-denim-muted">เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน</p>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 border-t border-denim-line pt-6 lg:col-span-2">
                                    {/* เดิมปุ่มนี้ไม่มี onClick — กดแล้วไม่เกิดอะไรขึ้น */}
                                    <Button
                                        variant="outline"
                                        className="h-12 rounded-xl px-6 font-bold sm:px-8"
                                        onClick={() => setEditForm(formFromUser())}
                                    >
                                        ยกเลิก
                                    </Button>
                                    <Button onClick={handleSaveProfileClick} className="h-12 rounded-xl px-6 font-bold sm:px-8">
                                        ยืนยันการแก้ไข
                                    </Button>
                                </div>
                            </div>
                        </DenimPanel>
                    </div>
                )}

                {/* จอแคบ: หน้านี้ไม่มีอวตาร (เมนูผู้ใช้) บนแถบหัว — ออกจากระบบตรงนี้แทน */}
                <button
                    type="button"
                    onClick={logout}
                    className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-red-200 bg-white text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim lg:hidden"
                >
                    <LogOut className="size-4" aria-hidden="true" />
                    ออกจากระบบ
                </button>
            </Container>

            {/* Dialog ยืนยันด้วยรหัสผ่าน */}
            <Dialog open={isConfirmModalOpen} onOpenChange={(open) => !open && closeConfirmModal()}>
                <DialogContent className="overflow-hidden rounded-2xl p-0 sm:max-w-md">
                    <div className="p-8">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <h2 className="text-xl font-bold tracking-tight text-fg">กรอกรหัสผ่านเพื่อเปลี่ยนแปลงข้อมูล</h2>
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
                            <div role="alert" className="mb-4 rounded-xl border border-border bg-danger-bg p-3 text-sm text-danger">
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
                            <Button onClick={handleConfirmSave} disabled={submitting} className="h-12 w-32 rounded-xl font-bold">
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
