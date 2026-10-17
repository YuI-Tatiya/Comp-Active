"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Check, Plus, X, ArrowLeft, Loader2, Edit, CheckSquare, Star } from "lucide-react"
import { activitiesAPI, Activity, resolveUploadUrl } from "@/lib/api"
import { SOFT_SKILLS, softSkillLabel } from "@/lib/soft-skills"
import { CATEGORIES, categoryLabel } from "@/lib/categories"
import { toggleInArray } from "@/lib/utils"
import { DynamicQuestionBuilder, type BuilderQuestion } from "@/components/ui/dynamic-question-builder"

const SURVEY_TYPE_OPTIONS = [
    { value: "rating", label: "ให้คะแนน" },
    { value: "text", label: "คำตอบแบบข้อความ" },
]

// Types for form data
interface ActivityFormData {
    name: string
    description: string
    categories: string[]
    tags: string[]
    date: string
    startTime: string
    endTime: string
    location: string
    capacity: string // Changed to string for easier input handling
    conditions: string[]
    benefits: string[]
    softSkills: string[]
    imageFile: File | null
    surveyQuestions: BuilderQuestion[]
}

const initialData: ActivityFormData = {
    name: "",
    description: "",
    categories: [],
    tags: [],
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    capacity: "",
    conditions: [],
    benefits: [],
    softSkills: [],
    imageFile: null,
    surveyQuestions: [],
}

// เดิม hardcode รายชื่อหมวดเป็นค่าดิบภาษาอังกฤษไว้ที่นี่ ทำให้ dropdown โชว์ "Art & Culture"
// และหลุดจาก lib/categories.ts เวลาแก้ชื่อหมวด — ใช้ตัวกลางที่เดียวแทน
const suggestedTags = ["Programming", "Web Development", "AI", "Machine Learning", "Design", "UX", "UI", "Security", "Sports", "Music", "Volunteer", "Competition", "Workshop", "Seminar"]

export default function EditActivityPage() {
    const router = useRouter()
    const params = useParams()
    const id = String(params?.id ?? "")
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState<ActivityFormData>(initialData)
    const [loadingData, setLoadingData] = useState(true)

    // Temporary state for adding list items
    const [newCondition, setNewCondition] = useState("")
    const [newBenefit, setNewBenefit] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [imagePreview, setImagePreview] = useState<string | null>(null)

    useEffect(() => {
        if (!id) return;

        const fetchActivity = async () => {
            try {
                const data: Activity = await activitiesAPI.getById(id);
                setFormData({
                    name: data.name || "",
                    description: data.description || "",
                    categories: data.categories || [],
                    tags: data.tags ? data.tags.map((t: { tagName: string }) => t.tagName) : [],
                    date: data.date || "",
                    startTime: data.startTime || "",
                    endTime: data.endTime || "",
                    location: data.location || "",
                    capacity: data.capacity ? String(data.capacity) : "",
                    conditions: data.conditions ? data.conditions.map((c: { conditionText: string }) => c.conditionText) : [],
                    benefits: data.benefits ? data.benefits.map((b: { benefitText: string }) => b.benefitText) : [],
                    softSkills: data.softSkills ? data.softSkills.map((s: { skillType: string }) => s.skillType) : [],
                    imageFile: null,
                    surveyQuestions: data.surveyQuestions
                        ? data.surveyQuestions.map((q) => ({ label: q.label, type: q.type, scaleMax: q.scaleMax }))
                        : [],
                });
                if (data.imageUrl) {
                    setImagePreview(resolveUploadUrl(data.imageUrl));
                }
            } catch (err) {
                console.error("Failed to fetch activity", err);
                setError("โหลดข้อมูลกิจกรรมไม่สำเร็จ");
            } finally {
                setLoadingData(false);
            }
        };

        fetchActivity();
    }, [id]);

    const handleNext = () => setStep((prev) => Math.min(prev + 1, 5))
    const handleBack = () => step === 1 ? router.back() : setStep((prev) => Math.max(prev - 1, 1))

    const updateField = <K extends keyof ActivityFormData>(field: K, value: ActivityFormData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            updateField('imageFile', file)
            const reader = new FileReader()
            reader.onloadend = () => setImagePreview(reader.result as string)
            reader.readAsDataURL(file)
        }
    }

    const toggleTag = (tag: string) => {
        setFormData(prev => {
            const newTags = prev.tags.includes(tag)
                ? prev.tags.filter(t => t !== tag)
                : [...prev.tags, tag]
            return { ...prev, tags: newTags }
        })
    }

    const toggleSoftSkill = (skillValue: string) => {
        setFormData(prev => {
            const newSkills = prev.softSkills.includes(skillValue)
                ? prev.softSkills.filter(s => s !== skillValue)
                : [...prev.softSkills, skillValue]
            return { ...prev, softSkills: newSkills }
        })
    }

    const addListItem = (field: 'conditions' | 'benefits', value: string, setter: (val: string) => void) => {
        if (!value.trim()) return
        setFormData(prev => ({ ...prev, [field]: [...prev[field], value] }))
        setter("")
    }

    const removeListItem = (field: 'conditions' | 'benefits', index: number) => {
        setFormData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }))
    }

    // Stepper UI
    const steps = [
        { number: 1, title: "ข้อมูลพื้นฐาน", subtitle: "ชื่อและรายละเอียด" },
        { number: 2, title: "วันที่และสถานที่", subtitle: "เวลาและสถานที่จัดงาน" },
        { number: 3, title: "รายละเอียดเพิ่มเติม", subtitle: "เงื่อนไขและสิทธิประโยชน์" },
        { number: 4, title: "แบบสำรวจ", subtitle: "แบบสำรวจหลังกิจกรรม" },
        { number: 5, title: "ตรวจสอบและยืนยัน", subtitle: "ตรวจสอบข้อมูลก่อนบันทึก" },
    ]

    return (
        <div className="min-h-screen bg-surface p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center mb-8">
                    <Button variant="ghost" onClick={handleBack} className="mr-4">
                        <ArrowLeft className="w-4 h-4 mr-2" /> กลับ
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <div className="bg-brand-100 p-2 rounded-lg text-brand-600">
                                <Edit className="w-5 h-5" />
                            </div>
                            แก้ไขกิจกรรม
                        </h1>
                        <p className="text-fg-muted mt-1">อัปเดตข้อมูลกิจกรรมของคุณ</p>
                    </div>
                </div>

                {loadingData ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                    </div>
                ) : (
                    <>
                        {/* Stepper */}
                        <div className="mb-12 relative flex justify-between">
                            <div className="absolute top-5 left-0 w-full h-0.5 bg-surface-2 -z-10"></div>
                            <div
                                className="absolute top-5 left-0 h-0.5 bg-brand-600 -z-10 transition-all duration-300"
                                style={{ width: `${((step - 1) / 4) * 100}%` }}
                            ></div>

                            {steps.map((s) => (
                                <div key={s.number} className="flex flex-col items-center bg-surface px-4">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2 transition-colors duration-300 ${step >= s.number ? "bg-brand-600 text-white" : "bg-white border-2 border-border text-fg-subtle"
                                            }`}
                                    >
                                        {step > s.number ? <Check className="w-5 h-5" /> : s.number}
                                    </div>
                                    <div className={`text-sm font-medium ${step >= s.number ? "text-fg" : "text-fg-subtle"}`}>{s.title}</div>
                                    <div className="text-xs text-fg-muted hidden md:block">{s.subtitle}</div>
                                </div>
                            ))}
                        </div>

                        {/* Content Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-border p-8 min-h-[400px]">

                            {/* STEP 1: Basic Info */}
                            {step === 1 && (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label>ชื่อกิจกรรม <span className="text-danger">*</span></Label>
                                        <Input
                                            value={formData.name}
                                            onChange={(e) => updateField('name', e.target.value)}
                                            placeholder="เช่น Workshop: การพัฒนา Web Application"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>รูปภาพกิจกรรม (Poster)</Label>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                        />
                                        {imagePreview && (
                                            <div className="mt-2 w-full max-w-sm rounded-lg overflow-hidden border">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={imagePreview} alt="Preview" className="w-full h-auto" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>รายละเอียด <span className="text-danger">*</span></Label>
                                        <Textarea
                                            value={formData.description}
                                            onChange={(e) => updateField('description', e.target.value)}
                                            placeholder="อธิบายเกี่ยวกับกิจกรรมของคุณ..."
                                            className="min-h-[120px]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>หมวดหมู่ (เลือกได้มากกว่า 1) <span className="text-danger">*</span></Label>
                                        <div className="flex flex-wrap gap-2">
                                            {CATEGORIES.map(c => {
                                                const selected = formData.categories.includes(c.value)
                                                return (
                                                    <label
                                                        key={c.value}
                                                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${selected ? "border-brand-500 bg-brand-50 text-brand-700" : "border-border bg-white text-denim-ink hover:bg-surface"}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="size-4 rounded border-border-strong text-brand-600 focus:ring-brand-500"
                                                            checked={selected}
                                                            onChange={() => updateField('categories', toggleInArray(formData.categories, c.value))}
                                                        />
                                                        <span className={`size-2 rounded-full ${c.dot}`} aria-hidden="true" />
                                                        {c.label}
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>แท็ก</Label>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {formData.tags.map(tag => (
                                                <Badge key={tag} variant="secondary" className="px-3 py-1 flex items-center gap-1">
                                                    {tag}
                                                    <X className="w-3 h-3 cursor-pointer hover:text-danger" onClick={() => toggleTag(tag)} />
                                                </Badge>
                                            ))}
                                        </div>
                                        <div className="flex flex-wrap gap-2 border-t pt-3">
                                            {suggestedTags.map(tag => (
                                                <button
                                                    key={tag}
                                                    onClick={() => toggleTag(tag)}
                                                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${formData.tags.includes(tag)
                                                        ? "bg-brand-50 border-brand-200 text-brand-600"
                                                        : "bg-white border-border text-fg-muted hover:border-brand-300"
                                                        }`}
                                                >
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: Date & Location */}
                            {step === 2 && (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label>วันที่จัดกิจกรรม <span className="text-danger">*</span></Label>
                                        <Input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => updateField('date', e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>เวลาเริ่ม <span className="text-danger">*</span></Label>
                                            <Input
                                                type="time"
                                                value={formData.startTime}
                                                onChange={(e) => updateField('startTime', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>เวลาสิ้นสุด <span className="text-danger">*</span></Label>
                                            <Input
                                                type="time"
                                                value={formData.endTime}
                                                onChange={(e) => updateField('endTime', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>สถานที่ <span className="text-danger">*</span></Label>
                                        <Input
                                            value={formData.location}
                                            onChange={(e) => updateField('location', e.target.value)}
                                            placeholder="เช่น ห้องปฏิบัติการคอมพิวเตอร์ 301"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>จำนวนที่รับ (คน)</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={formData.capacity}
                                            onChange={(e) => updateField('capacity', e.target.value)}
                                            placeholder="เว้นว่าง = ไม่จำกัดจำนวน"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: Additional Details */}
                            {step === 3 && (
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <Label className="text-base">เงื่อนไขการเข้าร่วม</Label>
                                        <div className="space-y-2">
                                            {formData.conditions.map((item, i) => (
                                                <div key={i} className="flex items-center gap-2 bg-surface p-2 rounded-md">
                                                    <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                                                    <span className="flex-1 text-sm">{item}</span>
                                                    <Button variant="ghost" size="sm" onClick={() => removeListItem('conditions', i)}><X className="w-4 h-4 text-fg-subtle" /></Button>
                                                </div>
                                            ))}
                                            <div className="flex gap-2">
                                                <Input
                                                    value={newCondition}
                                                    onChange={(e) => setNewCondition(e.target.value)}
                                                    placeholder="กรอกเงื่อนไข"
                                                    onKeyDown={(e) => e.key === 'Enter' && addListItem('conditions', newCondition, setNewCondition)}
                                                />
                                                <Button variant="outline" onClick={() => addListItem('conditions', newCondition, setNewCondition)}><Plus className="w-4 h-4 mr-2" /> เพิ่ม</Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-base">สิทธิประโยชน์</Label>
                                        <div className="space-y-2">
                                            {formData.benefits.map((item, i) => (
                                                <div key={i} className="flex items-center gap-2 bg-surface p-2 rounded-md">
                                                    <Check className="w-4 h-4 text-green-500" />
                                                    <span className="flex-1 text-sm">{item}</span>
                                                    <Button variant="ghost" size="sm" onClick={() => removeListItem('benefits', i)}><X className="w-4 h-4 text-fg-subtle" /></Button>
                                                </div>
                                            ))}
                                            <div className="flex gap-2">
                                                <Input
                                                    value={newBenefit}
                                                    onChange={(e) => setNewBenefit(e.target.value)}
                                                    placeholder="กรอกสิทธิประโยชน์"
                                                    onKeyDown={(e) => e.key === 'Enter' && addListItem('benefits', newBenefit, setNewBenefit)}
                                                />
                                                <Button variant="outline" onClick={() => addListItem('benefits', newBenefit, setNewBenefit)}><Plus className="w-4 h-4 mr-2" /> เพิ่ม</Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-base">Soft Skills ที่จะได้รับจากกิจกรรมนี้ (ตัวเลือกประเมิน)</Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-surface p-4 rounded-lg border border-border">
                                            {SOFT_SKILLS.map(skill => (
                                                <div key={skill.value} className="flex items-center space-x-3">
                                                    <input
                                                        type="checkbox"
                                                        id={`skill-${skill.value}`}
                                                        checked={formData.softSkills.includes(skill.value)}
                                                        onChange={() => toggleSoftSkill(skill.value)}
                                                        className="w-5 h-5 text-brand-600 bg-white border-border-strong rounded focus:ring-brand-500 cursor-pointer"
                                                    />
                                                    <Label htmlFor={`skill-${skill.value}`} className="font-normal cursor-pointer text-sm">
                                                        {skill.labelEn}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-fg-muted">* ทักษะที่เลือกนี้จะถูกนำไปใช้เป็นเกณฑ์ในการประเมินนักศึกษาหลังจบกิจกรรม</p>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: Post-event survey */}
                            {step === 4 && (
                                <div className="space-y-6">
                                    <div>
                                        <Label className="text-base">แบบสำรวจความพึงพอใจ</Label>
                                        <p className="mt-1 text-sm text-fg-muted">
                                            นักศึกษาจะได้ตอบแบบสำรวจนี้หลังเช็คอินเข้าร่วมกิจกรรมแล้ว — เว้นว่างไว้ได้ถ้าไม่ต้องการเก็บแบบสำรวจ
                                        </p>
                                    </div>
                                    <DynamicQuestionBuilder
                                        questions={formData.surveyQuestions}
                                        onChange={(surveyQuestions) => updateField('surveyQuestions', surveyQuestions)}
                                        typeOptions={SURVEY_TYPE_OPTIONS}
                                        scaleTypes={["rating"]}
                                        addLabel="เพิ่มคำถามแบบสำรวจ"
                                        emptyLabel="ยังไม่มีคำถามแบบสำรวจ — นักศึกษาจะไม่เห็นแบบสำรวจสำหรับกิจกรรมนี้"
                                    />
                                </div>
                            )}

                            {/* STEP 5: Review */}
                            {step === 5 && (
                                <div className="space-y-6">
                                    <div className="text-center mb-6">
                                        <h3 className="text-xl font-semibold mb-2">ตรวจสอบข้อมูลกิจกรรม</h3>
                                        <p className="text-fg-muted">กรุณาตรวจสอบข้อมูลก่อนยืนยันการแก้ไขกิจกรรม</p>
                                    </div>

                                    {error && (
                                        <div className="bg-danger-bg border border-danger/20 text-danger px-4 py-3 rounded-lg text-sm text-center">
                                            {error}
                                        </div>
                                    )}

                                    <div className="bg-surface p-6 rounded-lg space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <Label className="text-fg-muted text-xs">ชื่อกิจกรรม</Label>
                                                <div className="font-medium">{formData.name || "-"}</div>
                                            </div>
                                            <div>
                                                <Label className="text-fg-muted text-xs">หมวดหมู่</Label>
                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                    {formData.categories.length > 0 ? formData.categories.map((c) => (
                                                        <Badge key={c} variant="secondary" className="px-2.5 py-0.5 font-normal">{categoryLabel(c)}</Badge>
                                                    )) : <span className="text-sm text-fg-muted">-</span>}
                                                </div>
                                            </div>
                                            <div className="col-span-2">
                                                <Label className="text-fg-muted text-xs">รายละเอียด</Label>
                                                <div className="text-sm text-denim-ink mt-1">{formData.description || "-"}</div>
                                            </div>
                                            <div>
                                                <Label className="text-fg-muted text-xs">วันที่</Label>
                                                <div className="font-medium">{formData.date || "-"}</div>
                                            </div>
                                            <div>
                                                <Label className="text-fg-muted text-xs">เวลา</Label>
                                                <div className="font-medium">{formData.startTime} - {formData.endTime}</div>
                                            </div>
                                            <div>
                                                <Label className="text-fg-muted text-xs">สถานที่</Label>
                                                <div className="font-medium">{formData.location || "-"}</div>
                                            </div>
                                            <div>
                                                <Label className="text-fg-muted text-xs">จำนวนที่รับ</Label>
                                                <div className="font-medium">{formData.capacity.trim() === "" ? "ไม่จำกัดจำนวน" : `${formData.capacity} คน`}</div>
                                            </div>

                                            {/* Additional fields that were missing */}
                                            {imagePreview && (
                                                <div className="col-span-1 md:col-span-2">
                                                    <Label className="text-fg-muted text-xs">รูปภาพกิจกรรม (Poster)</Label>
                                                    <div className="mt-2 w-full max-w-xs rounded-lg overflow-hidden border">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={imagePreview} alt="Preview" className="w-full h-auto" />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="col-span-1 md:col-span-2">
                                                <Label className="text-fg-muted text-xs">แท็ก</Label>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {formData.tags?.length > 0 ? formData.tags.map(tag => (
                                                        <Badge key={tag} variant="secondary" className="px-3 py-1 font-normal">{tag}</Badge>
                                                    )) : <span className="text-sm text-fg-muted">-</span>}
                                                </div>
                                            </div>

                                            <div className="col-span-1 md:col-span-2">
                                                <Label className="text-fg-muted text-xs">เงื่อนไขการเข้าร่วม</Label>
                                                {formData.conditions?.length > 0 ? (
                                                    <ul className="list-decimal pl-5 text-sm text-denim-ink mt-1 space-y-1">
                                                        {formData.conditions.map((item, i) => <li key={i}>{item}</li>)}
                                                    </ul>
                                                ) : <div className="text-sm text-fg-muted mt-1">-</div>}
                                            </div>

                                            <div className="col-span-1 md:col-span-2">
                                                <Label className="text-fg-muted text-xs">สิทธิประโยชน์</Label>
                                                {formData.benefits?.length > 0 ? (
                                                    <ul className="list-disc pl-5 text-sm text-denim-ink mt-1 space-y-1">
                                                        {formData.benefits.map((item, i) => <li key={i}>{item}</li>)}
                                                    </ul>
                                                ) : <div className="text-sm text-fg-muted mt-1">-</div>}
                                            </div>

                                            <div className="col-span-1 md:col-span-2">
                                                <Label className="text-fg-muted text-xs">Soft Skills ที่ประเมิน</Label>
                                                {formData.softSkills?.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {formData.softSkills.map((skill, i) => (
                                                            <Badge key={i} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                                                <CheckSquare className="w-3 h-3 mr-1" /> {softSkillLabel(skill)}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                ) : <div className="text-sm text-fg-muted mt-1">ไม่ได้ระบุ</div>}
                                            </div>

                                            <div className="col-span-1 md:col-span-2">
                                                <Label className="text-fg-muted text-xs">แบบสำรวจหลังกิจกรรม</Label>
                                                {formData.surveyQuestions.length > 0 ? (
                                                    <ul className="mt-2 space-y-1.5 text-sm text-denim-ink">
                                                        {formData.surveyQuestions.map((q, i) => (
                                                            <li key={i} className="flex items-center gap-1.5">
                                                                {q.type === "rating" ? (
                                                                    <Star className="w-3.5 h-3.5 text-amber-500" />
                                                                ) : (
                                                                    <Edit className="w-3.5 h-3.5 text-brand-500" />
                                                                )}
                                                                {q.label || `คำถามข้อที่ ${i + 1}`}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : <div className="text-sm text-fg-muted mt-1">ไม่ได้เก็บแบบสำรวจ</div>}
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Footer Actions */}
                        <div className="flex justify-between mt-8">
                            <Button variant="outline" onClick={handleBack}>
                                {step === 1 ? 'ย้อนกลับ' : 'ก่อนหน้า'}
                            </Button>

                            <Button
                                onClick={step === 5 ? async () => {
                                    setSubmitting(true)
                                    setError("")
                                    try {
                                        let imageUrl = undefined;
                                        if (formData.imageFile) {
                                            const uploadRes = await activitiesAPI.uploadImage(formData.imageFile);
                                            if (uploadRes && uploadRes.imageUrl) {
                                                imageUrl = uploadRes.imageUrl;
                                            }
                                        }

                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        const updateData: any = {
                                            name: formData.name,
                                            description: formData.description,
                                            categories: formData.categories,
                                            date: formData.date,
                                            startTime: formData.startTime,
                                            endTime: formData.endTime,
                                            location: formData.location,
                                            // ช่องว่าง = ไม่จำกัดจำนวน ต้องส่ง null ตรงๆ ห้ามปัดเป็น 0 (0 = ปิดรับสมัครทันที)
                                            capacity: formData.capacity.trim() === "" ? null : parseInt(formData.capacity),
                                            tags: formData.tags,
                                            conditions: formData.conditions,
                                            benefits: formData.benefits,
                                            softSkills: formData.softSkills,
                                            surveyQuestions: formData.surveyQuestions.map((q) => ({
                                                label: q.label,
                                                type: q.type,
                                                scaleMax: q.scaleMax,
                                            })),
                                        }

                                        if (imageUrl) {
                                            updateData.imageUrl = imageUrl;
                                        }

                                        await activitiesAPI.update(id, updateData)
                                        router.push('/organizer/manage')
                                    } catch (err: unknown) {
                                        const e = err as Error;
                                        setError(e.message || 'แก้ไขกิจกรรมไม่สำเร็จ')
                                    } finally {
                                        setSubmitting(false)
                                    }
                                } : handleNext}
                                className="bg-brand-600 hover:bg-brand-700 w-32"
                                disabled={submitting}
                            >
                                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />กำลังบันทึก...</> : step === 5 ? 'บันทึก' : 'ถัดไป'}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
