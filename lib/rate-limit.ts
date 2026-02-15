/**
 * Simple in-memory rate limiter for serverless API routes.
 * Works per-process — sufficient for single-instance deployments.
 * For multi-instance, use Redis or similar.
 */

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
