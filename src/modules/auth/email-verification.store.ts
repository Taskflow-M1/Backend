import {
  createHmac,
  randomInt,
  timingSafeEqual,
} from 'crypto';
import { env } from '../../config/env';
import { AppError } from '../../utils/app-error';
import { ERROR_CODES, MESSAGES } from '../../utils/constants';

interface VerificationEntry {
  codeHash: Buffer;
  expiresAt: number;
  failedAttempts: number;
  nextSendAt: number;
}

const verificationStore = new Map<string, VerificationEntry>();
const MAX_FAILED_ATTEMPTS = 5;
const COOLDOWN_MS = 60_000;

export const EMAIL_VERIFICATION_TTL_SECONDS =
  env.emailVerificationTtlMinutes * 60;
export const EMAIL_VERIFICATION_COOLDOWN_SECONDS = COOLDOWN_MS / 1000;

function hashCode(email: string, code: string): Buffer {
  return createHmac('sha256', env.jwtSecret)
    .update(`${email}:${code}`)
    .digest();
}

function purgeExpiredEntries(now = Date.now()): void {
  for (const [email, entry] of verificationStore.entries()) {
    if (now >= entry.expiresAt) {
      verificationStore.delete(email);
    }
  }
}

const purgeTimer = setInterval(purgeExpiredEntries, 60_000);
purgeTimer.unref();

export function createVerificationCode(email: string): string {
  const now = Date.now();
  purgeExpiredEntries(now);

  const existingEntry = verificationStore.get(email);
  if (existingEntry && now < existingEntry.nextSendAt) {
    throw new AppError(
      429,
      ERROR_CODES.TOO_MANY_REQUESTS,
      MESSAGES.AUTH.VERIFICATION_CODE_COOLDOWN,
    );
  }

  const code = randomInt(0, 10_000).toString().padStart(4, '0');
  verificationStore.set(email, {
    codeHash: hashCode(email, code),
    expiresAt: now + EMAIL_VERIFICATION_TTL_SECONDS * 1000,
    failedAttempts: 0,
    nextSendAt: now + COOLDOWN_MS,
  });

  return code;
}

export function cancelVerificationCode(email: string, code: string): void {
  const entry = verificationStore.get(email);
  if (
    entry &&
    timingSafeEqual(entry.codeHash, hashCode(email, code))
  ) {
    verificationStore.delete(email);
  }
}

export function consumeVerificationCode(email: string, code: string): void {
  const entry = verificationStore.get(email);
  const now = Date.now();

  if (!entry || now >= entry.expiresAt) {
    verificationStore.delete(email);
    throw AppError.unauthorized(MESSAGES.AUTH.VERIFICATION_CODE_INVALID);
  }

  const isValid = timingSafeEqual(entry.codeHash, hashCode(email, code));
  if (!isValid) {
    entry.failedAttempts += 1;

    if (entry.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      verificationStore.delete(email);
      throw AppError.unauthorized(
        MESSAGES.AUTH.VERIFICATION_CODE_TOO_MANY_ATTEMPTS,
      );
    }

    throw AppError.unauthorized(MESSAGES.AUTH.VERIFICATION_CODE_INVALID);
  }

  verificationStore.delete(email);
}

export function clearVerificationStoreForTests(): void {
  if (env.nodeEnv === 'test') {
    verificationStore.clear();
  }
}
