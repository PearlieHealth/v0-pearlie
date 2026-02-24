import { updateSession } from "@/lib/supabase/middleware"
import { type NextRequest, NextResponse } from "next/server"

// Must match lib/auth-config.ts — can't import it here (Node crypto unavailable in Edge)
const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-admin_session" : "admin_session"

// Portal subdomain (e.g. "portal.pearlie.org"). When set, requests to this
// host are rewritten so that portal.pearlie.org/leads → /clinic/leads internally.
const PORTAL_DOMAIN = process.env.NEXT_PUBLIC_PORTAL_DOMAIN || ""

// Cached HMAC token so we don't recompute on every request
let cachedToken: string | null = null
let cachedSecret: string | null = null

async function getAdminSessionToken(): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET || ""
  const sessionEpoch = process.env.ADMIN_SESSION_EPOCH || "1"

  if (cachedToken !== null && cachedSecret === secret) {
    return cachedToken
  }

  if (!secret) {
    cachedToken = ""
    cachedSecret = secret
    return ""
  }

  // Web Crypto HMAC-SHA256 – same output as Node's
  // createHmac("sha256", secret).update("pearlie_admin_session_v" + epoch).digest("hex")
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`pearlie_admin_session_v${sessionEpoch}`))
  cachedToken = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  cachedSecret = secret
  return cachedToken
}

function isPortalHost(host: string): boolean {
  if (!PORTAL_DOMAIN) return false
  return host === PORTAL_DOMAIN || host.startsWith(`${PORTAL_DOMAIN}:`)
}

// Known clinic dashboard and auth segments (NOT public profile slugs/UUIDs)
const CLINIC_DASHBOARD_SEGMENTS = [
  "profile", "leads", "inbox", "appointments", "bookings",
  "insights", "settings", "team", "providers"
]
const CLINIC_AUTH_SEGMENTS = [
  "login", "demo", "accept-invite", "forgot-password", "reset-password", "set-password"
]
const ALL_CLINIC_SEGMENTS = [...CLINIC_DASHBOARD_SEGMENTS, ...CLINIC_AUTH_SEGMENTS]

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get("host") || ""

  // ── Portal subdomain handling ──
  if (isPortalHost(host)) {
    // If someone visits portal.pearlie.org/clinic/... redirect to strip the /clinic prefix
    // This catches links that still use the old /clinic/* format
    if (pathname === "/clinic" || pathname.startsWith("/clinic/")) {
      const cleanPath = pathname === "/clinic" ? "/" : (pathname.slice(7) || "/")
      const url = request.nextUrl.clone()
      url.pathname = cleanPath
      return NextResponse.redirect(url)
    }

    // Rewrite portal paths to /clinic/* internally so Next.js finds the right page
    // Skip paths that are NOT clinic routes (api, auth, _next, etc.)
    const skipPrefixes = ["/api/", "/_next/", "/auth/", "/admin"]
    const shouldRewrite = !skipPrefixes.some((p) => pathname.startsWith(p))

    if (shouldRewrite) {
      const url = request.nextUrl.clone()
      url.pathname = pathname === "/" ? "/clinic" : `/clinic${pathname}`
      return updateSession(request, url)
    }
  }

  // ── Main domain: redirect /clinic/* dashboard routes to portal subdomain ──
  if (PORTAL_DOMAIN && !isPortalHost(host)) {
    if (pathname === "/clinic" || pathname.startsWith("/clinic/")) {
      const segment = pathname.split("/")[2]

      // Only redirect known dashboard/auth segments and the root /clinic path
      const isKnownSegment = !segment || ALL_CLINIC_SEGMENTS.includes(segment)

      if (isKnownSegment) {
        const cleanPath = pathname === "/clinic" ? "/" : (pathname.slice(7) || "/")
        const url = request.nextUrl.clone()
        url.host = PORTAL_DOMAIN
        url.port = ""
        url.protocol = "https"
        url.pathname = cleanPath
        return NextResponse.redirect(url)
      }

      // Public clinic profiles (/clinic/[uuid-or-slug]) stay on the main domain
    }
  }

  // ── Admin route protection (server-side, before any HTML is sent) ──
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const isConfigured = !!(process.env.ADMIN_PASSWORD)
    if (!isConfigured) {
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

  // ── Affiliate referral tracking ──
  // Check for ?ref= parameter and set a 30-day attribution cookie
  const refCode = request.nextUrl.searchParams.get("ref")
  if (refCode && /^AFF-[a-z0-9]{5}$/i.test(refCode)) {
    const response = await updateSession(request)
    // Set 30-day attribution cookie (last-click attribution)
    response.cookies.set("perley_ref", refCode, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
      httpOnly: false,
      sameSite: "lax",
    })
    // Store UTM params if present
    const utmSource = request.nextUrl.searchParams.get("utm_source")
    const utmMedium = request.nextUrl.searchParams.get("utm_medium")
    const utmCampaign = request.nextUrl.searchParams.get("utm_campaign")
    if (utmSource || utmMedium || utmCampaign) {
      response.cookies.set("perley_ref_utm", JSON.stringify({
        source: utmSource || "",
        medium: utmMedium || "",
        campaign: utmCampaign || "",
      }), {
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
        httpOnly: false,
        sameSite: "lax",
      })
    }
    // Fire async referral tracking (don't block response)
    const trackUrl = new URL("/api/track-referral", request.nextUrl.origin)
    fetch(trackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referral_code: refCode,
        landing_page: pathname,
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
      }),
    }).catch(() => {})
    return response
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
