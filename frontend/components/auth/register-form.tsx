"use client"

import { useState } from "react"
import { Select } from "@/components/ui/select"
import { ArrowRight, User, Mail, GraduationCap, Phone, Loader2 } from "lucide-react"
import { AMBER_BUTTON } from "@/components/denim/denim-ui"
import { AUTH_INPUT, AuthError, AuthIconInput, AuthLabel, AuthPasswordInput } from "@/components/auth/auth-shell"
import { useAuth } from "@/lib/auth-context"
import { EDUCATION_LEVELS, getProgramsByLevel } from "@/lib/programs"
import { TITLES, type TitleCode } from "@/lib/titles"
import { cn } from "@/lib/utils"

// ⚠️ ต้องตรงกับ backend/src/common/constants/index.ts
/** เบอร์มือถือ 10 หลัก ขึ้นต้น 06 / 08 / 09 เท่านั้น */
const THAI_MOBILE_REGEX = /^0[689]\d{8}$/
/** รหัสนักศึกษา 653380123-4 — ตำแหน่งที่ 3-6 ต้องเป็น 3380 (ขีดจะใส่หรือไม่ก็ได้) */
const STUDENT_ID_REGEX = /^\d{2}3380\d{3}-?\d$/

/** หัวข้อคั่นกลุ่มฟอร์ม — ป้ายแบบคอมเมนต์โค้ด + เส้นประ */
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <fieldset className="space-y-4">
            <legend className="mb-1 flex w-full items-center gap-3 font-code text-xs text-denim-accent">
                {`// ${title}`}
                <span className="h-0 flex-1 border-t border-dashed border-denim-line" aria-hidden="true" />
            </legend>
            {children}
        </fieldset>
    )
}

export function RegisterForm() {
    const { register } = useAuth()
    const [title, setTitle] = useState<TitleCode | "">("")
    const [name, setName] = useState("")
    const [studentId, setStudentId] = useState("")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [educationLevel, setEducationLevel] = useState("")
    const [program, setProgram] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const programOptions = getProgramsByLevel(educationLevel)
    const isLevelChosen = Boolean(educationLevel)

    // เปลี่ยนระดับ = รีเซ็ตสาขาและชั้นปี กันข้อมูลค้างผิดระดับ
    function handleLevelChange(value: string) {
        setEducationLevel(value)
        setProgram("")
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!title || !name || !email || !password) {
            setError("กรุณากรอกข้อมูลให้ครบถ้วน")
            return
        }

        // studentId ไม่บังคับกรอก — ตรวจเฉพาะตอนที่กรอกมา
        if (studentId && !STUDENT_ID_REGEX.test(studentId)) {
            setError("รหัสนักศึกษาไม่ถูกต้อง")
            return
        }

        if (!THAI_MOBILE_REGEX.test(phone)) {
            setError("เบอร์มือถือไม่ถูกต้อง")
            return
        }

        if (!educationLevel || !program) {
            setError("กรุณาเลือกระดับการศึกษาและหลักสูตร")
            return
        }

        if (password !== confirmPassword) {
            setError("รหัสผ่านไม่ตรงกัน")
            return
        }

        if (password.length < 6) {
            setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
            return
        }

        setLoading(true)
        try {
            await register({
                title,
                name,
                email,
                password,
                ...(studentId ? { studentId } : {}),
                phone,
                educationLevel,
                program,
            })
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message)
            } else {
                setError("ลงทะเบียนไม่สำเร็จ")
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        // min-h-full + flex-col + mt-auto ที่แถบปุ่ม = ปุ่มติดก้นกรอบเสมอ แม้ฟอร์มสั้น
        // ใช้ gap แทน space-y เพราะ space-y จะไปทับ mt-auto
        <form onSubmit={handleSubmit} className="flex min-h-full flex-col gap-6">
            {error && <AuthError>{error}</AuthError>}

            {/* ── ข้อมูลส่วนตัว ─────────────────────────────────────────────── */}
            <FormSection title="ข้อมูลส่วนตัว">
                <div className="grid grid-cols-[140px_1fr] gap-3">
                    <div>
                        <AuthLabel htmlFor="title" required>คำนำหน้า</AuthLabel>
                        <Select
                            id="title"
                            className={cn(AUTH_INPUT, "pr-10")}
                            value={title}
                            onChange={(e) => setTitle(e.target.value as TitleCode)}
                            disabled={loading}
                        >
                            <option value="">เลือก</option>
                            {TITLES.map((t) => (
                                <option key={t.code} value={t.code}>{t.label}</option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <AuthLabel htmlFor="name" required>ชื่อ-นามสกุล</AuthLabel>
                        <AuthIconInput id="name" icon={User} autoComplete="name" placeholder="สมชาย ใจดี"
                            value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
                    </div>
                </div>

                <div>
                    <AuthLabel htmlFor="student-id">รหัสนักศึกษา</AuthLabel>
                    <AuthIconInput id="student-id" icon={GraduationCap} placeholder="653380123-4"
                        value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={loading} />
                </div>

                <div>
                    <AuthLabel htmlFor="register-email" required>อีเมล (ต้องใช้ @kkumail.com เท่านั้น)</AuthLabel>
                    <AuthIconInput id="register-email" icon={Mail} type="email" autoComplete="email" placeholder="yourname@kkumail.com"
                        value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                </div>

                <div>
                    <AuthLabel htmlFor="phone" required>เบอร์มือถือ</AuthLabel>
                    <AuthIconInput
                        id="phone"
                        icon={Phone}
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        maxLength={10}
                        placeholder="0812345678"
                        value={phone}
                        // ตัดอักขระที่ไม่ใช่ตัวเลขทิ้งตั้งแต่ตอนพิมพ์
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        disabled={loading}
                    />
                </div>
            </FormSection>

            {/* ── ข้อมูลการศึกษา ───────────────────────────────────────────── */}
            <FormSection title="ข้อมูลการศึกษา">
                <div>
                    <AuthLabel htmlFor="education-level" required>ระดับการศึกษา</AuthLabel>
                    <Select
                        id="education-level"
                        className={cn(AUTH_INPUT, "pr-10")}
                        value={educationLevel}
                        onChange={(e) => handleLevelChange(e.target.value)}
                        disabled={loading}
                    >
                        <option value="">เลือกระดับการศึกษา...</option>
                        {EDUCATION_LEVELS.map((lv) => (
                            <option key={lv.code} value={lv.code}>{lv.label}</option>
                        ))}
                    </Select>
                </div>

                <div>
                    <AuthLabel htmlFor="program" required>หลักสูตร</AuthLabel>
                    <Select
                        id="program"
                        className={cn(AUTH_INPUT, "pr-10 disabled:bg-denim-paper")}
                        value={program}
                        onChange={(e) => setProgram(e.target.value)}
                        disabled={loading || !isLevelChosen}
                        aria-describedby={!isLevelChosen ? "program-hint" : undefined}
                    >
                        <option value="">เลือกหลักสูตร...</option>
                        {programOptions.map((p) => (
                            <option key={p.code} value={p.code}>{p.label}</option>
                        ))}
                    </Select>
                    {!isLevelChosen && (
                        <p id="program-hint" className="mt-2 text-xs text-denim-muted">
                            เลือกระดับการศึกษาก่อน
                        </p>
                    )}
                </div>

            </FormSection>

            {/* ── ความปลอดภัย ──────────────────────────────────────────────── */}
            <FormSection title="ความปลอดภัย">
                <div>
                    <AuthLabel htmlFor="register-password" required>รหัสผ่าน</AuthLabel>
                    <AuthPasswordInput id="register-password" autoComplete="new-password"
                        value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
                </div>

                <div>
                    <AuthLabel htmlFor="confirm-password" required>ยืนยันรหัสผ่าน</AuthLabel>
                    <AuthPasswordInput id="confirm-password" autoComplete="new-password"
                        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} />
                </div>
            </FormSection>

            {/* sticky ยึดกับ scroll container ของหน้า auth — ปุ่มลอยติดก้นกรอบ ไม่ต้องเลื่อนหา
                -mx-6/-mx-10 หักล้าง padding ของ container ให้พื้นหลังเต็มความกว้าง */}
            <div className="sticky bottom-0 -mx-6 mt-auto border-t border-denim-line bg-white px-6 py-4 sm:-mx-10 sm:px-10">
                <button type="submit" disabled={loading} className={cn(AMBER_BUTTON, "w-full disabled:cursor-wait disabled:opacity-80")}>
                    {loading ? (
                        <>
                            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                            กำลังลงทะเบียน...
                        </>
                    ) : (
                        <>
                            ลงทะเบียน
                            <ArrowRight className="size-5" aria-hidden="true" />
                        </>
                    )}
                </button>
            </div>
        </form>
    )
}
