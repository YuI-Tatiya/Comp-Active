// lib/api.ts — API Client สำหรับเชื่อมกับ Backend (NestJS)

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
  approvalStatus: string;
  status: string;
  /** เหตุผลที่ผู้จัดยกเลิกกิจกรรม — แสดงให้นักศึกษาเห็นเมื่อกิจกรรมถูกยกเลิก */
  cancellationReason?: string | null;
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
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message?.[0] || data.message || 'เกิดข้อผิดพลาด');
  }

  return (data.data ?? data) as T;
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
};

// ==================== USERS ====================

export const usersAPI = {
  getMe: () => fetchAPI<User>('/api/users/me'),
  // ⚠️ ต้องตรงกับ backend/src/modules/shared/users/dto/update-user.dto.ts
  //    ห้ามเติม email — backend ไม่รับ และ forbidNonWhitelisted จะตีกลับเป็น 400
  updateMe: (body: {
    name?: string;
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
  getPlatformStats: () => fetchAPI<PlatformStats>('/api/activities/stats/platform'),
  getOrganizerStats: () => fetchAPI<OrganizerStats>('/api/activities/stats/organizer'),
  /** ผลสรุปแบบสำรวจของกิจกรรมเดี่ยว — โครงสร้างตรงกับ eventsAPI.getSurveyResults */
  getSurveyResults: (id: number) => fetchAPI<EventSurveyResultsResponse>(`/api/activities/${id}/survey-results`),
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(`${API_BASE_URL}/api/activities/upload-image`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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
}

export interface CreateEventBody {
  name: string;
  description: string;
  imageUrl?: string;
  isPublic?: boolean;
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
  registrationCloseAt?: string | null;
  visibility: string;
  visibilityStudentIdFilter?: string | null;
  visibilityProgram?: { programCode: string }[];
  visibilityYears?: { year: number }[];
  createdAt: string;
  activities: Activity[];
  surveyQuestions?: EventSurveyQuestion[];
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
  getAllPublic: () => fetchAPI<EventSummary[]>('/api/events'),
  getPublicById: (id: number) => fetchAPI<EventSummary>(`/api/events/${id}/public`),
  getSurveyResults: (id: number) => fetchAPI<EventSurveyResultsResponse>(`/api/events/${id}/survey-results`),
  uploadAttachment: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(`${API_BASE_URL}/api/events/upload-attachment`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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

export interface CheckInSelfResult {
  id: number;
  status: string;
  attendance: string;
  checkInTime: string | null;
  alreadyCheckedIn: boolean;
}

export const registrationsAPI = {
  create: (activityId: number, answers?: RegistrationAnswerBody[], certRequest?: CertRequestBody) =>
    fetchAPI('/api/registrations', {
      method: 'POST',
      body: JSON.stringify({ activityId, answers, ...certRequest }),
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

export const evaluationsAPI = {
  getMySkills: () => fetchAPI<SkillsData>('/api/evaluations/my-skills'),
  getByActivity: (activityId: number) => fetchAPI(`/api/evaluations/activity/${activityId}`),
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
  issue: (registrationId: number) =>
    fetchAPI(`/api/certificates/issue/${registrationId}`, { method: 'POST' }),
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
