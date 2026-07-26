export const ActivityStatus = {
  OPEN: 'open',
  CLOSED: 'closed',
  COMPLETED: 'completed',
} as const;
export type ActivityStatus = (typeof ActivityStatus)[keyof typeof ActivityStatus];

export const ApprovalStatus = {
  PENDING: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PENDING_CANCEL: 'pending_cancel',
} as const;
export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

export const RegistrationStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
} as const;
export type RegistrationStatus = (typeof RegistrationStatus)[keyof typeof RegistrationStatus];

export const AttendanceStatus = {
  ATTENDED: 'attended',
  ABSENT: 'absent',
} as const;
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const InviteStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REVOKED: 'revoked',
} as const;
export type InviteStatus = (typeof InviteStatus)[keyof typeof InviteStatus];
