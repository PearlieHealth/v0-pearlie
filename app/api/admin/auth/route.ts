import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_IS_CONFIGURED, SESSION_COOKIE_NAME, SESSION_TOKEN } from "@/lib/auth-config"

// ── In-memory rate limiter for login attempts ──
const LOGIN_WINDOW_MS = 15 * 60 * 1000 // 15-minute window
const MAX_ATTEMPTS = 5                  // max failures per window

const failedAttempts = new Map<string, { count: number; firstAttempt: number }>()

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

function isRateLimited(ip: string): { limited: boolean; retryAfterSecs: number } {
  const record = failedAttempts.get(ip)
  if (!record) return { limited: false, retryAfterSecs: 0 }

  // Window expired – reset
  const elapsed = Date.now() - record.firstAttempt
  if (elapsed > LOGIN_WINDOW_MS) {
    failedAttempts.delete(ip)
    return { limited: false, retryAfterSecs: 0 }
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfterSecs = Math.ceil((LOGIN_WINDOW_MS - elapsed) / 1000)
    return { limited: true, retryAfterSecs }
  }

  return { limited: false, retryAfterSecs: 0 }
}

function recordFailure(ip: string) {
  const record = failedAttempts.get(ip)
  if (!record || Date.now() - record.firstAttempt > LOGIN_WINDOW_MS) {
    failedAttempts.set(ip, { count: 1, firstAttempt: Date.now() })
  } else {
    record.count++
  }
}

function clearFailures(ip: string) {
  failedAttempts.delete(ip)
}

export async function POST(request: NextRequest) {
  try {
    // Reject all login attempts if ADMIN_PASSWORD is not configured
    if (!ADMIN_IS_CONFIGURED) {
      console.error("[Admin Auth] ADMIN_PASSWORD environment variable is not set. Login is disabled.")
      return NextResponse.json(
        { success: false, error: "Admin login is not configured. Set ADMIN_PASSWORD environment variable." },
        { status: 503 }
      )
    }

    // Rate-limit check
    const ip = getClientIp(request)
    const { limited, retryAfterSecs } = isRateLimited(ip)
    if (limited) {
      return NextResponse.json(
        { success: false, error: `Too many login attempts. Try again in ${Math.ceil(retryAfterSecs / 60)} minutes.` },
        { status: 429, headers: { "Retry-After": String(retryAfterSecs) } },
      )
    }

    const body = await request.json()
    const { username, password } = body

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      clearFailures(ip)

      const cookieStore = await cookies()
      cookieStore.set(SESSION_COOKIE_NAME, SESSION_TOKEN, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      })

      return NextResponse.json({ success: true })
    }

    recordFailure(ip)
    return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Authentication failed" }, { status: 500 })
  }
}

export async function GET() {
  try {
    // If admin is not configured, no session can be valid
    if (!ADMIN_IS_CONFIGURED || !SESSION_TOKEN) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const cookieStore = await cookies()
    const session = cookieStore.get(SESSION_COOKIE_NAME)

    if (session?.value === SESSION_TOKEN) {
      return NextResponse.json({ authenticated: true })
    }

    return NextResponse.json({ authenticated: false }, { status: 401 })
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE_NAME)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Logout failed" }, { status: 500 })
  }
}
