// lib/api.ts — API Client สำหรับเชื่อมกับ Backend (NestJS)

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ==================== TYPES ====================

export interface User {
  id: number;
  name: string;
  email: string;
  role: "student" | "organizer" | "admin";
  studentId?: string;
  isBlocked?: boolean;
  createdAt?: string;
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

export interface Activity<T = unknown> {
  id: number;
  name: string;
  category: string;
  description: string;
  imageUrl?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  registeredCount: number;
  capacity: number;
  approvalStatus: string;
  status: string;
  tags: Tag[];
  conditions: Condition[];
  benefits: Benefit[];
  softSkills?: { skillName: string }[];
  organizer?: User;
  registrations?: T[];
}

export interface PlatformStats {
  totalActivities: number;
  totalParticipants: number;
}

export interface OrganizerStats {
  totalActivities: number;
  activeActivities: number;
  totalRegistrations: number;
  pendingApprovals: number;
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
    role: string;
    studentId?: string;
    googleId?: string;
  }) => fetchAPI<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    fetchAPI<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  getProfile: () => fetchAPI<User>('/api/auth/profile'),

  googleLoginUrl: () => `${API_BASE_URL}/api/auth/google`,
};

// ==================== USERS ====================

export const usersAPI = {
  getMe: () => fetchAPI<User>('/api/users/me'),
  updateMe: (body: { name?: string; studentId?: string; newPassword?: string; currentPassword?: string }) =>
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
  deleteUser: (id: number) => fetchAPI(`/api/users/${id}`, { method: 'DELETE' }),
};

// ==================== ACTIVITIES ====================

export const activitiesAPI = {
  getAll: (params?: { search?: string; category?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchAPI<Activity[]>(`/api/activities${query ? `?${query}` : ''}`);
  },
  getById: (id: number) => fetchAPI<Activity>(`/api/activities/${id}`),
  create: (body: unknown) => fetchAPI<Activity>('/api/activities', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: unknown) =>
    fetchAPI<Activity>(`/api/activities/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: number) => fetchAPI<void>(`/api/activities/${id}`, { method: 'DELETE' }),
  getMy: () => fetchAPI<Activity[]>('/api/activities/my'),
  getPending: () => fetchAPI<Activity[]>('/api/activities/pending'),
  approve: (id: number) => fetchAPI<void>(`/api/activities/${id}/approve`, { method: 'PATCH' }),
  reject: (id: number, reason: string) =>
    fetchAPI<void>(`/api/activities/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  requestCancel: (id: number, reason: string) =>
    fetchAPI<void>(`/api/activities/${id}/request-cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  getPendingCancel: () => fetchAPI<Activity[]>('/api/activities/pending-cancel'),
  approveCancel: (id: number) => fetchAPI<void>(`/api/activities/${id}/approve-cancel`, { method: 'PATCH' }),
  getPlatformStats: () => fetchAPI<PlatformStats>('/api/activities/stats/platform'),
  getOrganizerStats: () => fetchAPI<OrganizerStats>('/api/activities/stats/organizer'),
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

// ==================== REGISTRATIONS ====================

export const registrationsAPI = {
  create: (activityId: number) =>
    fetchAPI('/api/registrations', { method: 'POST', body: JSON.stringify({ activityId }) }),
  cancel: (id: number) => fetchAPI(`/api/registrations/${id}`, { method: 'DELETE' }),
  getMy: () => fetchAPI('/api/registrations/my'),
  getByActivity: (activityId: number) => fetchAPI(`/api/registrations/activity/${activityId}`),
  confirm: (id: number) => fetchAPI(`/api/registrations/${id}/confirm`, { method: 'PATCH' }),
  checkIn: (id: number) => fetchAPI(`/api/registrations/${id}/check-in`, { method: 'PATCH' }),
};

// ==================== EVALUATIONS ====================

export interface EvaluationBody {
  registrationId: number;
  teamwork: number;
  leadership: number;
  communication: number;
  problemSolving: number;
  adaptability: number;
  comment?: string;
}

export interface SkillsData {
  count: number;
  points: number;
  level: number;
  average: {
    teamwork: number;
    leadership: number;
    communication: number;
    problemSolving: number;
    adaptability: number;
  };
  badges: { name: string; icon: string; description: string }[];
  history: {
    id: number;
    activityName: string;
    date: string;
    scores: {
      teamwork: number;
      leadership: number;
      communication: number;
      problemSolving: number;
      adaptability: number;
    };
  }[];
}

export const evaluationsAPI = {
  create: (body: EvaluationBody) => fetchAPI('/api/evaluations', { method: 'POST', body: JSON.stringify(body) }),
  getMySkills: () => fetchAPI<SkillsData>('/api/evaluations/my-skills'),
  getByActivity: (activityId: number) => fetchAPI(`/api/evaluations/activity/${activityId}`),
};

// ==================== CERTIFICATES ====================

export const certificatesAPI = {
  issue: (registrationId: number) =>
    fetchAPI(`/api/certificates/issue/${registrationId}`, { method: 'POST' }),
  getMy: () => fetchAPI('/api/certificates/my'),
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

  approve: (id: number) =>
    fetchAPI(`/api/organizer-requests/${id}/approve`, { method: 'PATCH' }),

  reject: (id: number, reason: string) =>
    fetchAPI(`/api/organizer-requests/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),

  getPendingCount: () =>
    fetchAPI<number>('/api/organizer-requests/pending-count'),
};
