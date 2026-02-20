/**
 * Auth email templates: magic link, OTP (patient login + intake), password reset.
 * All templates are pure functions returning HTML strings.
 */
import { wrapInBaseLayout } from "./base-layout"

// ---------------------------------------------------------------------------
// 1. Patient Magic Link
// ---------------------------------------------------------------------------

export interface MagicLinkPayload {
  greeting: string // Pre-escaped (e.g. "Hi Jane" or "Hi there")
  magicLink: string
}

export function renderMagicLinkEmail(data: MagicLinkPayload): string {
  return wrapInBaseLayout({
    title: "Pearlie",
    body: `
      <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6; margin-bottom: 8px;">
        ${data.greeting},
      </p>
      <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6; margin-bottom: 24px;">
        Click the button below to sign in to your Pearlie account and view your matched clinics.
      </p>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${data.magicLink}" style="display: inline-block; background: #0fbcb0; color: white; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 12px;">
          Sign in to Pearlie
        </a>
      </div>
      <p style="font-size: 14px; color: #888; line-height: 1.5; margin-bottom: 8px;">
        This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
      </p>
    `,
  })
}

// ---------------------------------------------------------------------------
// 2. Patient Login OTP
// ---------------------------------------------------------------------------

export interface PatientOtpPayload {
  otp: string
}

export function renderPatientLoginOtpEmail(data: PatientOtpPayload): string {
  return wrapInBaseLayout({
    title: "Pearlie",
    body: `
      <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6; margin-bottom: 24px;">
        Here's your login code for your Pearlie account:
      </p>
      <div style="background: #f8f7f4; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a;">${data.otp}</span>
      </div>
      <p style="font-size: 14px; color: #888; line-height: 1.5; margin-bottom: 8px;">
        This code expires in 10 minutes.
      </p>
      <p style="font-size: 14px; color: #888; line-height: 1.5;">
        If you didn't request this code, you can safely ignore this email.
      </p>
    `,
  })
}

// ---------------------------------------------------------------------------
// 3. Intake Verification OTP (legacy route)
// ---------------------------------------------------------------------------

export interface IntakeOtpPayload {
  otp: string
}

export function renderIntakeOtpEmail(data: IntakeOtpPayload): string {
  return wrapInBaseLayout({
    title: "Pearlie",
    body: `
      <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6; margin-bottom: 24px;">
        Here's your verification code to view your matched dental clinics:
      </p>
      <div style="background: #f8f7f4; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a;">${data.otp}</span>
      </div>
      <p style="font-size: 14px; color: #888; line-height: 1.5; margin-bottom: 8px;">
        This code expires in 10 minutes.
      </p>
      <p style="font-size: 14px; color: #888; line-height: 1.5;">
        If you didn't request this code, you can safely ignore this email.
      </p>
    `,
  })
}

// ---------------------------------------------------------------------------
// 4. Password Reset
// ---------------------------------------------------------------------------

export interface PasswordResetPayload {
  resetUrl: string
  expiresAt: Date
}

export function renderPasswordResetEmail(data: PasswordResetPayload): string {
  const expiryTime = data.expiresAt.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return wrapInBaseLayout({
    title: "Reset Your Password",
    subtitle: "Pearlie Clinic Portal",
    body: `
      <p style="font-size: 18px; color: #111827; margin-bottom: 20px;">Hi,</p>
      <p style="color: #4b5563; font-size: 16px; margin-bottom: 20px;">
        We received a request to reset your password for your Pearlie clinic portal account.
      </p>
      <p style="color: #4b5563; font-size: 16px; margin-bottom: 30px;">
        Click the button below to create a new password.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.resetUrl}" style="display: inline-block; background: #0fbcb0; color: white !important; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Reset Password</a>
      </div>
      <div style="margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 8px; font-size: 14px; color: #6b7280; word-break: break-all;">
        <strong>Or copy this link:</strong><br>
        ${data.resetUrl}
      </div>
      <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #9ca3af;">
        This link expires at <strong>${expiryTime}</strong> (in 1 hour).
        If you didn't request this password reset, you can safely ignore this email.
      </p>
    `,
  })
}
