"use client"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Lock, X, UserRound, AtSign, Phone, CalendarPlus, CalendarClock } from "lucide-react"
import { Toast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Container } from "@/components/layout/container"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { usersAPI } from "@/lib/api"
import { formatThaiDate } from "@/lib/transcript"

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

export default function OrganizerSettingsPage() {
    const { user, refreshUser } = useAuth()

    const [editForm, setEditForm] = useState(EMPTY_FORM)
    const [formError, setFormError] = useState("")
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
    const [currentPassword, setCurrentPassword] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [modalError, setModalError] = useState("")

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
        <div className="bg-surface font-sans">
            <Container className="py-12">
                <div className="mx-auto max-w-2xl space-y-6">
                    {/* หัวโปรไฟล์ */}
                    <div className="space-y-4 rounded-2xl border border-border bg-bg p-8 shadow-xs">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-fg">{user?.name || "ผู้จัดกิจกรรม"}</h1>
                            <p className="mt-1 text-sm text-fg-muted">ตั้งค่าบัญชีผู้จัดกิจกรรม</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="neutral">@{user?.username || "ไม่ระบุชื่อผู้ใช้"}</Badge>
                            <Badge variant="neutral">{user?.email}</Badge>
                            {user?.createdAt && (
                                <Badge variant="neutral" className="gap-1">
                                    <CalendarPlus className="size-3" aria-hidden="true" /> สมัครเมื่อ {formatThaiDate(user.createdAt)}
                                </Badge>
                            )}
                            <Badge variant="neutral" className="gap-1">
                                <CalendarClock className="size-3" aria-hidden="true" />
                                {user?.validUntil ? `ใช้งานได้ถึง ${formatThaiDate(user.validUntil)}` : "ไม่มีกำหนดหมดอายุ"}
                            </Badge>
                        </div>
                    </div>

                    {/* ฟอร์มแก้ไขข้อมูล */}
                    <div className="rounded-2xl border border-border bg-bg p-8 shadow-xs">
                        <h2 className="mb-6 font-semibold text-fg">ข้อมูลบัญชี</h2>

                        {formError && (
                            <div role="alert" className="mb-4 rounded-xl border border-border bg-danger-bg p-3 text-sm text-danger">
                                {formError}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="name">ชื่อผู้จัด / หน่วยงาน</Label>
                                <div className="relative">
                                    <UserRound className="absolute left-3 top-3 size-4 text-fg-subtle" aria-hidden="true" />
                                    <Input
                                        id="name"
                                        name="name"
                                        value={editForm.name}
                                        onChange={handleEditChange}
                                        className="h-12 rounded-xl pl-10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="username">ชื่อผู้ใช้ (สำหรับเข้าสู่ระบบ)</Label>
                                <div className="relative">
                                    <AtSign className="absolute left-3 top-3 size-4 text-fg-subtle" aria-hidden="true" />
                                    <Input
                                        id="username"
                                        name="username"
                                        placeholder="org-event2026"
                                        value={editForm.username}
                                        onChange={(e) =>
                                            setEditForm((prev) => ({ ...prev, username: e.target.value.toLowerCase() }))
                                        }
                                        className="h-12 rounded-xl pl-10"
                                    />
                                </div>
                                <p className="text-xs text-fg-subtle">
                                    ภาษาอังกฤษพิมพ์เล็ก ตัวเลข ขีดกลาง (-) ขีดล่าง (_) เท่านั้น 3-32 ตัวอักษร — ใช้แทนรหัสผ่านตอนเข้าสู่ระบบ
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">อีเมล</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={user?.email || ""}
                                    disabled
                                    readOnly
                                    className="h-12 rounded-xl"
                                />
                                <p className="text-xs text-fg-subtle">
                                    ใช้รับการแจ้งเตือนและกู้คืนบัญชีจากระบบ (ไม่ใช่สำหรับเข้าสู่ระบบ) เปลี่ยนเองไม่ได้ — ติดต่อผู้ดูแลระบบ
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">เบอร์มือถือ</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 size-4 text-fg-subtle" aria-hidden="true" />
                                    <Input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        inputMode="numeric"
                                        maxLength={10}
                                        placeholder="0812345678"
                                        value={editForm.phone}
                                        onChange={(e) =>
                                            setEditForm((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, "") }))
                                        }
                                        className="h-12 rounded-xl pl-10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 border-t border-border pt-5">
                                <Label htmlFor="password">เปลี่ยนรหัสผ่าน</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 size-4 text-fg-subtle" aria-hidden="true" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="new-password"
                                        placeholder="••••••••"
                                        value={editForm.password}
                                        onChange={handleEditChange}
                                        className="h-12 rounded-xl pl-10"
                                    />
                                </div>
                                <p className="text-xs text-fg-subtle">เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยนรหัสผ่าน — อย่างน้อย 8 ตัวอักษร มีทั้งตัวอักษรและตัวเลข</p>
                            </div>

                            <div className="flex justify-end gap-3 border-t border-border pt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-12 rounded-xl px-6 font-bold"
                                    onClick={() => { setEditForm(formFromUser()); setFormError("") }}
                                >
                                    ยกเลิก
                                </Button>
                                <Button type="button" onClick={handleSaveClick} className="h-12 rounded-xl px-6 font-bold">
                                    ยืนยันการแก้ไข
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
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
