import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { SESSION_COOKIE_NAME, SESSION_TOKEN } from "./auth-config"

export type AuthResult = 
  | { authenticated: true }
  | { authenticated: false; response: NextResponse }

/**
 * Verify admin authentication for API routes
 * Returns authenticated: true if valid, or a 401 response if not
 * 
 * Usage in API route:
 * ```
 * const auth = await verifyAdminAuth()
 * if (!auth.authenticated) return auth.response
 * // ... rest of handler
 * ```
 */
export async function verifyAdminAuth(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

    if (!sessionCookie || sessionCookie.value !== SESSION_TOKEN) {
      return {
        authenticated: false,
        response: NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      }
    }

    return { authenticated: true }
  } catch (error) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      )
    }
  }
}

/**
 * Simple boolean check for admin auth (for layouts/pages)
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
    return sessionCookie?.value === SESSION_TOKEN
  } catch {
    return false
  }
}
