import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Refresh the Supabase session and protect clinic / patient routes.
 *
 * @param request  The incoming request
 * @param rewriteUrl  Optional NextURL — when provided the response is a
 *                    rewrite to this URL instead of a plain next(). Used by
 *                    the portal subdomain middleware to map clean paths
 *                    (e.g. /leads) to /clinic/leads internally.
 */
export async function updateSession(request: NextRequest, rewriteUrl?: URL) {
  // Use the rewrite URL (portal subdomain) to resolve the internal pathname
  // while still forwarding the original request unchanged.
  const internalPathname = rewriteUrl?.pathname ?? request.nextUrl.pathname

  let supabaseResponse = rewriteUrl
    ? NextResponse.rewrite(rewriteUrl, { request })
    : NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = rewriteUrl
            ? NextResponse.rewrite(rewriteUrl, { request })
            : NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: Do not run code between createServerClient and supabase.auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect clinic dashboard routes only -- public clinic profile pages must pass through
  // Known dashboard/auth segments that require authentication
  const DASHBOARD_SEGMENTS = [
    "profile", "leads", "inbox", "appointments", "bookings",
    "insights", "settings", "team", "providers"
  ]
  const AUTH_SEGMENTS = ["login", "demo", "accept-invite", "forgot-password", "reset-password", "set-password"]

  const isUnderClinic = internalPathname.startsWith("/clinic/") || internalPathname === "/clinic"
  const isPublicClinicsRoute = internalPathname.startsWith("/clinics") // Public clinic profiles with 's'

  if (isUnderClinic && !isPublicClinicsRoute) {
    const segment = internalPathname.split("/")[2] // e.g. "/clinic/leads" -> "leads"
    const isAuthPage = segment && AUTH_SEGMENTS.includes(segment)
    const isDashboardPage = !segment || DASHBOARD_SEGMENTS.includes(segment)

    // Only protect dashboard pages -- redirect unauthenticated users to login
    if (isDashboardPage && !user) {
      const url = request.nextUrl.clone()
      url.pathname = rewriteUrl ? "/login" : "/clinic/login"
      return NextResponse.redirect(url)
    }
  }

  // If logged in user tries to access login page, redirect to dashboard
  // (but not if they still need to set their password)
  if (internalPathname === "/clinic/login" && user) {
    const mustChangePassword = user.user_metadata?.must_change_password
    const url = request.nextUrl.clone()
    if (rewriteUrl) {
      url.pathname = mustChangePassword ? "/set-password" : "/"
    } else {
      url.pathname = mustChangePassword ? "/clinic/set-password" : "/clinic"
    }
    return NextResponse.redirect(url)
  }

  // Protect all patient routes (except login)
  const isPatientProtected = internalPathname.startsWith("/patient/") &&
    !internalPathname.startsWith("/patient/login")
  if (isPatientProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/patient/login"
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  // If logged-in patient tries to access patient login, redirect to dashboard
  // Only redirect if the user is NOT a clinic user (handles legacy patients with no role)
  if (internalPathname === "/patient/login" && user) {
    const userRole = user.user_metadata?.role
    if (userRole !== "clinic") {
      const url = request.nextUrl.clone()
      url.pathname = "/patient/dashboard"
      return NextResponse.redirect(url)
    }
    // Clinic users stay on patient login (they can sign in with a different account)
  }

  return supabaseResponse
}
