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
import { Logo } from "@/components/layout/logo"
import { activitiesAPI, Activity, Tag as TagType, Condition, Benefit, API_BASE_URL } from "@/lib/api"

export default function PublicEventDetailsPage() {
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

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString)
            return new Intl.DateTimeFormat('th-TH', {
                day: 'numeric', month: 'short', year: 'numeric'
            }).format(date)
        } catch {
            return dateString
        }
    }

    const handleRegisterClick = () => {
        // Redirect to auth with a message or simply router.push
        alert("กรุณาเข้าสู่ระบบก่อนทำการลงทะเบียน")
        router.push("/auth")
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <Spinner />
                <p className="text-slate-500 mt-4">กำลังโหลดรายละเอียดกิจกรรม...</p>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-[24px] shadow-sm border border-slate-100 max-w-md w-full text-center">
                    <div className="text-red-500 mb-4 text-5xl">⚠️</div>
                    <h2 className="text-xl font-bold mb-2">ไม่พบกิจกรรม</h2>
                    <p className="text-slate-600 mb-6">{error || "กิจกรรมนี้อาจถูกลบหรือไม่มีอยู่จริง"}</p>
                    <Button onClick={() => router.push('/events')} className="w-full rounded-xl">
                        กลับไปหน้าค้นหากิจกรรม
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans pb-12">
            {/* Public Navbar */}
            <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <div className="flex flex-col leading-tight">
                            <Logo className="text-2xl" />
                            <span className="text-sm text-gray-500 font-medium leading-tight">วิทยาลัยการคอมพิวเตอร์</span>
                        </div>

                        <div className="hidden md:flex items-center space-x-8">
                            <Link href="/" className="text-gray-600 font-medium hover:text-blue-600 transition-colors">หน้าหลัก</Link>
                            <Link href="/events" className="text-blue-600 font-bold border-b-2 border-blue-600 pb-1">กิจกรรมทั้งหมด</Link>
                            <Link href="/about" className="text-gray-600 font-medium hover:text-blue-600 transition-colors">เกี่ยวกับเรา</Link>

                            <Link href="/auth">
                                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-8 shadow-lg shadow-blue-500/30 font-bold">
                                    เข้าสู่ระบบ
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Back Button */}
                <div className="mb-6">
                    <Link href="/events" className="inline-flex items-center text-slate-500 hover:text-slate-900 font-medium transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
                        <ArrowLeft className="w-4 h-4 mr-2" /> กลับไปยังรายการกิจกรรม
                    </Link>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content (Left) */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Hero Image */}
                        <div className="aspect-video w-full bg-slate-900 rounded-[24px] overflow-hidden relative shadow-md">
                            {event.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={`${API_BASE_URL}${event.imageUrl}`} alt={event.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-white/50 bg-gradient-to-br from-slate-800 to-slate-900 text-lg font-medium">
                                    ไม่มีรูปภาพ
                                </div>
                            )}
                            <div className="absolute top-4 left-4 flex gap-2">
                                <Badge className="bg-white text-blue-700 hover:bg-white shadow-md text-xs font-bold px-3 py-1">{event.category}</Badge>
                                <Badge className={`shadow-md text-xs font-bold px-3 py-1 ${event.status === 'open' || !event.status ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-slate-500 text-white hover:bg-slate-600"}`}>
                                    {event.status === 'open' || !event.status ? 'เปิดรับสมัคร' : 'ปิดรับสมัคร'}
                                </Badge>
                            </div>
                        </div>

                        {/* Title & Info */}
                        <div className="bg-white p-8 rounded-[24px] shadow-sm border border-slate-100">
                            <h1 className="text-3xl font-black text-slate-900 mb-2">{event.name}</h1>
                            <div className="flex items-center text-slate-500 gap-2 mb-8 font-medium">
                                <Users className="w-5 h-5 text-slate-400" />
                                <span>จัดโดย {event.organizer?.name || 'ไม่ระบุผู้จัด'}</span>
                            </div>

                            {/* Tabs */}
                            <Tabs defaultValue="details" className="w-full">
                                <TabsList className="w-full justify-start bg-slate-50 p-1.5 rounded-xl mb-6">
                                    <TabsTrigger value="details" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-slate-600 data-[state=active]:text-blue-600">รายละเอียด</TabsTrigger>
                                    <TabsTrigger value="conditions" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-slate-600 data-[state=active]:text-blue-600">เงื่อนไข</TabsTrigger>
                                    <TabsTrigger value="benefits" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-slate-600 data-[state=active]:text-blue-600">สิทธิประโยชน์</TabsTrigger>
                                </TabsList>

                                <TabsContent value="details" className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
                                        <Info className="w-5 h-5 text-blue-500" /> เกี่ยวกับกิจกรรม
                                    </h3>
                                    <p className="text-slate-600 leading-relaxed whitespace-pre-line">{event.description}</p>

                                    <div className="mt-8 pt-6 border-t border-slate-200">
                                        <h4 className="text-sm font-bold mb-3 text-slate-900">ป้ายกำกับ (Tags)</h4>
                                        <div className="flex gap-2 flex-wrap">
                                            {event.tags?.map((tag: TagType) => (
                                                <Badge key={tag.tagName} variant="secondary" className="px-3 py-1 font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50">
                                                    <Tag className="w-3 h-3 mr-1" /> {tag.tagName}
                                                </Badge>
                                            )) || <span className="text-sm text-slate-500">ไม่มีป้ายกำกับ</span>}
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="conditions" className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
                                        <CheckCircle className="w-5 h-5 text-orange-500" /> เงื่อนไขการเข้าร่วม
                                    </h3>
                                    {event.conditions && event.conditions.length > 0 ? (
                                        <ul className="space-y-3">
                                            {event.conditions.map((item: Condition, i: number) => (
                                                <li key={i} className="flex gap-3 text-slate-600 font-medium">
                                                    <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                                                    <span>{item.conditionText}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="py-8 text-center bg-white rounded-xl border border-dashed border-slate-200">
                                            <p className="text-slate-500 font-medium">ไม่มีข้อมูลเงื่อนไขการเข้าร่วม</p>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="benefits" className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
                                        <Gift className="w-5 h-5 text-purple-500" /> สิทธิประโยชน์
                                    </h3>
                                    {event.benefits && event.benefits.length > 0 ? (
                                        <ul className="space-y-3">
                                            {event.benefits.map((item: Benefit, i: number) => (
                                                <li key={i} className="flex gap-3 text-slate-600 font-medium">
                                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                                    <span>{item.benefitText}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="py-8 text-center bg-white rounded-xl border border-dashed border-slate-200">
                                            <p className="text-slate-500 font-medium">ไม่มีข้อมูลสิทธิประโยชน์ระบุไว้</p>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>

                    {/* Sidebar (Right) */}
                    <div className="space-y-6">
                        <Card className="border-slate-100 shadow-xl shadow-slate-200/50 rounded-[24px] overflow-hidden sticky top-28">
                            <div className="p-8 space-y-8">
                                <h3 className="font-black text-xl text-slate-900 border-b border-slate-100 pb-4">ข้อมูลภาพรวม</h3>

                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0 shadow-sm border border-blue-100">
                                            <Calendar className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">วันที่จัดกิจกรรม</div>
                                            <div className="font-bold text-slate-900">{formatDate(event.date)}</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 flex-shrink-0 shadow-sm border border-orange-100">
                                            <Clock className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">เวลา</div>
                                            <div className="font-bold text-slate-900">{event.startTime} - {event.endTime}</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 flex-shrink-0 shadow-sm border border-rose-100">
                                            <MapPin className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">สถานที่</div>
                                            <div className="font-bold text-slate-900 leading-tight">{event.location}</div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-slate-100">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                                <Users className="w-4 h-4 text-emerald-500" /> จำนวนที่รับสมัคร
                                            </div>
                                            <span className="text-sm font-black text-slate-900">{event.registeredCount || 0}/{event.capacity} คน</span>
                                        </div>
                                        <Progress value={event.registeredCount || 0} max={event.capacity} className="h-2.5 bg-slate-100" />
                                        <p className="text-sm font-medium text-emerald-600 mt-3 text-center bg-emerald-50 py-1.5 rounded-lg border border-emerald-100">
                                            เหลืออีก {event.capacity - (event.registeredCount || 0)} ที่นั่งว่าง
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-slate-100 relative">
                                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
                                    <Button
                                        className="w-full bg-blue-600 hover:bg-blue-700 h-14 rounded-xl text-lg font-black shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-1"
                                        onClick={handleRegisterClick}
                                    >
                                        ลงทะเบียนกิจกรรม
                                    </Button>
                                    <Button variant="outline" className="w-full border-slate-200 hover:bg-slate-50 font-bold text-slate-600 rounded-xl h-12">
                                        <Share2 className="w-4 h-4 mr-2" /> แชร์กิจกรรม
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}

function Spinner() {
    return (
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
    )
}
