/**
 * Simple in-memory rate limiter for serverless API routes.
 * Works per-process — sufficient for single-instance deployments.
 * For multi-instance, use Redis or similar.
 *
 * Includes periodic cleanup to prevent memory leaks in long-lived
 * warm instances on Vercel serverless.
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

  // Periodic cleanup: evict expired entries every 5 minutes to prevent
  // unbounded memory growth in long-lived warm serverless instances.
  const cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, record] of attempts) {
      if (now - record.firstAttempt > windowMs) {
        attempts.delete(key)
      }
    }
  }, 5 * 60 * 1000)

  // Ensure the interval doesn't prevent Node.js from exiting
  if (cleanupInterval.unref) {
    cleanupInterval.unref()
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
