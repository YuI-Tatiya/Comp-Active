// lib/api.ts — API Client สำหรับเชื่อมกับ Backend (NestJS)

import { ApiError, classifyApiError, SESSION_CHECK_EVENT } from './api-error';
export { ApiError } from './api-error';
import { resolveApiBaseUrl } from './api-base';

// "same-origin" → '' = ยิง path สัมพัทธ์ (/api/..., /uploads/...) ไปที่โดเมนของหน้าเว็บเอง ดู lib/api-base.ts
export const API_BASE_URL = resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

// ==================== TYPES ====================

export interface User {
  id: number;
  name: string;
  email: string;
  role: "student" | "organizer" | "admin";
  studentId?: string;
  username?: string | null;
  validUntil?: string | null;
  isBlocked?: boolean;
  createdAt?: string;
  // ข้อมูลติดต่อ & การศึกษา — เป็น null สำหรับ user ที่สมัครก่อนมีฟีเจอร์นี้
  phone?: string | null;
  educationLevel?: string | null;
  program?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user?: User;
}

export interface Tag {
  tagName: string;
}

export interface Condition {
  conditionText: string;
}

export interface Benefit {
  benefitText: string;
}

export interface ActivityQuestionOption {
  id: number;
  label: string;
}

export interface ActivityQuestion {
  id: number;
  label: string;
  type: "text" | "single_choice" | "multi_choice";
  required: boolean;
  options: ActivityQuestionOption[];
}

export interface Activity<T = unknown> {
  id: number;
  eventId?: number | null;
  name: string;
  /** เลือกได้มากกว่า 1 หมวดหมู่ */
  categories: string[];
  description: string;
  imageUrl?: string | null;
  attachmentUrl?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  // ISO datetime — เพิ่มมาแทน date+startTime/endTime สำหรับกิจกรรมที่สร้างผ่าน event wizard
  // กิจกรรมเก่า (สร้างก่อนมี event) จะเป็น null เพราะฟิลด์เดิมยังคงใช้งานได้ปกติ
  startAt?: string | null;
  endAt?: string | null;
  /**
   * วันที่ผู้จัดสร้าง/ประกาศกิจกรรม — คนละอย่างกับ date ที่เป็นวันจัดงาน
   * ใช้เรียงลำดับ "วันที่ประกาศ" (เดิมหน้ารายการเอา date มาใช้แทนจึงเรียงผิดความหมาย)
   */
  createdAt?: string | null;
  location: string;
  registeredCount: number;
  // null = ไม่จำกัดจำนวน
  capacity: number | null;
  // Prisma Decimal ส่งมาเป็น string เสมอ ไม่ใช่ number
  volunteerHours?: string | null;
  volunteerRole?: string | null;
  // ประเภทการรับสมัคร — ฟิลด์ config ด้านล่างมีความหมายเฉพาะเมื่อ registrationType ตรงกับประเภทนั้น
  registrationType?: "participant" | "staff_volunteer" | "contestant";
  dutyRoleOptions?: string[];
  dutyShiftOptions?: string[];
  teamSizeMin?: number | null;
  teamSizeMax?: number | null;
  competitionCategoryOptions?: string[];
  approvalStatus: string;
  status: string;
  /** เหตุผลที่ผู้จัดยกเลิกกิจกรรม — แสดงให้นักศึกษาเห็นเมื่อกิจกรรมถูกยกเลิก */
  cancellationReason?: string | null;
  /** เปิดโหมดประเมินรอบด้าน (นักศึกษาประเมินตนเอง + เพื่อน) — เฉพาะกิจกรรม Tier 3 */
  peerAssessmentEnabled?: boolean;
  tags: Tag[];
  conditions: Condition[];
  benefits: Benefit[];
  softSkills?: { skillType: string; rate?: number }[];
  questions?: ActivityQuestion[];
  /** แบบสำรวจหลังกิจกรรม — เฉพาะกิจกรรมเดี่ยวที่ไม่ได้อยู่ในงานไหน (eventId เป็น null) */
  surveyQuestions?: EventSurveyQuestion[];
  organizer?: User;
  registrations?: T[];
}

/** true ถ้ากิจกรรมไม่จำกัดจำนวนผู้เข้าร่วม */
export function isUnlimitedCapacity(capacity: number | null | undefined): boolean {
  return capacity == null;
}

/**
 * true ถ้าผู้จัดยกเลิกกิจกรรมนี้เอง (ApprovalStatus.CANCELLED)
 *
 * รองรับค่าเก่า "rejected" ไว้ด้วยเผื่อข้อมูลก่อนเปลี่ยน enum — backend เขียนค่าใหม่
 * เป็น "cancelled" เสมอตั้งแต่นี้ไป (แยกจาก "rejected" ที่สงวนไว้สำหรับแอดมิน/ระบบ
 * ปฏิเสธ ซึ่งยังไม่มี flow จริงในระบบตอนนี้)
 */
export function isCancelledByOrganizer(approvalStatus: string | null | undefined): boolean {
  return approvalStatus === 'cancelled' || approvalStatus === 'rejected';
}

/** ข้อความแสดงจำนวนที่รับ — ใช้ที่เดียวกันทุกหน้าแทนการเขียน `capacity || 0` กระจัดกระจาย */
export function capacityLabel(capacity: number | null | undefined): string {
  return isUnlimitedCapacity(capacity) ? 'ไม่จำกัดจำนวน' : `${capacity} คน`;
}

/**
 * true ถ้ายังนับเป็น "ลงทะเบียนอยู่ที่ยกเลิกได้" — ใช้จุดเดียวกันทุกหน้า (my-registrations,
 * activities/[id], events/[id]) กันไม่ให้เกณฑ์หลุดจากกันอีก (เคยเกิดบั๊กที่ my-registrations
 * ตัด status "confirmed" ออกไปด้วยทั้งที่ backend อนุญาตให้ยกเลิก confirmed ได้ปกติ — ทำให้
 * หน้านี้กับหน้ารายละเอียดกิจกรรมแสดงปุ่มยกเลิกไม่ตรงกันสำหรับ registration เดียวกัน)
 *
 * เกณฑ์: ยังไม่ถูกยกเลิก และยังไม่ถูกประเมินผล (มี evaluation แปลว่าเช็คอินและกิจกรรมเสร็จสิ้นไปแล้ว
 * ซึ่ง backend ผูก evaluation ไว้กับ attendance เสมอ จึงใช้แทนการเช็ค attendance ได้ตรงๆ)
 */
export function isActiveRegistration(r: { status: string; evaluation?: unknown }): boolean {
  return r.status !== 'cancelled' && !r.evaluation;
}

export interface PlatformStats {
  totalActivities: number;
  totalParticipants: number;
}

export interface OrganizerStats {
  totalActivities: number;
  activeActivities: number;
  totalRegistrations: number;
  // นักศึกษาที่มีบัญชีในระบบทั้งหมด ไม่รวมบัญชีที่ถูกระงับ (ไม่ได้ผูกกับผู้จัดคนใดคนหนึ่ง)
  totalStudents: number;
  // คำขอลงทะเบียนของนักศึกษาที่รอผู้จัดยืนยัน (ไม่ใช่สถานะอนุมัติกิจกรรมโดยแอดมิน)
  pendingRegistrations: number;
  pendingApprovals?: number;
}

/**
 * Helper function สำหรับเรียก API
 */
async function fetchAPI<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    // token อยู่ใน httpOnly cookie ที่ backend ออกให้ตอน login — JavaScript อ่านไม่ได้
    // (นั่นคือจุดประสงค์: XSS ขโมยไปใช้ต่อไม่ได้) เบราว์เซอร์แนบให้เองเมื่อระบุ include
    credentials: 'include',
  });

  // หน้า error ของ nginx (502/504/429) เป็น HTML ไม่ใช่ JSON — อย่าให้ res.json() ล้มจนเสียรหัสสถานะไป
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const raw = Array.isArray(data.message) ? data.message[0] : data.message;
    const { message, sessionCheck } = classifyApiError(res.status, typeof raw === 'string' ? raw : '');
    // 401/403 จาก guard = บัญชีใน cookie ไม่ตรงกับที่หน้าเว็บจำไว้ (session หมด/สลับบัญชีในแท็บอื่น)
    // ให้ AuthProvider ถาม backend ใหม่ — ยกเว้นตัว profile เองที่ AuthProvider เป็นคนเรียก (กันวนซ้ำ)
    if (sessionCheck && endpoint !== '/api/auth/profile' && typeof window !== 'undefined') {
      window.dispatchEvent(new Event(SESSION_CHECK_EVENT));
    }
    throw new ApiError(message, res.status);
  }

  // backend ห่อ response ด้วย TransformInterceptor เป็น { success, data, timestamp } เสมอ (ดู main.ts) —
  // เช็คว่าคีย์ "data" มีอยู่จริง ไม่ใช่แค่ truthy เพราะ endpoint ที่ data เป็น null โดยตั้งใจ (เช่น "ยังไม่มีฉบับร่าง")
  // เคยโดน (data.data ?? data) ตีความว่า null = ไม่มีคีย์ แล้วคืนทั้ง envelope แทนค่า null ที่ตั้งใจส่งมาจริงๆ
  return ('data' in data ? data.data : data) as T;
}

// ==================== AUTH ====================

export const authAPI = {
  register: (body: {
    name: string;
    email: string;
    password: string;
    studentId?: string;
    phone: string;
    educationLevel: string;
    program: string;
  }) => fetchAPI<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  // identifier: email (student) or username (organizer)
  login: (body: { identifier: string; password: string }) =>
    fetchAPI<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  adminLogin: (body: { email: string; password: string }) =>
    fetchAPI<AuthResponse>('/api/auth/admin/login', { method: 'POST', body: JSON.stringify(body) }),

  getAdminInvite: (token: string) =>
    fetchAPI<{ email: string; expiresAt: string }>(`/api/auth/admin/invite/${encodeURIComponent(token)}`),

  acceptAdminInvite: (token: string, password: string) =>
    fetchAPI<{ message: string }>('/api/auth/admin/invite/accept', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),

  getProfile: () => fetchAPI<User>('/api/auth/profile'),

  // ต้องเรียกฝั่งเซิร์ฟเวอร์ เพราะ httpOnly cookie ลบจาก JavaScript ไม่ได้
  logout: () => fetchAPI<{ message: string }>('/api/auth/logout', { method: 'POST' }),
};

// ==================== USERS ====================

export const usersAPI = {
  getMe: () => fetchAPI<User>('/api/users/me'),
  // ⚠️ ต้องตรงกับ backend/src/modules/shared/users/dto/update-user.dto.ts
  //    ห้ามเติม email — backend ไม่รับ และ forbidNonWhitelisted จะตีกลับเป็น 400
  updateMe: (body: {
    name?: string;
    username?: string;
    studentId?: string;
    phone?: string;
    educationLevel?: string;
    program?: string;
    newPassword?: string;
    currentPassword?: string;
  }) =>
    fetchAPI<User>('/api/users/me', { method: 'PATCH', body: JSON.stringify(body) }),
  getAll: () => fetchAPI<User[]>('/api/users'),
  changeRole: (id: number, role: string) =>
    fetchAPI(`/api/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  blockUser: (id: number) => fetchAPI(`/api/users/${id}/block`, { method: 'PATCH' }),
  unblockUser: (id: number) => fetchAPI(`/api/users/${id}/unblock`, { method: 'PATCH' }),
  generatePassword: (email: string) =>
    fetchAPI<{ name: string; email: string; generatedPassword: string }>(
      '/api/users/generate-password',
      { method: 'POST', body: JSON.stringify({ email }) },
    ),
  extendValidity: (id: number, validDays: number) =>
    fetchAPI<User>(`/api/users/${id}/extend`, { method: 'PATCH', body: JSON.stringify({ validDays }) }),
  deleteUser: (id: number) => fetchAPI(`/api/users/${id}`, { method: 'DELETE' }),
};

// ==================== ACTIVITIES ====================

export const activitiesAPI = {
  getAll: (params?: { search?: string; category?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchAPI<Activity[]>(`/api/activities${query ? `?${query}` : ''}`);
  },
  getById: (id: number) => fetchAPI<Activity>(`/api/activities/${id}`),
  /** เจ้าของกิจกรรม/admin เท่านั้น — ต่างจาก getById (public) ตรงที่มีรายชื่อผู้ลงทะเบียนพร้อมคำตอบตอนลงทะเบียนแนบมาด้วย */
  getByIdForOrganizer: (id: number) => fetchAPI<Activity>(`/api/activities/my/${id}`),
  create: (body: unknown) => fetchAPI<Activity>('/api/activities', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: unknown) =>
    fetchAPI<Activity>(`/api/activities/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: number) => fetchAPI<void>(`/api/activities/${id}`, { method: 'DELETE' }),
  getMy: () => fetchAPI<Activity[]>('/api/activities/my'),
  requestCancel: (id: number, reason: string) =>
    fetchAPI<void>(`/api/activities/${id}/request-cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  /** จบกิจกรรม — ทำได้เฉพาะเมื่อเลยเวลาสิ้นสุดแล้ว (backend บังคับ) */
  markCompleted: (id: number) =>
    fetchAPI<Activity>(`/api/activities/${id}/complete`, { method: 'PATCH' }),
  /** คัดลอกกิจกรรมทั้งใบเป็นกิจกรรมใหม่ (ชื่อต่อท้ายด้วย "(สำเนา)") — ไม่คัดลอกผู้ลงทะเบียน */
  duplicate: (id: number) => fetchAPI<Activity>(`/api/activities/${id}/duplicate`, { method: 'POST' }),
  /** เปิด/ปิดรับสมัครชั่วคราว — ย้อนกลับได้ คนละอย่างกับ markCompleted/requestCancel ที่เป็นถาวร */
  setStatus: (id: number, status: 'open' | 'closed') =>
    fetchAPI<Activity>(`/api/activities/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getPlatformStats: () => fetchAPI<PlatformStats>('/api/activities/stats/platform'),
  getOrganizerStats: () => fetchAPI<OrganizerStats>('/api/activities/stats/organizer'),
  /** ผลสรุปแบบสำรวจของกิจกรรมเดี่ยว — โครงสร้างตรงกับ eventsAPI.getSurveyResults */
  getSurveyResults: (id: number) => fetchAPI<EventSurveyResultsResponse>(`/api/activities/${id}/survey-results`),
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch(`${API_BASE_URL}/api/activities/upload-image`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data.data ?? data;
  },
};

// ==================== EVENTS ====================
// "Event" (งาน) มี Activity ย่อยได้หลายรายการ — สร้างผ่าน wizard ใหม่ที่ /organizer/create
// กิจกรรมเดี่ยวแบบเดิม (ไม่มี event) ยังใช้ activitiesAPI.create() ได้ตามปกติ ไม่กระทบกัน

export interface SoftSkillRateBody {
  skillType: string;
  rate: number;
}

export interface QuestionBody {
  label: string;
  type: "text" | "single_choice" | "multi_choice";
  required?: boolean;
  // ใช้เมื่อ type เป็น single_choice หรือ multi_choice เท่านั้น
  options?: string[];
}

export interface SurveyQuestionBody {
  label: string;
  type: "rating" | "text";
  // ใช้เมื่อ type เป็น rating เท่านั้น — ค่าเริ่มต้น 5
  scaleMax?: number;
}

export interface CreateEventActivityBody {
  name: string;
  description: string;
  categories: string[];
  imageUrl?: string;
  attachmentUrl?: string;
  // ISO datetime string (เช่นจาก <input type="datetime-local"> + new Date(...).toISOString())
  startAt: string;
  endAt: string;
  location: string;
  // ไม่ระบุ = ไม่จำกัดจำนวน
  capacity?: number;
  issueVolunteerCertificate?: boolean;
  volunteerRole?: string;
  softSkillRates?: SoftSkillRateBody[];
  questions?: QuestionBody[];
  registrationType?: "participant" | "staff_volunteer" | "contestant";
  dutyRoleOptions?: string[];
  dutyShiftOptions?: string[];
  teamSizeMin?: number | null;
  teamSizeMax?: number | null;
  competitionCategoryOptions?: string[];
}

export interface CreateEventBody {
  name: string;
  description: string;
  imageUrl?: string;
  isPublic?: boolean;
  registrationOpenAt?: string;
  registrationCloseAt?: string;
  activities: CreateEventActivityBody[];
  surveyQuestions?: SurveyQuestionBody[];
  // restricted = เห็นเฉพาะนักศึกษาที่ตรงเงื่อนไขด้านล่าง — ค่าเริ่มต้น everyone
  visibility?: "everyone" | "restricted";
  // ใช้เมื่อ visibility เป็น restricted เท่านั้น — ว่าง = ทุกสาขา/ทุกชั้นปี
  visibilityPrograms?: string[];
  visibilityYears?: number[];
  visibilityStudentIdFilter?: string;
}

export interface EventSurveyQuestion {
  id: number;
  label: string;
  type: "rating" | "text";
  scaleMax: number;
}

export interface SurveyResult {
  questionId: number;
  label: string;
  type: "rating" | "text";
  responseCount: number;
  // เฉพาะ type "rating"
  scaleMax?: number;
  average?: number;
  // จำนวนคนที่ให้แต่ละคะแนน คีย์คือคะแนน 1..scaleMax (string เพราะมาจาก JSON key) — เฉพาะ type "rating"
  distribution?: Record<string, number>;
  // เฉพาะ type "text"
  responses?: string[];
}

/** คำตอบแบบสำรวจของนักศึกษาคนหนึ่ง ต่อคำถามหนึ่งข้อ */
export interface SurveyAnswerValue {
  ratingValue: number | null;
  textValue: string | null;
}

/** แถวเดียวต่อผู้ตอบแบบสำรวจ 1 คน — รวมคำตอบทุกข้อของ registration นั้นไว้ด้วยกัน */
export interface SurveyRespondent {
  registrationId: number;
  student: { id: number; name: string; studentId: string | null };
  activityId: number;
  activityName: string;
  // คีย์คือ questionId (string เพราะมาจาก JSON key)
  answers: Record<string, SurveyAnswerValue>;
}

export interface EventSurveyResultsResponse {
  questions: SurveyResult[];
  respondents: SurveyRespondent[];
}

export interface EventSummary {
  id: number;
  organizerId: number;
  name: string;
  description: string;
  imageUrl?: string | null;
  isPublic: boolean;
  registrationOpenAt?: string | null;
  registrationCloseAt?: string | null;
  visibility: string;
  visibilityStudentIdFilter?: string | null;
  visibilityProgram?: { programCode: string }[];
  visibilityYears?: { year: number }[];
  createdAt: string;
  activities: Activity[];
  surveyQuestions?: EventSurveyQuestion[];
}

/** payload เป็น EventDraftPayload จาก lib/event-draft.ts — backend เก็บเป็น JSON ล้วนๆ ไม่ตรวจรูปร่าง */
export interface EventDraftResponse {
  payload: unknown;
  updatedAt: string;
}

export const eventsAPI = {
  create: (body: CreateEventBody) =>
    fetchAPI<EventSummary>('/api/events', { method: 'POST', body: JSON.stringify(body) }),
  getMy: () => fetchAPI<EventSummary[]>('/api/events/my'),
  getById: (id: number) => fetchAPI<EventSummary>(`/api/events/${id}`),
  update: (id: number, body: Partial<CreateEventBody> & { activities: (CreateEventActivityBody & { id?: number })[] }) =>
    fetchAPI<EventSummary>(`/api/events/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  setPublic: (id: number, isPublic: boolean) =>
    fetchAPI<{ id: number; isPublic: boolean }>(`/api/events/${id}/publish`, {
      method: 'PATCH',
      body: JSON.stringify({ isPublic }),
    }),
  delete: (id: number) => fetchAPI<void>(`/api/events/${id}`, { method: 'DELETE' }),
  /** คัดลอกงานทั้งงานพร้อมกิจกรรมย่อยเป็นงานใหม่ (ชื่อต่อท้ายด้วย "(สำเนา)", ไม่เผยแพร่อัตโนมัติ) — ไม่คัดลอกผู้ลงทะเบียน */
  duplicate: (id: number) => fetchAPI<EventSummary>(`/api/events/${id}/duplicate`, { method: 'POST' }),
  /** เปิด/ปิดรับสมัครกิจกรรมย่อยทั้งหมดในงานนี้พร้อมกันชั่วคราว — ย้อนกลับได้ คนละอย่างกับ setPublic */
  setActivitiesStatus: (id: number, status: 'open' | 'closed') =>
    fetchAPI<{ count: number }>(`/api/events/${id}/activities-status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  // ฉบับร่างของตัวช่วยสร้างงาน — คนละอย่างกับ Event จริง มีได้ทีละ 1 ฉบับต่อผู้จัด (บันทึกซ้ำ = ทับของเดิม)
  getDraft: () => fetchAPI<EventDraftResponse | null>('/api/events/draft'),
  saveDraft: (payload: unknown) =>
    fetchAPI<EventDraftResponse>('/api/events/draft', { method: 'PUT', body: JSON.stringify({ payload }) }),
  clearDraft: () => fetchAPI<void>('/api/events/draft', { method: 'DELETE' }),
  getAllPublic: () => fetchAPI<EventSummary[]>('/api/events'),
  getPublicById: (id: number) => fetchAPI<EventSummary>(`/api/events/${id}/public`),
  getSurveyResults: (id: number) => fetchAPI<EventSurveyResultsResponse>(`/api/events/${id}/survey-results`),
  uploadAttachment: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/api/events/upload-attachment`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data.data ?? data as { message: string; attachmentUrl: string };
  },
};

// ==================== REGISTRATIONS ====================

export interface RegistrationAnswerBody {
  questionId: number;
  textValue?: string;
  optionIds?: number[];
}

export interface SurveyAnswerBody {
  questionId: number;
  ratingValue?: number;
  textValue?: string;
}

export interface CertRequestBody {
  wantsCertLoanFund?: boolean;
  wantsCertScholarship?: boolean;
}

export interface RegistrationTypeFieldsBody {
  dutyRole?: string;
  dutyShift?: string;
  teamName?: string;
  teamSize?: number;
  competitionCategory?: string;
  submissionLink?: string;
}

export interface CheckInSelfResult {
  id: number;
  status: string;
  attendance: string;
  checkInTime: string | null;
  alreadyCheckedIn: boolean;
}

export const registrationsAPI = {
  create: (
    activityId: number,
    answers?: RegistrationAnswerBody[],
    certRequest?: CertRequestBody,
    registrationTypeFields?: RegistrationTypeFieldsBody,
  ) =>
    fetchAPI('/api/registrations', {
      method: 'POST',
      body: JSON.stringify({ activityId, answers, ...certRequest, ...registrationTypeFields }),
    }),
  cancel: (id: number) => fetchAPI(`/api/registrations/${id}`, { method: 'DELETE' }),
  getMy: () => fetchAPI('/api/registrations/my'),
  getByActivity: (activityId: number) => fetchAPI(`/api/registrations/activity/${activityId}`),
  confirm: (id: number) => fetchAPI(`/api/registrations/${id}/confirm`, { method: 'PATCH' }),
  checkIn: (id: number) => fetchAPI(`/api/registrations/${id}/check-in`, { method: 'PATCH' }),
  /** เช็คอินด้วยตัวเอง — นักศึกษาสแกน QR code ที่ organizer แสดงหน้างาน (ต้อง login เป็น student อยู่แล้ว) */
  checkInSelf: (activityId: number) =>
    fetchAPI<CheckInSelfResult>('/api/registrations/check-in-self', {
      method: 'PATCH',
      body: JSON.stringify({ activityId }),
    }),
  getSurveyQuestions: (id: number) => fetchAPI<EventSurveyQuestion[]>(`/api/registrations/${id}/survey-questions`),
  submitSurvey: (id: number, answers: SurveyAnswerBody[]) =>
    fetchAPI<{ message: string }>(`/api/registrations/${id}/survey`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),
};

// ==================== EVALUATIONS ====================
// คะแนน Soft Skills มาจากระบบอัตโนมัติตอนเช็คอินเท่านั้น (จาก ActivitySoftSkill.rate ของกิจกรรม)
// ไม่มี endpoint สร้างคะแนนแบบ manual ฝั่ง organizer แล้ว — สเกล 0-5 ต่อทักษะ

export interface SkillScores {
  communication: number;
  timeManagement: number;
  flexibilityAdaptability: number;
  teamworkCollaboration: number;
  analyticCriticalThinking: number;
  decisionMaking: number;
  creativity: number;
  complexProblemSolving: number;
  curiosityLifelongLearning: number;
  negotiationPersuasion: number;
  leadership: number;
  positiveAttitude: number;
}

export interface SkillsData {
  count: number;
  // ผลรวมคะแนน Soft Skills ดิบ (ไม่ผ่านการคูณ scale สำหรับระบบเลเวล) — ใช้แสดง "คะแนนสะสม"
  totalScore: number;
  points: number;
  level: number;
  // อันดับเทียบกับนักศึกษาทั้งระบบ เรียงจากคะแนน Soft Skills รวมสูงสุด — คะแนนสูงสุด = อันดับ 1
  rank: number;
  totalStudents: number;
  average: SkillScores;
  badges: { name: string; icon: string; description: string }[];
  history: {
    id: number;
    activityName: string;
    date: string;
    scores: SkillScores;
  }[];
}

// ── Batch Evaluation (ประเมินรายฝ่าย — กิจกรรม Tier 3) ───────────────────────

export interface EvaluationBatchMember {
  registrationId: number;
  name: string;
  studentId: string | null;
  /** ระดับที่บันทึกอยู่ใน Evaluation ตอนนี้ ต่อทักษะ */
  current: Record<string, number>;
  /** เฉพาะทักษะที่เป็นข้อยกเว้นของคนนี้ พร้อมเหตุผล */
  exceptions: Record<string, { score: number; reason: string }>;
}

export interface EvaluationBatchGroup {
  dutyRole: string;
  /** คะแนนฐานของฝ่ายต่อทักษะ (ถ้ายังไม่เคยตั้งจะเป็นค่าเริ่มต้นของกิจกรรม ซึ่งอาจไม่ใช่ 1/2/3) */
  baseline: Record<string, number>;
  members: EvaluationBatchMember[];
}

export interface EvaluationBatch {
  /** false = กิจกรรมนี้ให้คะแนนอัตโนมัติตอนเช็คอิน ไม่ใช้หน้านี้ (server เป็นผู้ตัดสิน) */
  eligible: boolean;
  reason?: string;
  cap: 1 | 2 | 3;
  skills: string[];
  defaults: Record<string, number>;
  groups: EvaluationBatchGroup[];
  /** ผู้ที่เช็คอินแล้วแต่ไม่ระบุฝ่าย — หน้านี้แก้ให้ไม่ได้ ยังคงใช้ค่าเริ่มต้นของกิจกรรม */
  withoutDutyRole: number;
  /** จำนวนคนที่ผู้จัดอนุมัติผลรอบด้านแล้ว — ค่าของคนเหล่านี้ถูกล็อก การบันทึกที่นี่ไม่ทับ */
  approvedCount: number;
}

export interface SaveEvaluationBatchBody {
  groups: { dutyRole: string; scores: { skillType: string; score: number }[] }[];
  exceptions: { registrationId: number; scores: { skillType: string; score: number }[]; reason: string }[];
}

// ── ประเมินรอบด้าน 360° (ตนเอง + เพื่อน) — เก็บข้อมูลอย่างเดียว ยังไม่กระทบคะแนนจริง ────────────

/** ฝั่งผู้จัด: เฉพาะจำนวนและรายชื่อคนค้างส่ง — ไม่มีคะแนนดิบ/ตัวตนผู้ให้ */
export interface AssessmentOrganizerState {
  /** false = กิจกรรมนี้ไม่เข้าเงื่อนไข Tier 3 (server เป็นผู้ตัดสิน) */
  eligible: boolean;
  reason?: string;
  enabled: boolean;
  /** ใบงานถูกสร้างและนักศึกษาเริ่มส่งได้หลังผู้จัดกดจบกิจกรรมเท่านั้น */
  completed: boolean;
  progress: { self: { submitted: number; total: number }; peer: { submitted: number; total: number } } | null;
  pending: { registrationId: number; name: string; selfDone: boolean; peerGiven: number; peerTotal: number }[];
}

export interface AssessmentTask {
  assignmentId: number;
  source: 'self' | 'peer';
  /** ชื่อเพื่อนที่ต้องประเมิน (เฉพาะชื่อ) — ใบประเมินตนเองเป็น null */
  targetName: string | null;
  targetDutyRole: string | null;
  submitted: boolean;
  /** ระดับที่ส่งไปแล้ว ต่อทักษะ (null ถ้ายังไม่ส่ง) */
  myScores: Record<string, number> | null;
}

export interface MyAssessments {
  enabled: boolean;
  /** กิจกรรมจบแล้วและเริ่มส่งได้ */
  open: boolean;
  skills: string[];
  tasks: AssessmentTask[];
}

export interface SubmitAssessmentBody {
  scores: { skillType: string; score: number }[];
}

export const assessmentsAPI = {
  getMine: (registrationId: number) => fetchAPI<MyAssessments>(`/api/assessments/registration/${registrationId}`),
  submit: (assignmentId: number, body: SubmitAssessmentBody) =>
    fetchAPI<{ message: string }>(`/api/assessments/${assignmentId}`, { method: 'POST', body: JSON.stringify(body) }),
};

// ── อนุมัติผลประเมินรอบด้าน (คะแนนสุทธิ + flag) ────────────────────────────────────

/** เหตุผลที่คนนี้ต้องตรวจสอบเองก่อนอนุมัติ — ตัดออกจาก "อนุมัติทั้งหมด" */
export type ApprovalFlag = 'self_missing' | 'peer_incomplete' | 'divergent' | 'has_exception';

export interface ApprovalSkillView {
  skillType: string;
  /** ระดับที่ผู้จัดตั้งไว้ (ข้อยกเว้น ?? ฐานของฝ่าย ?? ค่าเริ่มต้น) */
  organizer: number;
  self: number | null;
  /** ค่าเฉลี่ยจากเพื่อน — null ถ้าส่งมาไม่ถึง 2 คน */
  peer: number | null;
  peerCount: number;
  /** ระดับที่ระบบแนะนำ (ปัดเข้า 2/3/5 และครอบเพดานแล้ว) */
  recommended: number;
  /** ค่าที่ล็อกไว้แล้ว — เฉพาะแถวที่อนุมัติแล้ว */
  final: number | null;
}

export interface ApprovalRow {
  registrationId: number;
  name: string;
  dutyRole: string | null;
  approved: boolean;
  flags: ApprovalFlag[];
  overrideReason: string | null;
  skills: ApprovalSkillView[];
}

export interface ApprovalDashboard {
  /** false = ยังอนุมัติไม่ได้ (ไม่เข้าเงื่อนไข/ยังไม่เปิดโหมด/ยังไม่จบกิจกรรม) — reason บอกทางไปต่อ */
  available: boolean;
  reason?: string;
  cap: number;
  skills: string[];
  summary: { total: number; approved: number; ready: number; flagged: number };
  rows: ApprovalRow[];
}

export interface ApproveEvaluationBody {
  /** ไม่ส่ง = ยอมรับที่ระบบแนะนำ */
  scores?: { skillType: string; score: number }[];
  /** บังคับเมื่อค่าที่เลือกต่างจากที่ระบบแนะนำ */
  reason?: string;
}

export interface ApproveReadyResult {
  approved: number;
  skipped: { registrationId: number; reason: 'not_found' | 'already_approved' | 'flagged' }[];
}

export const evaluationsAPI = {
  getMySkills: () => fetchAPI<SkillsData>('/api/evaluations/my-skills'),
  getByActivity: (activityId: number) => fetchAPI(`/api/evaluations/activity/${activityId}`),
  getBatch: (activityId: number) => fetchAPI<EvaluationBatch>(`/api/evaluations/activity/${activityId}/batch`),
  /** ส่งสถานะทั้งชุดทุกครั้ง (declarative) — ตอบกลับเป็นสถานะล่าสุดหลังบันทึก */
  saveBatch: (activityId: number, body: SaveEvaluationBatchBody) =>
    fetchAPI<EvaluationBatch>(`/api/evaluations/activity/${activityId}/batch`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  getAssessment: (activityId: number) =>
    fetchAPI<AssessmentOrganizerState>(`/api/evaluations/activity/${activityId}/assessment`),
  setAssessment: (activityId: number, enabled: boolean) =>
    fetchAPI<AssessmentOrganizerState>(`/api/evaluations/activity/${activityId}/assessment`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    }),
  getApproval: (activityId: number) => fetchAPI<ApprovalDashboard>(`/api/evaluations/activity/${activityId}/approval`),
  /** อนุมัติทั้งหมดที่ไม่มีข้อขัดแย้ง — ส่ง id ที่เห็นว่าพร้อม server จะตัดสินใหม่เองอีกครั้ง */
  approveReady: (activityId: number, registrationIds: number[]) =>
    fetchAPI<ApproveReadyResult>(`/api/evaluations/activity/${activityId}/approval/approve-ready`, {
      method: 'POST',
      body: JSON.stringify({ registrationIds }),
    }),
  /** อนุมัติ/แก้ผลรายคน — ตอบกลับเป็นหน้าสรุปล่าสุด */
  approveOne: (registrationId: number, body: ApproveEvaluationBody) =>
    fetchAPI<ApprovalDashboard>(`/api/evaluations/registration/${registrationId}/approval`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ==================== CERTIFICATES ====================

export interface Certificate {
  id: number;
  issueDate: string;
  certificateUrl: string;
  verificationCode?: string | null;
  volunteerHours?: string | null;
  volunteerRole?: string | null;
}

export const certificatesAPI = {
  // ไม่ระบุ volunteerHours = ใช้ค่าเริ่มต้นที่คำนวณจากกิจกรรม
  issue: (registrationId: number, volunteerHours?: number) =>
    fetchAPI(`/api/certificates/issue/${registrationId}`, {
      method: 'POST',
      body: JSON.stringify({ volunteerHours }),
    }),
  getMy: () => fetchAPI<Certificate[]>('/api/certificates/my'),
  getById: (id: number) => fetchAPI(`/api/certificates/${id}`),
};

// ==================== ADMIN ====================

export const adminAPI = {
  getDashboardStats: () => fetchAPI('/api/admin/dashboard/stats'),
};

// ==================== ORGANIZER REQUESTS ====================

export interface OrganizerRequest {
  id: number;
  name: string;
  email: string;
  phone: string;
  department: string;
  reason: string;
  experience?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
}

export const organizerRequestsAPI = {
  submit: (body: {
    name: string;
    email: string;
    phone: string;
    department: string;
    reason: string;
    experience?: string;
  }) => fetchAPI<OrganizerRequest>('/api/organizer-requests', { method: 'POST', body: JSON.stringify(body) }),

  getAll: (status?: string) => {
    const q = status ? `?status=${status}` : '';
    return fetchAPI<OrganizerRequest[]>(`/api/organizer-requests${q}`);
  },

  approve: (id: number, validDays: number) =>
    fetchAPI<{ message: string; emailSent: boolean }>(`/api/organizer-requests/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ validDays }),
    }),

  reject: (id: number, reason: string) =>
    fetchAPI(`/api/organizer-requests/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),

  getPendingCount: () =>
    fetchAPI<number>('/api/organizer-requests/pending-count'),
};

// ==================== ADMIN INVITES ====================

export interface AdminInvite {
  id: number;
  email: string;
  status: 'pending' | 'accepted' | 'revoked';
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt: string;
  invitedBy?: { id: number; name: string; email: string } | null;
}

export const adminInvitesAPI = {
  create: (email: string) =>
    fetchAPI<AdminInvite>('/api/admin/invites', { method: 'POST', body: JSON.stringify({ email }) }),
  getAll: () => fetchAPI<AdminInvite[]>('/api/admin/invites'),
  revoke: (id: number) => fetchAPI(`/api/admin/invites/${id}/revoke`, { method: 'PATCH' }),
};

// ==================== CHATBOT (มาสคอต) ====================

export interface ChatHistoryItem {
  role: 'user' | 'model';
  text: string;
}

export const chatbotAPI = {
  /** Public — ไม่ต้อง login ก็ถามได้ (credentials: include ใน fetchAPI ยังแนบ cookie ไปด้วยถ้า login อยู่ ให้คำตอบปรับตามบทบาทได้) */
  sendMessage: (message: string, history: ChatHistoryItem[]) =>
    fetchAPI<{ reply: string }>('/api/chatbot/message', { method: 'POST', body: JSON.stringify({ message, history }) }),
};

// ==================== SKILL TRANSCRIPTS (เอกสารรับรองผล Soft Skills) ====================

import type { SkillTranscriptSnapshot, TranscriptListItem, VerifyResult } from '@/lib/transcript';

export const skillTranscriptsAPI = {
  issue: () =>
    fetchAPI<{ code: string; issuedAt: string; snapshot: SkillTranscriptSnapshot }>('/api/skill-transcripts', {
      method: 'POST',
    }),
  mine: () => fetchAPI<TranscriptListItem[]>('/api/skill-transcripts/mine'),
  revoke: (code: string) =>
    fetchAPI<{ code: string; revokedAt: string }>(`/api/skill-transcripts/${encodeURIComponent(code)}/revoke`, {
      method: 'PATCH',
    }),
  /** สาธารณะ — not_found/revoked เป็นผลปกติ (200); throw เฉพาะเมื่อเครือข่าย/เซิร์ฟเวอร์ขัดข้อง */
  verify: (code: string) => fetchAPI<VerifyResult>(`/api/skill-transcripts/verify/${encodeURIComponent(code)}`),
};
