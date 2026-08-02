"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Lock, X, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
        <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-lg mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">ตั้งค่าบัญชี</h1>
                    <p className="text-slate-500 text-sm mt-1">{user?.username ? `Username: ${user.username}` : user?.email}</p>
                </div>

                <div className="bg-white rounded-[24px] p-8 shadow-sm border border-slate-100">
                    <h2 className="font-bold text-slate-900 mb-1">เปลี่ยนรหัสผ่าน</h2>
                    <p className="text-sm text-slate-500 mb-6">ตั้งรหัสผ่านใหม่สำหรับเข้าสู่ระบบครั้งถัดไป</p>

                    {done && (
                        <div className="mb-6 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl p-3">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            เปลี่ยนรหัสผ่านเรียบร้อยแล้ว
                        </div>
                    )}
                    {formError && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3">
                            {formError}
                        </div>
                    )}

                    <form onSubmit={handleContinue} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="new-password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-10 h-12 rounded-xl"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-new-password">ยืนยันรหัสผ่านใหม่</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="confirm-new-password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-10 h-12 rounded-xl"
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button type="submit" className="w-full h-12 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700">
                            เปลี่ยนรหัสผ่าน
                        </Button>
                    </form>
                </div>
            </div>

            <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
                <DialogContent className="sm:max-w-md rounded-[24px] p-0 overflow-hidden bg-slate-200 border-none shadow-2xl">
                    <div className="p-8 pb-10">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">กรอกรหัสผ่านปัจจุบันเพื่อยืนยัน</h2>
                            <button onClick={() => !submitting && setIsConfirmModalOpen(false)} className="text-slate-500 hover:text-slate-900 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {modalError && (
                            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3">
                                {modalError}
                            </div>
                        )}

                        <Input
                            type="password"
                            className="h-14 bg-white rounded-xl border-none shadow-inner text-center font-bold text-lg mb-8"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            disabled={submitting}
                        />

                        <div className="flex justify-center gap-4">
                            <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)} disabled={submitting} className="h-12 w-32 rounded-xl font-bold bg-white/80 border-slate-300 text-slate-600 hover:bg-white hover:text-slate-900">ยกเลิก</Button>
                            <Button onClick={handleConfirm} disabled={submitting} className="h-12 w-32 rounded-xl font-bold bg-white/80 border-slate-300 text-slate-800 hover:bg-white border">
                                {submitting ? "กำลังบันทึก..." : "ยืนยัน"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
