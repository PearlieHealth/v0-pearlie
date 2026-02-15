import { cookies, headers } from "next/headers"
import { NextResponse } from "next/server"
import { SESSION_COOKIE_NAME, SESSION_TOKEN } from "./auth-config"

export type AuthResult =
  | { authenticated: true }
  | { authenticated: false; response: NextResponse }

/**
 * Verify that the request Origin matches the Host header.
 * Blocks cross-origin POST/PUT/PATCH/DELETE from forged forms or scripts.
 */
async function verifyCsrfOrigin(): Promise<boolean> {
  const hdrs = await headers()
  const origin = hdrs.get("origin")

  // GET / HEAD requests don't need Origin checks
  // If no Origin header (e.g. same-origin navigations), allow — SameSite cookie handles the rest
  if (!origin) return true

  const host = hdrs.get("host")
  if (!host) return false

  try {
    const originHost = new URL(origin).host
    return originHost === host
  } catch {
    return false
  }
}

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
    // CSRF: reject cross-origin requests
    if (!(await verifyCsrfOrigin())) {
      return {
        authenticated: false,
        response: NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        )
      }
    }

    // If SESSION_TOKEN is empty (no password/secret configured), always reject
    if (!SESSION_TOKEN) {
      return {
        authenticated: false,
        response: NextResponse.json(
          { error: "Admin not configured" },
          { status: 401 }
        )
      }
    }

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
    if (!SESSION_TOKEN) return false
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
    return sessionCookie?.value === SESSION_TOKEN
  } catch {
    return false
  }
}
