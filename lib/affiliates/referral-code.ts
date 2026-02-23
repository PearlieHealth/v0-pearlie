/**
 * Generates a unique, URL-safe referral code for affiliates.
 * Format: AFF-xxxxx (5 random alphanumeric characters)
 */
export function generateReferralCode(): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789" // Removed ambiguous: 0, o, l, 1
  let code = ""
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return `AFF-${code}`
}
