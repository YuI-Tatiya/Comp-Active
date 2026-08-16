"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { User, Mail, Lock, GraduationCap, Phone, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { EDUCATION_LEVELS, getProgramsByLevel } from "@/lib/programs"

// ⚠️ ต้องตรงกับ backend/src/common/constants/index.ts
/** เบอร์มือถือ 10 หลัก ขึ้นต้น 06 / 08 / 09 เท่านั้น */
const THAI_MOBILE_REGEX = /^0[689]\d{8}$/
/** รหัสนักศึกษา 653380123-4 — ตำแหน่งที่ 3-6 ต้องเป็น 3380 (ขีดจะใส่หรือไม่ก็ได้) */
const STUDENT_ID_REGEX = /^\d{2}3380\d{3}-?\d$/

/** หัวข้อคั่นกลุ่มฟอร์ม */
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <fieldset className="space-y-4">
            <legend className="mb-1 flex w-full items-center gap-3 text-xs font-medium text-fg-subtle">
                {title}
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
            </legend>
            {children}
        </fieldset>
    )
}

export function RegisterForm() {
    const { register } = useAuth()
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

        if (!name || !email || !password) {
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
            {error && (
                <div
                    role="alert"
                    className="rounded-lg border border-danger/20 bg-danger-bg p-3 text-sm text-danger"
                >
                    {error}
                </div>
            )}

            {/* ── ข้อมูลส่วนตัว ─────────────────────────────────────────────── */}
            <FormSection title="ข้อมูลส่วนตัว">
                <div className="space-y-2">
                    <Label htmlFor="name">ชื่อ-นามสกุล</Label>
                    <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                        <Input id="name" placeholder="กรอกชื่อ-นามสกุล" className="pl-9"
                            value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="student-id">รหัสนักศึกษา</Label>
                    <div className="relative">
                        <GraduationCap className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                        <Input id="student-id" placeholder="กรอกรหัสนักศึกษา" className="pl-9"
                            value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={loading} />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="register-email">อีเมล (ต้องใช้ @kkumail.com เท่านั้น)</Label>
                    <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                        <Input id="register-email" type="email" placeholder="your.name@kkumail.com" className="pl-9"
                            value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone">เบอร์มือถือ</Label>
                    <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                        <Input
                            id="phone"
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            placeholder="0812345678"
                            className="pl-9"
                            value={phone}
                            // ตัดอักขระที่ไม่ใช่ตัวเลขทิ้งตั้งแต่ตอนพิมพ์
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                            disabled={loading}
                        />
                    </div>
                </div>
            </FormSection>

            {/* ── ข้อมูลการศึกษา ───────────────────────────────────────────── */}
            <FormSection title="ข้อมูลการศึกษา">
                <div className="space-y-2">
                    <Label htmlFor="education-level">ระดับการศึกษา</Label>
                    <Select
                        id="education-level"
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

                <div className="space-y-2">
                    <Label htmlFor="program">หลักสูตร</Label>
                    <Select
                        id="program"
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
                        <p id="program-hint" className="text-xs text-fg-subtle">
                            เลือกระดับการศึกษาก่อน
                        </p>
                    )}
                </div>

            </FormSection>

            {/* ── ความปลอดภัย ──────────────────────────────────────────────── */}
            <FormSection title="ความปลอดภัย">
                <div className="space-y-2">
                    <Label htmlFor="register-password">รหัสผ่าน</Label>
                    <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                        <Input id="register-password" type="password" placeholder="••••••••" className="pl-9"
                            value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirm-password">ยืนยันรหัสผ่าน</Label>
                    <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                        <Input id="confirm-password" type="password" placeholder="••••••••" className="pl-9"
                            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} />
                    </div>
                </div>
            </FormSection>

            {/* sticky ยึดกับ scroll container ของหน้า auth — ปุ่มลอยติดก้นกรอบ ไม่ต้องเลื่อนหา
                -mx-6/-mx-8 หักล้าง padding ของ container ให้พื้นหลังเต็มความกว้าง */}
            <div className="sticky bottom-0 -mx-6 mt-auto border-t border-border bg-bg px-6 py-4 sm:-mx-8 sm:px-8">
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" />
                            กำลังลงทะเบียน...
                        </>
                    ) : (
                        "ลงทะเบียน"
                    )}
                </Button>
            </div>
        </form>
    )
}
