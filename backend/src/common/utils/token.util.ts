import { randomBytes, randomInt, createHash } from 'crypto';

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const USERNAME_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';

export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateSecurePassword(length = 10): string {
  return Array.from({ length }, () => PASSWORD_CHARS[randomInt(PASSWORD_CHARS.length)]).join('');
}

// Charset deliberately excludes "@" so a generated username can never be mistaken for an email.
export function generateUsername(prefix = 'org', length = 8): string {
  const suffix = Array.from({ length }, () => USERNAME_CHARS[randomInt(USERNAME_CHARS.length)]).join('');
  return `${prefix}-${suffix}`;
}
