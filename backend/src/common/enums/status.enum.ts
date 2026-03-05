// src/common/enums/status.enum.ts

export enum ActivityStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  COMPLETED = 'completed',
}

export enum ApprovalStatus {
  PENDING = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PENDING_CANCEL = 'pending_cancel',
}

export enum RegistrationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export enum AttendanceStatus {
  ATTENDED = 'attended',
  ABSENT = 'absent',
}
