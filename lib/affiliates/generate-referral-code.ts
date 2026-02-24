const CHARS = "abcdefghijkmnpqrstuvwxyz23456789" // no ambiguous chars (0, O, l, 1)

export function generateReferralCode(): string {
  const random = Array.from({ length: 5 }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join("")
  return `AFF-${random}`
}
