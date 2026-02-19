/**
 * Simple in-memory rate limiter for serverless API routes.
 * Works per-process — sufficient for single-instance deployments.
 * For multi-instance, use Redis or similar.
 */

const MAX_ENTRIES = 10_000

interface RateLimitRecord {
  count: number
  firstAttempt: number
}

interface RateLimiterOptions {
  windowMs: number
  maxAttempts: number
}

export function createRateLimiter({ windowMs, maxAttempts }: RateLimiterOptions) {
  const attempts = new Map<string, RateLimitRecord>()

  function prune() {
    const now = Date.now()
    // First pass: remove expired entries
    for (const [key, rec] of attempts) {
      if (now - rec.firstAttempt > windowMs) {
        attempts.delete(key)
      }
    }
    // If still over limit, delete oldest 20%
    if (attempts.size > MAX_ENTRIES) {
      const sorted = [...attempts.entries()].sort(
        (a, b) => a[1].firstAttempt - b[1].firstAttempt,
      )
      const toDelete = Math.ceil(attempts.size * 0.2)
      for (let i = 0; i < toDelete; i++) {
        attempts.delete(sorted[i][0])
      }
    }
  }

  return {
    check(key: string): { limited: boolean; retryAfterSecs: number } {
      const record = attempts.get(key)
      if (!record) return { limited: false, retryAfterSecs: 0 }

      const elapsed = Date.now() - record.firstAttempt
      if (elapsed > windowMs) {
        attempts.delete(key)
        return { limited: false, retryAfterSecs: 0 }
      }

      if (record.count >= maxAttempts) {
        const retryAfterSecs = Math.ceil((windowMs - elapsed) / 1000)
        return { limited: true, retryAfterSecs }
      }

      return { limited: false, retryAfterSecs: 0 }
    },

    record(key: string) {
      if (attempts.size >= MAX_ENTRIES) {
        prune()
      }
      const record = attempts.get(key)
      if (!record || Date.now() - record.firstAttempt > windowMs) {
        attempts.set(key, { count: 1, firstAttempt: Date.now() })
      } else {
        record.count++
      }
    },

    clear(key: string) {
      attempts.delete(key)
    },
  }
}
