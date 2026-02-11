import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_COOKIE_NAME, SESSION_TOKEN } from "@/lib/auth-config"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body
    
    console.log("[v0] Admin login attempt:", { username, passwordLength: password?.length, expectedUser: ADMIN_USERNAME })

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      console.log("[v0] Login successful")
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

    console.log("[v0] Login failed - credentials mismatch")
    return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Authentication failed" }, { status: 500 })
  }
}

export async function GET() {
  try {
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
