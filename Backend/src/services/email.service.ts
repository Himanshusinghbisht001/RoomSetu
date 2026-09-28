/**
 * Email Service — Nodemailer SMTP integration
 *
 * Credentials are validated lazily (at call time, not at startup) so the
 * server starts normally when SMTP vars are absent. If they are absent,
 * sendFeedbackNotification() logs a safe message and returns immediately.
 *
 * SECURITY RULES enforced here:
 *  - SMTP_PASS is NEVER logged, returned, or included in any error message.
 *  - The transporter is created once and reused (lazy singleton).
 *  - CR (\r) and LF (\n) are stripped from any value used in email headers
 *    to prevent email header injection attacks.
 *  - The receiver email is always taken from server environment config;
 *    callers cannot supply or override it.
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import type { IFeedback } from '../modules/feedback/feedback.model.js';

// ── Configuration check (lazy) ────────────────────────────────────────────────

/**
 * Returns true if all required SMTP env vars and the receiver email are
 * present and non-empty. Does NOT throw — callers decide how to react.
 */
export function isEmailConfigured(): boolean {
  return (
    !!env.SMTP_HOST &&
    !!env.SMTP_PORT &&
    !!env.SMTP_USER &&
    !!env.SMTP_PASS &&
    !!env.FEEDBACK_RECEIVER_EMAIL
  );
}

// ── Internal: lazy transporter singleton ─────────────────────────────────────

let _transporter: Transporter | null = null;

/**
 * Returns the lazily-created nodemailer transporter.
 * Created once on first call; reused thereafter.
 * Throws if SMTP is not configured (caller should check isEmailConfigured first).
 */
function getTransporter(): Transporter {
  if (_transporter) return _transporter;

  // At this point isEmailConfigured() has already been confirmed true,
  // so all vars are guaranteed present. We cast to string/number safely.
  const port = env.SMTP_PORT as number;
  const secure = port === 465; // true for 465 (SSL/TLS), false for 587 (STARTTLS)

  _transporter = nodemailer.createTransport({
    host: env.SMTP_HOST as string,
    port,
    secure,
    auth: {
      user: env.SMTP_USER as string,
      // SMTP_PASS is passed directly to nodemailer; never stored in a variable
      // that gets logged. The only reference is this assignment.
      pass: env.SMTP_PASS as string,
    },
    // For port 587 (STARTTLS), require TLS upgrade
    ...(secure ? {} : { tls: { rejectUnauthorized: true } }),
  });

  return _transporter;
}

/**
 * Resets the transporter singleton. Used only in tests to ensure isolation
 * between test cases that mutate SMTP config.
 * @internal — do NOT call in production code.
 */
export function _resetTransporter(): void {
  _transporter = null;
}

// ── Header-injection prevention ───────────────────────────────────────────────

/**
 * Strips CR and LF characters from a string to prevent email header injection.
 */
function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]/g, '');
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Sends a feedback notification email to the configured receiver.
 *
 * Behavior:
 *  - If SMTP is not configured: logs a safe skip message and returns.
 *  - If SMTP is configured and send succeeds: resolves silently.
 *  - If SMTP is configured but send fails: logs a safe error message and
 *    resolves (does NOT throw — feedback is already persisted in MongoDB).
 *
 * The caller (feedback controller) should use fire-and-forget:
 *   void sendFeedbackNotification(feedback).catch(() => {});
 * The inner catch here handles everything; the outer one is defensive only.
 *
 * @param feedback  The persisted IFeedback document (from MongoDB)
 */
export async function sendFeedbackNotification(feedback: IFeedback): Promise<void> {
  if (!isEmailConfigured()) {
    console.log('[Email] Feedback email notification skipped: SMTP not configured.');
    return;
  }

  const receiver = env.FEEDBACK_RECEIVER_EMAIL as string;

  // Sanitize values used in subject to prevent header injection
  const safeType = sanitizeHeader(feedback.type);
  const safeName = sanitizeHeader(feedback.name);
  const safeEmail = sanitizeHeader(feedback.email);

  const subject = `[RoomSetu] New Feedback - ${safeType}`;

  // Build plain-text body — only validated, safe feedback fields
  const lines: string[] = [
    'RoomSetu — New Feedback',
    '',
    `Name:    ${safeName}`,
    `Email:   ${safeEmail}`,
    `Type:    ${safeType}`,
    '',
    'Message:',
    feedback.message,
    '',
    'Submitted At:',
    feedback.createdAt.toISOString(),
  ];

  // Optionally include userId for authenticated submissions
  if (feedback.userId) {
    lines.push('');
    lines.push(`User ID: ${feedback.userId.toString()}`);
  }

  const text = lines.join('\n');

  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: `"RoomSetu Notifications" <${env.SMTP_USER}>`,
      to: receiver,
      subject,
      text,
    });
  } catch (err) {
    // Log a safe message only — never log SMTP credentials or the raw error
    // (which may contain auth details from some SMTP providers).
    console.error('[Email] Feedback email notification failed.');
    // Explicitly NOT re-throwing: the feedback is already saved in MongoDB.
  }
}

// ── OTP Verification Email ─────────────────────────────────────────────────────

/**
 * Returns true if SMTP is configured (same check used for feedback emails).
 * Used specifically to gate OTP email sending.
 */
export function isOtpEmailConfigured(): boolean {
  return (
    !!env.SMTP_HOST &&
    !!env.SMTP_PORT &&
    !!env.SMTP_USER &&
    !!env.SMTP_PASS
  );
}

/**
 * Sends an OTP verification email to the user's registered email address.
 *
 * Behavior:
 *  - If SMTP is not configured: throws so the caller can return a safe error.
 *  - If SMTP send fails: throws so the caller knows the OTP was not delivered.
 *
 * Security:
 *  - The plaintext OTP is only used to compose the email body and is never
 *    logged or stored anywhere by this function.
 *  - SMTP credentials are never logged.
 *  - CR/LF are stripped from all header values.
 *
 * @param recipientEmail  The user's registered email address (server-controlled)
 * @param otp             Plaintext 6-digit OTP (held only for the duration of this call)
 */
export async function sendVerificationOTP(
  recipientEmail: string,
  otp: string,
): Promise<void> {
  if (!isOtpEmailConfigured()) {
    throw new Error('SMTP is not configured; cannot send verification email.');
  }

  // Basic sanitization
  const safeEmail = recipientEmail.replace(/[\r\n]/g, '');
  const subject = '[RoomSetu] Email Verification Code';

  const text = [
    'RoomSetu',
    'Email Verification Code',
    '',
    'Your verification code is:',
    '',
    `  ${otp}`,
    '',
    'This code expires in 10 minutes.',
    '',
    'Do not share this code with anyone.',
    '',
    'If you did not create a RoomSetu account, please ignore this email.',
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#4f46e5;padding:28px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">RoomSetu</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:700;">Email Verification Code</h2>
          <p style="margin:0 0 32px;color:#6b7280;font-size:15px;">Use the code below to verify your email address.</p>
          <div style="background:#f9fafb;border:2px dashed #e5e7eb;border-radius:10px;padding:28px;text-align:center;margin-bottom:32px;">
            <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#4f46e5;font-family:'Courier New',monospace;">${otp}</span>
          </div>
          <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">⏱ This code expires in <strong>10 minutes</strong>.</p>
          <p style="margin:0;color:#6b7280;font-size:14px;">🔒 Do not share this code with anyone.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">If you did not create a RoomSetu account, please ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const transporterToUse = getTransporter();
    await transporterToUse.sendMail({
      from: `"RoomSetu" <${env.SMTP_USER}>`,
      to: safeEmail,
      subject,
      text,
      html,
    });
  } catch (err) {
    throw new Error('Failed to send verification email. Please try again.');
  }
}
