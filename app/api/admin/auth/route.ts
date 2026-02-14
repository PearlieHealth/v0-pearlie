import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_IS_CONFIGURED, SESSION_COOKIE_NAME, SESSION_TOKEN } from "@/lib/auth-config"

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

    const body = await request.json()
    const { username, password } = body

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
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
