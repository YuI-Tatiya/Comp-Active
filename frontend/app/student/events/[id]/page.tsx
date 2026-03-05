"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, MapPin, Users, Share2, ArrowLeft, Tag, Info, CheckCircle, Gift } from "lucide-react"
import Link from "next/link"
import { activitiesAPI, registrationsAPI, Activity, Tag as TagType, Condition, Benefit } from "@/lib/api"

// Local types removed, using Activity from @/lib/api

export default function EventDetailsPage() {
    const [isRegisterOpen, setIsRegisterOpen] = useState(false)
    const params = useParams()
    const router = useRouter()
    const [event, setEvent] = useState<Activity | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        if (params.id) {
            fetchEventDetails(Number(params.id))
        }
    }, [params.id])

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
        try {
            if (!event) return;
            await registrationsAPI.create(event.id)
            setIsRegisterOpen(false)
            alert("ลงทะเบียนสำเร็จ!")
            fetchEventDetails(event.id) // Refresh data
        } catch (err: unknown) {
            const e = err as Error;
            alert(e.message || "ลงทะเบียนไม่สำเร็จ")
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">กำลังโหลดรายละเอียดกิจกรรม...</p>
                </div>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-sm max-w-md w-full text-center">
                    <div className="text-red-500 mb-4 text-5xl">⚠️</div>
                    <h2 className="text-xl font-bold mb-2">ไม่พบกิจกรรม</h2>
                    <p className="text-gray-600 mb-6">{error || "กิจกรรมนี้อาจถูกลบหรือไม่มีอยู่จริง"}</p>
                    <Button onClick={() => router.push('/student/events')} className="w-full">
                        กลับไปหน้าค้นหากิจกรรม
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Navigation Bar (assuming global layout or imported) */}

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Back Button */}
                <div className="mb-6">
                    <Link href="/student" className="inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" /> กลับ
                    </Link>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content (Left) */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Hero Image */}
                        <div className="aspect-video w-full bg-gray-200 rounded-xl overflow-hidden relative">
                            {event.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={`http://localhost:3001${event.imageUrl}`} alt={event.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-white bg-gradient-to-br from-blue-500 to-purple-600">
                                    ไม่มีรูปภาพ
                                </div>
                            )}
                            <div className="absolute top-4 left-4 flex gap-2">
                                <Badge className="bg-blue-600 hover:bg-blue-700">{event.category}</Badge>
                                <Badge className={event.status === 'open' ? "bg-green-500 hover:bg-green-600" : "bg-gray-500 hover:bg-gray-600"}>
                                    {event.status === 'open' ? 'เปิดรับสมัคร' : event.status}
                                </Badge>
                            </div>
                        </div>

                        {/* Title & Info */}
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{event.name}</h1>
                            <div className="flex items-center text-gray-500 gap-2 mb-6">
                                <Users className="w-5 h-5 text-gray-400" />
                                <span>จัดโดย {event.organizer?.name || 'ไม่ระบุ'}</span>
                            </div>

                            {/* Tabs */}
                            <Tabs defaultValue="details" className="w-full">
                                <TabsList className="w-full justify-start bg-gray-100 p-1 rounded-lg mb-6">
                                    <TabsTrigger value="details" className="flex-1">รายละเอียด</TabsTrigger>
                                    <TabsTrigger value="conditions" className="flex-1">เงื่อนไข</TabsTrigger>
                                    <TabsTrigger value="benefits" className="flex-1">สิทธิประโยชน์</TabsTrigger>
                                </TabsList>

                                <TabsContent value="details" className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <Info className="w-5 h-5 text-blue-500" /> เกี่ยวกับกิจกรรม
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">{event.description}</p>

                                    <div className="mt-8 pt-6 border-t border-gray-100">
                                        <h4 className="text-sm font-semibold mb-3 text-gray-900">Tags</h4>
                                        <div className="flex gap-2 flex-wrap">
                                            {event.tags?.map((tag: TagType) => (
                                                <Badge key={tag.tagName} variant="secondary" className="px-3 py-1 text-gray-600 bg-gray-100 hover:bg-gray-200">
                                                    <Tag className="w-3 h-3 mr-1" /> {tag.tagName}
                                                </Badge>
                                            )) || <span className="text-sm text-gray-500">ไม่มี Tags</span>}
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="conditions" className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-orange-500" /> เงื่อนไขการเข้าร่วม
                                    </h3>
                                    {event.conditions && event.conditions.length > 0 ? (
                                        <ul className="space-y-3">
                                            {event.conditions.map((item: Condition, i: number) => (
                                                <li key={i} className="flex gap-3 text-gray-600">
                                                    <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                                                    <span>{item.conditionText}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                            <p className="text-gray-500">ไม่มีข้อมูลเงื่อนไขการเข้าร่วม</p>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="benefits" className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <Gift className="w-5 h-5 text-purple-500" /> สิทธิประโยชน์
                                    </h3>
                                    {event.benefits && event.benefits.length > 0 ? (
                                        <ul className="space-y-3">
                                            {event.benefits.map((item: Benefit, i: number) => (
                                                <li key={i} className="flex gap-3 text-gray-600">
                                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                                    <span>{item.benefitText}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                            <p className="text-gray-500">ไม่มีข้อมูลสิทธิประโยชน์ระบุไว้</p>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>

                    {/* Sidebar (Right) */}
                    <div className="space-y-6">
                        <Card className="border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 space-y-6">
                                <h3 className="font-semibold text-lg">ข้อมูลกิจกรรม</h3>

                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500">วันที่</div>
                                            <div className="font-medium text-gray-900">{event.date}</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500">เวลา</div>
                                            <div className="font-medium text-gray-900">{event.startTime} - {event.endTime}</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500">สถานที่</div>
                                            <div className="font-medium text-gray-900">{event.location}</div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                <Users className="w-4 h-4" /> ผู้เข้าร่วม
                                            </div>
                                            <span className="text-sm text-gray-500">{event.registrations?.length || 0}/{event.capacity} คน</span>
                                        </div>
                                        <Progress value={event.registrations?.length || 0} max={event.capacity} className="h-2" />
                                        <p className="text-xs text-gray-400 mt-2 text-right">เหลืออีก {event.capacity - (event.registrations?.length || 0)} ที่นั่ง</p>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-base font-semibold" onClick={() => setIsRegisterOpen(true)}>
                                        ลงทะเบียนเข้าร่วม
                                    </Button>
                                    <Button variant="outline" className="w-full border-gray-200 hover:bg-gray-50 text-gray-600">
                                        <Share2 className="w-4 h-4 mr-2" /> แชร์กิจกรรม
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Registration Modal */}
            <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>ลงทะเบียนเข้าร่วมกิจกรรม</DialogTitle>
                        <p className="text-gray-500 text-sm">กรุณากรอกข้อมูลเพื่อลงทะเบียนเข้าร่วมกิจกรรม</p>
                    </DialogHeader>

                    <form onSubmit={handleRegister} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">ชื่อ-นามสกุล <span className="text-red-500">*</span></Label>
                            <Input id="name" placeholder="กรอกชื่อ-นามสกุล" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="studentId">รหัสนักศึกษา <span className="text-red-500">*</span></Label>
                            <Input id="studentId" placeholder="กรอกรหัสนักศึกษา" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">อีเมล <span className="text-red-500">*</span></Label>
                            <Input id="email" type="email" placeholder="กรอกอีเมล" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">เบอร์โทรศัพท์ <span className="text-red-500">*</span></Label>
                            <Input id="phone" type="tel" placeholder="กรอกเบอร์โทรศัพท์" required />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)}>ยกเลิก</Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">ยืนยันการลงทะเบียน</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
