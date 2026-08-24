"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, MapPin, Users, Share2, ArrowLeft, Tag, Info, CheckCircle, Gift } from "lucide-react"
import Link from "next/link"
import { Container } from "@/components/layout/container"
import { activitiesAPI, isUnlimitedCapacity, Activity, Tag as TagType, Condition, Benefit, API_BASE_URL } from "@/lib/api"

/**
 * มุมมอง "ดูอย่างเดียว" ของกิจกรรมเดี่ยวสำหรับผู้จัด — ใช้ตอนกดดูกิจกรรมที่ไม่ใช่ของตัวเอง
 * (จากฟีดกิจกรรมทั้งหมดในหน้าแรก, หรือจากรายการกิจกรรมย่อยของงานอื่น) ต่างจาก
 * /organizer/activities/:id ที่เป็นหน้าจัดการเต็มรูปแบบและล็อกไว้เฉพาะเจ้าของ — หน้านี้อยู่ใน
 * layout ของผู้จัดเอง (AppHeader/RoleGuard ยังคุมอยู่) ไม่มีปุ่มจัดการหรือลงทะเบียนใด ๆ
 */
export default function OrganizerActivityViewPage() {
    const params = useParams()
    const router = useRouter()
    const [activity, setActivity] = useState<Activity | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        if (params.id) {
            fetchActivity(Number(params.id))
        }
    }, [params.id])

    const fetchActivity = async (id: number) => {
        try {
            setLoading(true)
            const data = await activitiesAPI.getById(id)
            setActivity(data)
        } catch (err: unknown) {
            const e = err as Error
            setError(e.message || "โหลดข้อมูลกิจกรรมไม่สำเร็จ")
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString)
            return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(date)
        } catch {
            return dateString
        }
    }

    const handleShare = () => {
        if (!activity) return
        const publicUrl = `${window.location.origin}/events/${activity.id}`
        navigator.clipboard.writeText(publicUrl)
        alert("คัดลอกลิงก์สำหรับแชร์ให้บุคคลทั่วไปเรียบร้อยแล้ว!")
    }

    if (loading) {
        return (
            <div className="bg-surface">
                <Container className="flex flex-col items-center justify-center py-32">
                    <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
                    <p className="text-fg-muted mt-4">กำลังโหลดรายละเอียดกิจกรรม...</p>
                </Container>
            </div>
        )
    }

    if (error || !activity) {
        return (
            <div className="bg-surface">
                <Container className="flex flex-col items-center justify-center gap-4 py-32">
                    <p className="font-medium text-danger">{error || "ไม่พบกิจกรรม"}</p>
                    <Button variant="outline" onClick={() => router.push("/organizer")}>
                        กลับไปหน้าแรก
                    </Button>
                </Container>
            </div>
        )
    }

    return (
        <div className="bg-surface pb-12">
            <Container className="py-8">
                <div className="mb-6">
                    <Link
                        href="/organizer"
                        className="inline-flex items-center text-fg-muted hover:text-fg font-medium transition-colors bg-bg px-4 py-2 rounded-full shadow-sm border border-border"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> กลับไปยังรายการกิจกรรม
                    </Link>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="aspect-video w-full bg-fg rounded-[24px] overflow-hidden relative shadow-md">
                            {activity.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={`${API_BASE_URL}${activity.imageUrl}`} alt={activity.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-white/50 bg-fg text-lg font-medium">
                                    ไม่มีรูปภาพ
                                </div>
                            )}
                            <div className="absolute top-4 left-4 flex gap-2">
                                <Badge className="bg-bg text-brand-700 hover:bg-bg shadow-md text-xs font-bold px-3 py-1">{activity.category}</Badge>
                                <Badge className={`shadow-md text-xs font-bold px-3 py-1 text-white ${activity.status === "open" || !activity.status ? "bg-success hover:bg-success/90" : "bg-fg-subtle hover:bg-fg-subtle/90"}`}>
                                    {activity.status === "open" || !activity.status ? "เปิดรับสมัคร" : "ปิดรับสมัคร"}
                                </Badge>
                            </div>
                        </div>

                        <div className="bg-bg p-8 rounded-[24px] shadow-sm border border-border">
                            <h1 className="text-3xl font-black text-fg mb-2">{activity.name}</h1>
                            <div className="flex items-center text-fg-muted gap-2 mb-8 font-medium">
                                <Users className="w-5 h-5 text-fg-subtle" />
                                <span>จัดโดย {activity.organizer?.name || "ไม่ระบุผู้จัด"}</span>
                            </div>

                            <Tabs defaultValue="details" className="w-full">
                                <TabsList className="w-full justify-start bg-surface p-1.5 rounded-xl mb-6">
                                    <TabsTrigger value="details" className="flex-1 rounded-lg data-[state=active]:bg-bg data-[state=active]:shadow-sm font-bold text-fg-muted data-[state=active]:text-brand-600">รายละเอียด</TabsTrigger>
                                    <TabsTrigger value="conditions" className="flex-1 rounded-lg data-[state=active]:bg-bg data-[state=active]:shadow-sm font-bold text-fg-muted data-[state=active]:text-brand-600">เงื่อนไข</TabsTrigger>
                                    <TabsTrigger value="benefits" className="flex-1 rounded-lg data-[state=active]:bg-bg data-[state=active]:shadow-sm font-bold text-fg-muted data-[state=active]:text-brand-600">สิทธิประโยชน์</TabsTrigger>
                                </TabsList>

                                <TabsContent value="details" className="bg-surface p-6 rounded-2xl border border-border">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-fg">
                                        <Info className="w-5 h-5 text-brand-500" /> เกี่ยวกับกิจกรรม
                                    </h3>
                                    <p className="text-fg-muted leading-relaxed whitespace-pre-line">{activity.description}</p>

                                    <div className="mt-8 pt-6 border-t border-border">
                                        <h4 className="text-sm font-bold mb-3 text-fg">ป้ายกำกับ (Tags)</h4>
                                        <div className="flex gap-2 flex-wrap">
                                            {activity.tags?.map((tag: TagType) => (
                                                <Badge key={tag.tagName} variant="secondary" className="px-3 py-1 font-medium text-fg-muted bg-bg border border-border hover:bg-surface">
                                                    <Tag className="w-3 h-3 mr-1" /> {tag.tagName}
                                                </Badge>
                                            )) || <span className="text-sm text-fg-muted">ไม่มีป้ายกำกับ</span>}
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="conditions" className="bg-surface p-6 rounded-2xl border border-border">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-fg">
                                        <CheckCircle className="w-5 h-5 text-cat-competition" /> เงื่อนไขการเข้าร่วม
                                    </h3>
                                    {activity.conditions && activity.conditions.length > 0 ? (
                                        <ul className="space-y-3">
                                            {activity.conditions.map((item: Condition, i: number) => (
                                                <li key={i} className="flex gap-3 text-fg-muted font-medium">
                                                    <div className="w-6 h-6 rounded-full bg-cat-competition-bg text-cat-competition flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                                                    <span>{item.conditionText}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="py-8 text-center bg-bg rounded-xl border border-dashed border-border">
                                            <p className="text-fg-muted font-medium">ไม่มีข้อมูลเงื่อนไขการเข้าร่วม</p>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="benefits" className="bg-surface p-6 rounded-2xl border border-border">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-fg">
                                        <Gift className="w-5 h-5 text-cat-academic" /> สิทธิประโยชน์
                                    </h3>
                                    {activity.benefits && activity.benefits.length > 0 ? (
                                        <ul className="space-y-3">
                                            {activity.benefits.map((item: Benefit, i: number) => (
                                                <li key={i} className="flex gap-3 text-fg-muted font-medium">
                                                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                                                    <span>{item.benefitText}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="py-8 text-center bg-bg rounded-xl border border-dashed border-border">
                                            <p className="text-fg-muted font-medium">ไม่มีข้อมูลสิทธิประโยชน์ระบุไว้</p>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <Card className="border-border shadow-xl shadow-fg/5 rounded-[24px] overflow-hidden sticky top-28">
                            <div className="p-8 space-y-8">
                                <h3 className="font-black text-xl text-fg border-b border-border pb-4">ข้อมูลภาพรวม</h3>

                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-cat-tech-bg flex items-center justify-center text-cat-tech flex-shrink-0 shadow-sm">
                                            <Calendar className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-fg-subtle uppercase tracking-wider mb-1">วันที่จัดกิจกรรม</div>
                                            <div className="font-bold text-fg">{formatDate(activity.date)}</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-cat-competition-bg flex items-center justify-center text-cat-competition flex-shrink-0 shadow-sm">
                                            <Clock className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-fg-subtle uppercase tracking-wider mb-1">เวลา</div>
                                            <div className="font-bold text-fg">{activity.startTime} - {activity.endTime}</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-cat-sports-bg flex items-center justify-center text-cat-sports flex-shrink-0 shadow-sm">
                                            <MapPin className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-fg-subtle uppercase tracking-wider mb-1">สถานที่</div>
                                            <div className="font-bold text-fg leading-tight">{activity.location}</div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-border">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2 text-sm font-bold text-fg-muted">
                                                <Users className="w-4 h-4 text-cat-volunteer" /> จำนวนที่รับสมัคร
                                            </div>
                                            <span className="text-sm font-black text-fg">
                                                {activity.registeredCount || 0}{isUnlimitedCapacity(activity.capacity) ? " คน (ไม่จำกัด)" : `/${activity.capacity} คน`}
                                            </span>
                                        </div>
                                        {!isUnlimitedCapacity(activity.capacity) && (
                                            <>
                                                <Progress value={activity.registeredCount || 0} max={activity.capacity} className="h-2.5 bg-surface" />
                                                <p className="text-sm font-medium text-success mt-3 text-center bg-success-bg py-1.5 rounded-lg border border-success/20">
                                                    เหลืออีก {activity.capacity! - (activity.registeredCount || 0)} ที่นั่งว่าง
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-border relative">
                                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
                                    <Button variant="outline" className="w-full font-bold rounded-xl h-12" onClick={handleShare}>
                                        <Share2 className="w-4 h-4 mr-2" /> แชร์กิจกรรม
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </Container>
        </div>
    )
}
