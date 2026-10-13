"use client"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { AtSign, Lock, Phone, UserRound, X } from "lucide-react"
import { Toast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Container } from "@/components/layout/container"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { DenimIconInput, DenimPanel, DenimPasswordInput } from "@/components/denim/denim-ui"
import {
    OrganizerSettingsHero,
    PasswordRequirements,
    SettingsDivider,
    SettingsField,
    SettingsSectionLabel,
} from "@/components/organizer/settings-ui"
import { usersAPI } from "@/lib/api"

const EMPTY_FORM = {
    name: "",
    username: "",
    phone: "",
    password: "",
}

/** ⚠️ กฎเดียวกับ backend/src/common/constants/index.ts (USERNAME_REGEX) — พิมพ์เล็กล้วน เพราะ login หา username
 *  แบบ exact-match ไม่ lowercase ให้เหมือนอีเมล ตั้งพิมพ์ใหญ่ไว้แล้ว login ด้วยพิมพ์เล็กจะเข้าไม่ได้ */
const USERNAME_PATTERN = /^[a-z][a-z0-9_-]{2,31}$/
// ⚠️ กฎเดียวกับ backend/src/common/constants/password.ts (PASSWORD_MIN_LENGTH=8, PASSWORD_PATTERN)
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

// ที่อยู่เดียวกับ components/layout/site-footer.tsx — ติดต่อผู้ดูแลระบบเรื่องอีเมลที่เปลี่ยนเองไม่ได้
const CONTACT_EMAIL = "info@computing.kku.ac.th"

export default function OrganizerSettingsPage() {
    const { user, refreshUser } = useAuth()

    const [editForm, setEditForm] = useState(EMPTY_FORM)
    const [formError, setFormError] = useState("")
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
    const [currentPassword, setCurrentPassword] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [modalError, setModalError] = useState("")
    // เวลาอ้างอิงตอนเปิดหน้า — ใช้คำนวณอายุบัญชีในแถบหัว
    const [now] = useState(() => new Date())

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
    useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

    /** ดึงค่าจาก user มาใส่ฟอร์ม — ใช้ทั้งตอนโหลดและตอนกดยกเลิก */
    function formFromUser() {
        return {
            ...EMPTY_FORM,
            name: user?.name || "",
            username: user?.username || "",
            phone: user?.phone || "",
        }
    }

    useEffect(() => {
        if (user) setEditForm(formFromUser())
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user])

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setEditForm((prev) => ({ ...prev, [name]: value }))
    }

    // นับฟิลด์ที่ต่างจากข้อมูลเดิม — ป้าย "changes: N" ข้างปุ่มบันทึก (รหัสผ่านนับเมื่อพิมพ์อะไรไว้ ไม่ต้องรอผ่านเงื่อนไขครบ)
    const baseline = formFromUser()
    const changeCount =
        (editForm.name.trim() !== baseline.name ? 1 : 0) +
        (editForm.username !== baseline.username ? 1 : 0) +
        (editForm.phone !== baseline.phone ? 1 : 0) +
        (editForm.password ? 1 : 0)

    function handleSaveClick() {
        setFormError("")

        if (!editForm.name.trim()) {
            setFormError("กรุณากรอกชื่อ")
            return
        }
        if (editForm.username && !USERNAME_PATTERN.test(editForm.username)) {
            setFormError("ชื่อผู้ใช้ต้องมีความยาว 3-32 ตัวอักษร ขึ้นต้นด้วยตัวอักษร และใช้ได้เฉพาะตัวอักษรภาษาอังกฤษพิมพ์เล็ก ตัวเลข ขีดกลาง (-) และขีดล่าง (_)")
            return
        }
        if (editForm.phone && !/^0[689]\d{8}$/.test(editForm.phone)) {
            setFormError("เบอร์มือถือไม่ถูกต้อง")
            return
        }
        if (editForm.password && !PASSWORD_PATTERN.test(editForm.password)) {
            setFormError("รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร และมีทั้งตัวอักษรและตัวเลข")
            return
        }

        setModalError("")
        setCurrentPassword("")
        setIsConfirmModalOpen(true)
    }

    function closeConfirmModal() {
        if (submitting) return
        setIsConfirmModalOpen(false)
        setCurrentPassword("")
        setModalError("")
    }

    async function handleConfirm() {
        if (!currentPassword) {
            setModalError("กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยัน")
            return
        }
        setSubmitting(true)
        setModalError("")
        try {
            await usersAPI.updateMe({
                name: editForm.name.trim(),
                // ส่งเฉพาะตอนมีค่า/เปลี่ยนจริง — @IsOptional ข้ามให้แค่ undefined ไม่ข้าม "" ที่จะโดน @Matches ตีตก
                ...(editForm.username && editForm.username !== user?.username ? { username: editForm.username } : {}),
                ...(editForm.phone ? { phone: editForm.phone } : {}),
                ...(editForm.password ? { newPassword: editForm.password } : {}),
                currentPassword,
            })
            setIsConfirmModalOpen(false)
            setCurrentPassword("")
            setEditForm((prev) => ({ ...prev, password: "" }))
            showToast("บันทึกข้อมูลสำเร็จ!", "ข้อมูลบัญชีของคุณได้รับการอัปเดตเรียบร้อยแล้ว")
            await refreshUser() // โหลด user ใหม่ ไม่งั้นชื่อ/username บน navbar ยังเป็นของเดิม
        } catch (err) {
            setModalError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        // ไม่ใส่ min-h-screen — app/organizer/layout.tsx จัดการให้แล้ว
        <div className="bg-surface pb-16">
            <OrganizerSettingsHero
                name={user?.name || "ผู้จัดกิจกรรม"}
                username={user?.username}
                email={user?.email}
                createdAt={user?.createdAt}
                validUntil={user?.validUntil}
                now={now}
            />

            <Container className="mt-8">
                <DenimPanel labelledBy="account-profile-heading">
                    {formError && (
                        <div role="alert" className="mb-5 rounded-xl border border-border bg-danger-bg p-3 text-sm text-danger">
                            {formError}
                        </div>
                    )}

                    <div className="flex flex-col gap-5">
                        <SettingsSectionLabel comment="account.profile" title="ข้อมูลบัญชี" />
                        <SettingsDivider />

                        <div className="grid gap-5 sm:grid-cols-2 sm:gap-x-8">
                            <SettingsField htmlFor="name" label="ชื่อผู้จัด / หน่วยงาน">
                                <DenimIconInput id="name" name="name" icon={UserRound} value={editForm.name} onChange={handleEditChange} />
                            </SettingsField>

                            <SettingsField
                                htmlFor="username"
                                label="ชื่อผู้ใช้ (สำหรับเข้าสู่ระบบ)"
                                hint="ภาษาอังกฤษพิมพ์เล็ก ตัวเลข ขีดกลาง (-) ขีดล่าง (_) เท่านั้น 3-32 ตัวอักษร — ใช้แทนรหัสผ่านตอนเข้าสู่ระบบ"
                            >
                                <DenimIconInput
                                    id="username"
                                    icon={AtSign}
                                    placeholder="org-event2026"
                                    value={editForm.username}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, username: e.target.value.toLowerCase() }))}
                                />
                            </SettingsField>
                        </div>

                        <SettingsDivider />

                        <div className="grid gap-5 sm:grid-cols-2 sm:gap-x-8">
                            <SettingsField
                                htmlFor="email"
                                label={
                                    <>
                                        อีเมล{" "}
                                        <span className="rounded bg-denim-chip px-1.5 py-0.5 font-code text-[11px] font-normal text-denim-muted">
                                            read-only
                                        </span>
                                    </>
                                }
                                hint={
                                    <>
                                        ใช้รับการแจ้งเตือนและกู้คืนบัญชีจากระบบ (ไม่ใช่สำหรับเข้าสู่ระบบ) เปลี่ยนเองไม่ได้ —{" "}
                                        <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-denim underline underline-offset-2">
                                            ติดต่อผู้ดูแลระบบ
                                        </a>
                                    </>
                                }
                            >
                                <DenimIconInput id="email" type="email" icon={Lock} value={user?.email || ""} disabled readOnly />
                            </SettingsField>

                            <SettingsField htmlFor="phone" label="เบอร์มือถือ">
                                <DenimIconInput
                                    id="phone"
                                    icon={Phone}
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={10}
                                    placeholder="0812345678"
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, "") }))}
                                />
                            </SettingsField>
                        </div>

                        <SettingsDivider />

                        <div className="grid gap-5 sm:grid-cols-2 sm:gap-x-8">
                            <SettingsSectionLabel
                                comment="security"
                                title="เปลี่ยนรหัสผ่าน"
                                description="เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยนรหัสผ่าน"
                            />
                            <div className="space-y-3">
                                <SettingsField htmlFor="password" label="รหัสผ่านใหม่">
                                    <DenimPasswordInput
                                        id="password"
                                        name="password"
                                        autoComplete="new-password"
                                        value={editForm.password}
                                        onChange={handleEditChange}
                                    />
                                </SettingsField>
                                <PasswordRequirements value={editForm.password} />
                            </div>
                        </div>

                        <SettingsDivider />

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="font-code text-xs text-denim-muted">changes: {changeCount}</span>
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-12 rounded-xl px-6 font-bold"
                                    onClick={() => {
                                        setEditForm(formFromUser())
                                        setFormError("")
                                    }}
                                >
                                    ยกเลิก
                                </Button>
                                <Button type="button" onClick={handleSaveClick} className="h-12 rounded-xl px-6 font-bold">
                                    ยืนยันการแก้ไข
                                </Button>
                            </div>
                        </div>
                    </div>
                </DenimPanel>
            </Container>

            <Dialog open={isConfirmModalOpen} onOpenChange={(open) => !open && closeConfirmModal()}>
                <DialogContent className="overflow-hidden rounded-2xl p-0 sm:max-w-md">
                    <div className="p-8">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <h2 className="text-xl font-bold tracking-tight text-fg">
                                กรอกรหัสผ่านปัจจุบันเพื่อยืนยัน
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
                            <div role="alert" className="mb-4 rounded-xl border border-border bg-danger-bg p-3 text-sm text-danger">
                                {modalError}
                            </div>
                        )}

                        <div className="mb-8 space-y-2">
                            <Label htmlFor="current-password">รหัสผ่านปัจจุบัน</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 size-4 text-fg-subtle" aria-hidden="true" />
                                <Input
                                    id="current-password"
                                    type="password"
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className="h-12 rounded-xl pl-10"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    disabled={submitting}
                                />
                            </div>
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
                            <Button onClick={handleConfirm} disabled={submitting} className="h-12 w-32 rounded-xl font-bold">
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
