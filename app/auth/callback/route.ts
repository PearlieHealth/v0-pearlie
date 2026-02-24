import { createClient } from "@/lib/supabase/server"
import { isPortalHost } from "@/lib/clinic-url"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin, hostname } = new URL(request.url)
  const code = searchParams.get("code")
  const nextParam = searchParams.get("next")
  const error = searchParams.get("error")
  const onPortal = isPortalHost(hostname)

  // Prevent open redirect — only allow relative paths to known app routes
  const ALLOWED_PREFIXES = ["/clinic", "/intake", "/patient", "/match", "/admin", "/booking"]
  const sanitizedNext = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") && ALLOWED_PREFIXES.some(p => nextParam.startsWith(p))
    ? nextParam
    : null
  const errorDescription = searchParams.get("error_description")

  // Determine error redirect based on the flow
  const isPatientFlow = sanitizedNext ? (sanitizedNext.startsWith("/intake") || sanitizedNext.startsWith("/patient") || sanitizedNext.startsWith("/match") || sanitizedNext.startsWith("/booking")) : !onPortal
  const clinicLoginPath = onPortal ? "/login" : "/clinic/login"
  const errorParam = encodeURIComponent(errorDescription || error || "auth_failed")
  const errorRedirect = isPatientFlow
    ? sanitizedNext
      ? `${origin}/patient/login?error=${errorParam}&next=${encodeURIComponent(sanitizedNext)}`
      : `${origin}/patient/login?error=${errorParam}`
    : `${origin}${clinicLoginPath}?error=${errorParam}`

  // Handle errors from Supabase
  if (error) {
    console.error("[Auth Callback] Error:", error, errorDescription)
    return NextResponse.redirect(errorRedirect)
  }

  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeError) {
      // If an explicit next parameter was provided and valid, use it
      if (sanitizedNext) {
        return NextResponse.redirect(`${origin}${sanitizedNext}`)
      }

      // Otherwise, determine redirect based on user role
      const { data: { user } } = await supabase.auth.getUser()
      const userRole = user?.user_metadata?.role
      const defaultRedirect = userRole === "clinic"
        ? "/"
        : "/patient/dashboard"
      return NextResponse.redirect(`${origin}${defaultRedirect}`)
    }

    console.error("[Auth Callback] Code exchange error:", exchangeError)
  }

  // Return to appropriate page with error
  return NextResponse.redirect(errorRedirect)
}
