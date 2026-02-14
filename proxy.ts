import { updateSession } from "@/lib/supabase/middleware"
import { type NextRequest, NextResponse } from "next/server"

// Must match lib/auth-config.ts — can't import it here (Node crypto unavailable in Edge)
const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-admin_session" : "admin_session"

// Cached HMAC token so we don't recompute on every request
let cachedToken: string | null = null
let cachedSecret: string | null = null

async function getAdminSessionToken(): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || ""

  if (cachedToken !== null && cachedSecret === secret) {
    return cachedToken
  }

  if (!secret) {
    cachedToken = ""
    cachedSecret = secret
    return ""
  }

  // Web Crypto HMAC-SHA256 – same output as Node's
  // createHmac("sha256", secret).update("pearlie_admin_session").digest("hex")
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("pearlie_admin_session"))
  cachedToken = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  cachedSecret = secret
  return cachedToken
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Admin route protection (server-side, before any HTML is sent) ──
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const password = process.env.ADMIN_PASSWORD || ""
    if (!password) {
      const url = request.nextUrl.clone()
      url.pathname = "/admin/login"
      return NextResponse.redirect(url)
    }

    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)
    const expectedToken = await getAdminSessionToken()

    if (!sessionCookie || !expectedToken || sessionCookie.value !== expectedToken) {
      const url = request.nextUrl.clone()
      url.pathname = "/admin/login"
      return NextResponse.redirect(url)
    }
  }

  // ── Supabase session refresh for clinic / patient routes ──
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
