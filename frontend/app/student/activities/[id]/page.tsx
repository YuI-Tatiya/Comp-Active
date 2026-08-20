"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, MapPin, Users, Share2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { activitiesAPI, registrationsAPI, isUnlimitedCapacity, Activity, API_BASE_URL, RegistrationAnswerBody } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { categoryLabel } from "@/lib/categories"
import {
    ActivityAboutPanel,
    ActivityRegistrationPanel,
    ActivityRewardsPanel,
} from "@/components/activity/activity-info-panels"

// Local types removed, using Activity from @/lib/api

export default function EventDetailsPage() {
    const { user } = useAuth()
    const [isRegisterOpen, setIsRegisterOpen] = useState(false)
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [event, setEvent] = useState<Activity | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [registerForm, setRegisterForm] = useState({ name: '', studentId: '', email: '' })
    const [formError, setFormError] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [answers, setAnswers] = useState<Record<number, { textValue?: string; optionIds?: number[] }>>({})

    useEffect(() => {
        if (params.id) {
            fetchEventDetails(Number(params.id))
        }
    }, [params.id])

    const openRegisterDialog = useCallback(() => {
        // Pre-fill with profile data
        setRegisterForm({
            name: user?.name || '',
            studentId: (user as { studentId?: string } | null)?.studentId || '',
            email: user?.email || '',
        })
        setFormError("")
        setAnswers({})
        setIsRegisterOpen(true)
    }, [user])

    // Auto-open register dialog if ?register=true
    useEffect(() => {
        if (!loading && event && searchParams.get('register') === 'true') {
            openRegisterDialog()
        }
    }, [loading, event, searchParams, openRegisterDialog])

    const fetchEventDetails = async (id: number) => {
        try {
            setLoading(true)
            const data = await activitiesAPI.getById(id)
            setEvent(data)
        } catch (err: unknown) {
            const e = err as Error;
            setError(e.message || "โหลดข้อมูลกิจกรรมไม่สำเร็จ")
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError("")

        // --- Validate against profile ---
        const profileName = user?.name?.trim().toLowerCase() || ''
        const profileStudentId = ((user as { studentId?: string } | null)?.studentId || '').trim()
        const profileEmail = user?.email?.trim().toLowerCase() || ''

        const enteredName = registerForm.name.trim().toLowerCase()
        const enteredStudentId = registerForm.studentId.trim()
        const enteredEmail = registerForm.email.trim().toLowerCase()

        if (enteredName !== profileName) {
            setFormError('ชื่อ-นามสกุลไม่ตรงกับบัญชีผู้ใช้ของคุณ')
            return
        }
        if (profileStudentId && enteredStudentId !== profileStudentId) {
            setFormError('รหัสนักศึกษาไม่ตรงกับบัญชีผู้ใช้ของคุณ')
            return
        }
        if (enteredEmail !== profileEmail) {
            setFormError('อีเมลไม่ตรงกับบัญชีผู้ใช้ของคุณ')
            return
        }

        // --- ตรวจคำถามบังคับตอบ ---
        for (const q of event?.questions ?? []) {
            if (!q.required) continue
            const a = answers[q.id]
            const answered = q.type === 'text' ? !!a?.textValue?.trim() : (a?.optionIds?.length ?? 0) > 0
            if (!answered) {
                setFormError(`กรุณาตอบคำถาม: ${q.label}`)
                return
            }
        }

        // --- Submit ---
        try {
            setSubmitting(true)
            if (!event) return;
            const answerPayload: RegistrationAnswerBody[] = Object.entries(answers).map(([questionId, a]) => ({
                questionId: Number(questionId),
                textValue: a.textValue,
                optionIds: a.optionIds,
            }))
            await registrationsAPI.create(event.id, answerPayload)
            setIsRegisterOpen(false)
            alert("ลงทะเบียนสำเร็จ!")
            fetchEventDetails(event.id) // Refresh data
        } catch (err: unknown) {
            const e = err as Error;
            setFormError(e.message || "ลงทะเบียนไม่สำเร็จ")
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-fg-muted">กำลังโหลดรายละเอียดกิจกรรม...</p>
                </div>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
                <div className="bg-bg p-8 rounded-xl shadow-sm max-w-md w-full text-center">
                    <div className="text-danger mb-4 text-5xl">⚠️</div>
                    <h2 className="text-xl font-bold mb-2">ไม่พบกิจกรรม</h2>
                    <p className="text-fg-muted mb-6">{error || "กิจกรรมนี้อาจถูกลบหรือไม่มีอยู่จริง"}</p>
                    <Button onClick={() => router.push('/student/events')} className="w-full">
                        กลับไปหน้าค้นหากิจกรรม
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-surface pb-12">
            {/* Navigation Bar (assuming global layout or imported) */}

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Back Button */}
                <div className="mb-6">
                    <Link href="/student" className="inline-flex items-center text-fg-muted hover:text-fg transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" /> กลับ
                    </Link>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content (Left) */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Hero Image */}
                        <div className="aspect-video w-full bg-surface-2 rounded-xl overflow-hidden relative border border-border">
                            {event.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={`${API_BASE_URL}${event.imageUrl}`} alt={event.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-fg-subtle">
                                    ไม่มีรูปภาพ
                                </div>
                            )}
                            <div className="absolute top-4 left-4 flex gap-2">
                                <Badge className="bg-brand-600">{categoryLabel(event.category)}</Badge>
                                <Badge className={event.status === 'open' ? "bg-success/90" : "bg-fg-subtle/90"}>
                                    {event.status === 'open' ? 'เปิดรับสมัคร' : 'ปิดรับสมัคร'}
                                </Badge>
                            </div>
                        </div>

                        {/* Title & Info */}
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-fg mb-2">{event.name}</h1>
                            <div className="flex items-center text-fg-muted gap-2 mb-6">
                                <Users className="w-5 h-5 text-fg-subtle" />
                                <span>จัดโดย {event.organizer?.name || 'ไม่ระบุ'}</span>
                            </div>

                            {/* Tabs */}
                            <Tabs defaultValue="details" className="w-full">
                                <TabsList className="w-full justify-start bg-surface-2 p-1 rounded-lg mb-6">
                                    <TabsTrigger value="details" className="flex-1">รายละเอียด</TabsTrigger>
                                    <TabsTrigger value="rewards" className="flex-1">สิ่งที่จะได้รับ</TabsTrigger>
                                    <TabsTrigger value="registration" className="flex-1">การลงทะเบียน</TabsTrigger>
                                </TabsList>

                                <TabsContent value="details">
                                    <ActivityAboutPanel activity={event} />
                                </TabsContent>

                                <TabsContent value="rewards">
                                    <ActivityRewardsPanel activity={event} />
                                </TabsContent>

                                <TabsContent value="registration">
                                    <ActivityRegistrationPanel activity={event} />
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>

                    {/* Sidebar (Right) */}
                    <div className="space-y-6">
                        <Card className="border-border shadow-sm overflow-hidden">
                            <div className="p-6 space-y-6">
                                <h3 className="font-semibold text-lg">ข้อมูลกิจกรรม</h3>

                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-fg-muted">วันที่</div>
                                            <div className="font-medium text-fg">{event.date}</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-fg-muted">เวลา</div>
                                            <div className="font-medium text-fg">{event.startTime} - {event.endTime}</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-fg-muted">สถานที่</div>
                                            <div className="font-medium text-fg">{event.location}</div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-border">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2 text-sm font-medium text-fg">
                                                <Users className="w-4 h-4" /> ผู้เข้าร่วม
                                            </div>
                                            <span className="text-sm text-fg-muted">
                                                {event.registrations?.length || 0}{isUnlimitedCapacity(event.capacity) ? " คน (ไม่จำกัด)" : `/${event.capacity} คน`}
                                            </span>
                                        </div>
                                        {!isUnlimitedCapacity(event.capacity) && (
                                            <>
                                                <Progress value={event.registrations?.length || 0} max={event.capacity} className="h-2" />
                                                <p className="text-xs text-fg-subtle mt-2 text-right">เหลืออีก {event.capacity! - (event.registrations?.length || 0)} ที่นั่ง</p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <Button className="w-full bg-brand-600 hover:bg-brand-700 h-11 text-base font-semibold" onClick={openRegisterDialog}>
                                        ลงทะเบียนเข้าร่วม
                                    </Button>
                                    <Button variant="outline" className="w-full border-border hover:bg-surface text-fg-muted">
                                        <Share2 className="w-4 h-4 mr-2" /> แชร์กิจกรรม
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Registration Modal */}
            <Dialog open={isRegisterOpen} onOpenChange={(open) => { setIsRegisterOpen(open); if (open) openRegisterDialog(); }}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>ลงทะเบียนเข้าร่วมกิจกรรม</DialogTitle>
                        <p className="text-fg-muted text-sm">กรุณายืนยันข้อมูลของคุณเพื่อยืนยันตัวตนก่อนลงทะเบียน</p>
                    </DialogHeader>

                    <form onSubmit={handleRegister} className="space-y-4 py-2">
                        {formError && (
                            <div className="bg-danger-bg border border-danger text-danger text-sm font-medium px-4 py-3 rounded-lg flex items-center gap-2">
                                <span>⚠️</span> {formError}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="reg-name">ชื่อ-นามสกุล <span className="text-danger">*</span></Label>
                            <Input
                                id="reg-name"
                                value={registerForm.name}
                                onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="กรอกชื่อ-นามสกุล"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reg-studentId">รหัสนักศึกษา <span className="text-danger">*</span></Label>
                            <Input
                                id="reg-studentId"
                                value={registerForm.studentId}
                                onChange={(e) => setRegisterForm(prev => ({ ...prev, studentId: e.target.value }))}
                                placeholder="กรอกรหัสนักศึกษา"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reg-email">อีเมล <span className="text-danger">*</span></Label>
                            <Input
                                id="reg-email"
                                type="email"
                                value={registerForm.email}
                                onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="กรอกอีเมล"
                                required
                            />
                        </div>

                        {event.questions && event.questions.length > 0 && (
                            <div className="space-y-4 border-t border-gray-100 pt-4">
                                <p className="text-sm font-medium text-fg">คำถามเพิ่มเติม</p>
                                {event.questions.map((q) => (
                                    <div key={q.id} className="space-y-2">
                                        <Label>{q.label} {q.required && <span className="text-danger">*</span>}</Label>
                                        {q.type === 'text' && (
                                            <Input
                                                value={answers[q.id]?.textValue || ''}
                                                onChange={(e) =>
                                                    setAnswers((prev) => ({ ...prev, [q.id]: { textValue: e.target.value } }))
                                                }
                                            />
                                        )}
                                        {q.type === 'single_choice' && (
                                            <div className="space-y-1.5">
                                                {q.options.map((opt) => (
                                                    <label key={opt.id} className="flex items-center gap-2 text-sm text-fg-muted">
                                                        <input
                                                            type="radio"
                                                            name={`question-${q.id}`}
                                                            checked={(answers[q.id]?.optionIds ?? [])[0] === opt.id}
                                                            onChange={() =>
                                                                setAnswers((prev) => ({ ...prev, [q.id]: { optionIds: [opt.id] } }))
                                                            }
                                                        />
                                                        {opt.label}
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                        {q.type === 'multi_choice' && (
                                            <div className="space-y-1.5">
                                                {q.options.map((opt) => {
                                                    const selected = answers[q.id]?.optionIds ?? []
                                                    const checked = selected.includes(opt.id)
                                                    return (
                                                        <label key={opt.id} className="flex items-center gap-2 text-sm text-fg-muted">
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={(e) => {
                                                                    const next = e.target.checked
                                                                        ? [...selected, opt.id]
                                                                        : selected.filter((id) => id !== opt.id)
                                                                    setAnswers((prev) => ({ ...prev, [q.id]: { optionIds: next } }))
                                                                }}
                                                            />
                                                            {opt.label}
                                                        </label>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <p className="text-xs text-fg-subtle bg-surface px-3 py-2 rounded-lg">* ข้อมูลจะถูกตรวจสอบกับบัญชีผู้ใช้ที่ลงทะเบียนไว้ หากไม่ตรงกันจะไม่สามารถลงทะเบียนได้</p>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)} disabled={submitting}>ยกเลิก</Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? 'กำลังลงทะเบียน...' : 'ยืนยันการลงทะเบียน'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
