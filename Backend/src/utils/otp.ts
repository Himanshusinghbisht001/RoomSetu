/**
 * OTP Service — Cryptographically secure 6-digit OTP generation and hashing.
 *
 * Security rules:
 *  - OTP is generated using Node's crypto.randomInt (cryptographically secure).
 *  - Math.random() is NEVER used.
 *  - OTP is hashed with SHA-256 before storage; plaintext is NEVER persisted.
 *  - The otpHash is NEVER returned to the frontend or logged.
 */

import crypto from 'crypto';

const OTP_LENGTH = 6;
const OTP_MAX = 10 ** OTP_LENGTH; // 1_000_000

/**
 * Generates a cryptographically secure 6-digit OTP string.
 * Returns a zero-padded string like "048273".
 */
export function generateOTP(): string {
  const value = crypto.randomInt(0, OTP_MAX);
  return value.toString().padStart(OTP_LENGTH, '0');
}

/**
 * Hashes an OTP (or any string) using SHA-256.
 * Only the hash is stored in the database.
 */
export function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Compares a plaintext OTP against a stored hash in constant time.
 * Returns true if they match.
 */
export function verifyOTP(plaintext: string, storedHash: string): boolean {
  const candidateHash = hashOTP(plaintext);
  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(candidateHash, 'hex'),
      Buffer.from(storedHash, 'hex'),
    );
  } catch {
    return false;
  }
}

/**
 * Returns a Date that is `minutes` minutes from now.
 */
export function otpExpiresAt(minutes: number = 10): Date {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date;
}
