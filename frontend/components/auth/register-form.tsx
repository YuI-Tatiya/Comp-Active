"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Mail, Lock, GraduationCap, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export function RegisterForm() {
    const { register } = useAuth()
    const [name, setName] = useState("")
    const [studentId, setStudentId] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!name || !email || !password) {
            setError("กรุณากรอกข้อมูลให้ครบถ้วน")
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
            })
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message)
            } else {
                setError("สมัครสมาชิกไม่สำเร็จ")
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
                    {error}
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="name">ชื่อ-นามสกุล</Label>
                <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="name" placeholder="กรอกชื่อ-นามสกุล" className="pl-10"
                        value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="student-id">รหัสนักศึกษา</Label>
                <div className="relative">
                    <GraduationCap className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="student-id" placeholder="กรอกรหัสนักศึกษา" className="pl-10"
                        value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={loading} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="register-email">อีเมล (ต้องใช้ @kkumail.com เท่านั้น)</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="register-email" type="email" placeholder="your.name@kkumail.com" className="pl-10"
                        value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="register-password">รหัสผ่าน</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="register-password" type="password" placeholder="••••••••" className="pl-10"
                        value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="confirm-password">ยืนยันรหัสผ่าน</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="confirm-password" type="password" placeholder="••••••••" className="pl-10"
                        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} />
                </div>
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        กำลังสมัครสมาชิก...
                    </>
                ) : (
                    "สมัครสมาชิก"
                )}
            </Button>
        </form>
    )
}
