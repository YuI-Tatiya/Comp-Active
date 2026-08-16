"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Lock, X, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Container } from "@/components/layout/container"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { usersAPI } from "@/lib/api"

export default function OrganizerSettingsPage() {
    const { user } = useAuth()
    const [newPassword, setNewPassword] = useState("")
    const [confirmNewPassword, setConfirmNewPassword] = useState("")
    const [formError, setFormError] = useState("")
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
    const [currentPassword, setCurrentPassword] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [modalError, setModalError] = useState("")
    const [done, setDone] = useState(false)

    function handleContinue(e: React.FormEvent) {
        e.preventDefault()
        setFormError("")
        setDone(false)   // เคลียร์ข้อความสำเร็จของรอบก่อน ไม่ให้ค้าง

        if (!newPassword || newPassword.length < 6) {
            setFormError("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร")
            return
        }
        if (newPassword !== confirmNewPassword) {
            setFormError("รหัสผ่านใหม่ไม่ตรงกัน")
            return
        }

        setModalError("")
        setCurrentPassword("")
        setIsConfirmModalOpen(true)
    }

    async function handleConfirm() {
        if (!currentPassword) {
            setModalError("กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยัน")
            return
        }
        setSubmitting(true)
        setModalError("")
        try {
            await usersAPI.updateMe({ newPassword, currentPassword })
            setIsConfirmModalOpen(false)
            setNewPassword("")
            setConfirmNewPassword("")
            setDone(true)
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
                <div className="mx-auto max-w-lg space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-fg">ตั้งค่าบัญชี</h1>
                        <p className="mt-1 text-sm text-fg-muted">
                            {user?.username ? `Username: ${user.username}` : user?.email}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border bg-bg p-8 shadow-xs">
                        <h2 className="font-semibold text-fg">เปลี่ยนรหัสผ่าน</h2>
                        <p className="mt-1 mb-6 text-sm text-fg-muted">
                            ตั้งรหัสผ่านใหม่สำหรับเข้าสู่ระบบครั้งถัดไป
                        </p>

                        {done && (
                            <div className="mb-6 flex items-center gap-2 rounded-xl border border-border bg-success-bg p-3 text-sm text-success">
                                <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                                เปลี่ยนรหัสผ่านเรียบร้อยแล้ว
                            </div>
                        )}
                        {formError && (
                            <div
                                role="alert"
                                className="mb-4 rounded-xl border border-border bg-danger-bg p-3 text-sm text-danger"
                            >
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleContinue} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 size-4 text-fg-subtle" aria-hidden="true" />
                                    <Input
                                        id="new-password"
                                        type="password"
                                        autoComplete="new-password"
                                        placeholder="••••••••"
                                        className="h-12 rounded-xl pl-10"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-new-password">ยืนยันรหัสผ่านใหม่</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 size-4 text-fg-subtle" aria-hidden="true" />
                                    <Input
                                        id="confirm-new-password"
                                        type="password"
                                        autoComplete="new-password"
                                        placeholder="••••••••"
                                        className="h-12 rounded-xl pl-10"
                                        value={confirmNewPassword}
                                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="h-12 w-full rounded-xl font-bold">
                                เปลี่ยนรหัสผ่าน
                            </Button>
                        </form>
                    </div>
                </div>
            </Container>

            <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
                <DialogContent className="overflow-hidden rounded-2xl p-0 sm:max-w-md">
                    <div className="p-8">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <h2 className="text-xl font-bold tracking-tight text-fg">
                                กรอกรหัสผ่านปัจจุบันเพื่อยืนยัน
                            </h2>
                            <button
                                type="button"
                                onClick={() => !submitting && setIsConfirmModalOpen(false)}
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

                        {/* ยืนยัน = ปุ่มหลัก · ยกเลิก = outline — เดิมสองปุ่มหน้าตาเกือบเหมือนกัน */}
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setIsConfirmModalOpen(false)}
                                disabled={submitting}
                                className="h-12 w-32 rounded-xl font-bold"
                            >
                                ยกเลิก
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                disabled={submitting}
                                className="h-12 w-32 rounded-xl font-bold"
                            >
                                {submitting ? "กำลังบันทึก..." : "ยืนยัน"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
