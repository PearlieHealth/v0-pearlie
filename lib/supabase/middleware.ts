import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

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
          supabaseResponse = NextResponse.next({
            request,
          })
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

  const isUnderClinic = request.nextUrl.pathname.startsWith("/clinic/") || request.nextUrl.pathname === "/clinic"
  const isPublicClinicsRoute = request.nextUrl.pathname.startsWith("/clinics") // Public clinic profiles with 's'
  
  if (isUnderClinic && !isPublicClinicsRoute) {
    const segment = request.nextUrl.pathname.split("/")[2] // e.g. "/clinic/leads" -> "leads"
    const isAuthPage = segment && AUTH_SEGMENTS.includes(segment)
    const isDashboardPage = !segment || DASHBOARD_SEGMENTS.includes(segment)
    // Anything that's NOT a dashboard page and NOT an auth page is a public profile (UUID or slug)
    const isPublicProfilePage = segment && !isDashboardPage && !isAuthPage

    // Only protect dashboard pages -- redirect unauthenticated users to login
    if (isDashboardPage && !user) {
      const url = request.nextUrl.clone()
      url.pathname = "/clinic/login"
      return NextResponse.redirect(url)
    }
  }

  // If logged in user tries to access login page, redirect to dashboard
  // (but not if they still need to set their password)
  if (request.nextUrl.pathname === "/clinic/login" && user) {
    const mustChangePassword = user.user_metadata?.must_change_password
    const url = request.nextUrl.clone()
    url.pathname = mustChangePassword ? "/clinic/set-password" : "/clinic"
    return NextResponse.redirect(url)
  }

  // Protect patient dashboard routes
  const isPatientDashboard = request.nextUrl.pathname.startsWith("/patient/dashboard") || request.nextUrl.pathname.startsWith("/patient/messages")
  if (isPatientDashboard && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/patient/login"
    return NextResponse.redirect(url)
  }

  // If logged-in patient tries to access patient login, redirect to dashboard
  if (request.nextUrl.pathname === "/patient/login" && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/patient/dashboard"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
