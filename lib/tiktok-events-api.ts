import { createHash } from "crypto"

const TIKTOK_EVENTS_API_URL = "https://business-api.tiktok.com/open_api/v1.3/event/track/"
const PIXEL_ID = "D6CA26JC77U90IGSJAGG"

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex")
}

function normaliseUKPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith("0")) {
    return "+44" + digits.slice(1)
  }
  return phone.trim()
}

export interface TikTokEventOptions {
  /** TikTok event name (e.g. "CompleteRegistration", "Lead", "Schedule") */
  event: string
  /** Unique event ID for deduplication between pixel and Events API */
  eventId?: string
  /** Full page URL where the event occurred */
  url?: string
  /** User PII for enhanced matching (will be SHA-256 hashed) */
  email?: string | null
  phone?: string | null
  externalId?: string | null
  /** Request headers for IP/UA extraction */
  ip?: string | null
  userAgent?: string | null
  /** Event properties */
  properties?: Record<string, unknown>
}

/**
 * Extract IP address from request headers (x-forwarded-for).
 */
export function extractIp(request: Request): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null
}

/**
 * Extract User-Agent from request headers.
 */
export function extractUserAgent(request: Request): string | null {
  return request.headers.get("user-agent") || null
}

/**
 * Send an event to TikTok's Events API (server-side).
 *
 * This is fire-and-forget: it never throws, never blocks the caller,
 * and silently no-ops if the access token env var is missing.
 */
export async function trackTikTokServerEvent(options: TikTokEventOptions): Promise<void> {
  const accessToken = process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN
  if (!accessToken) {
    return
  }

  try {
    const user: Record<string, string> = {}

    if (options.email) {
      user.email = sha256(options.email)
    }
    if (options.phone) {
      user.phone_number = sha256(normaliseUKPhone(options.phone))
    }
    if (options.externalId) {
      user.external_id = sha256(options.externalId)
    }
    if (options.ip) {
      user.ip = options.ip
    }
    if (options.userAgent) {
      user.user_agent = options.userAgent
    }

    const eventData: Record<string, unknown> = {
      event: options.event,
      event_time: Math.floor(Date.now() / 1000),
    }

    if (options.eventId) {
      eventData.event_id = options.eventId
    } else {
      eventData.event_id = crypto.randomUUID()
    }

    if (Object.keys(user).length > 0) {
      eventData.user = user
    }

    if (options.url) {
      eventData.page = { url: options.url }
    }

    if (options.properties && Object.keys(options.properties).length > 0) {
      eventData.properties = options.properties
    }

    const payload = {
      event_source: "web",
      event_source_id: PIXEL_ID,
      data: [eventData],
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(TIKTOK_EVENTS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": accessToken,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      console.error(`[tiktok-events-api] ${options.event} failed (${response.status}):`, text)
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error(`[tiktok-events-api] ${options.event} timed out`)
    } else {
      console.error(`[tiktok-events-api] ${options.event} error:`, error)
    }
  }
}
