// OTP generation and validation utilities
import crypto from "crypto"

// Generate a 6-digit OTP
export function generateOTP(): string {
  // Generate random bytes and convert to a 6-digit number
  const randomBytes = crypto.randomBytes(4)
  const randomNumber = randomBytes.readUInt32BE(0)
  // Map to 6-digit range (100000-999999)
  const otp = 100000 + (randomNumber % 900000)
  return otp.toString()
}

// Hash OTP for storage (we don't store plain OTP)
export function hashOTP(otp: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(otp).digest("hex")
}

// Timing-safe string comparison (works in Edge runtime)
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

// Verify OTP against hash
export function verifyOTPHash(otp: string, hash: string, secret: string): boolean {
  const computedHash = hashOTP(otp, secret)
  return timingSafeEqual(computedHash, hash)
}

// Check if OTP is expired (10 minute window)
export function isOTPExpired(sentAt: Date, windowMinutes = 10): boolean {
  const now = new Date()
  const expiresAt = new Date(sentAt.getTime() + windowMinutes * 60 * 1000)
  return now > expiresAt
}

// Rate limiting check (max 3 OTPs per hour)
export function canSendOTP(lastSentAt: Date | null, attemptCount: number): { allowed: boolean; reason?: string } {
  if (attemptCount >= 5) {
    return { allowed: false, reason: "Too many verification attempts. Please try again later." }
  }

  if (lastSentAt) {
    const now = new Date()
    const cooldownMs = 60 * 1000 // 1 minute cooldown between sends
    const timeSinceLastSend = now.getTime() - new Date(lastSentAt).getTime()

    if (timeSinceLastSend < cooldownMs) {
      const secondsRemaining = Math.ceil((cooldownMs - timeSinceLastSend) / 1000)
      return { allowed: false, reason: `Please wait ${secondsRemaining} seconds before requesting a new code.` }
    }
  }

  return { allowed: true }
}
