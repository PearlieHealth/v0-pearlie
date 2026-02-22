import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const nextParam = searchParams.get("next")
  const error = searchParams.get("error")

  // Prevent open redirect — only allow relative paths to known app routes
  const ALLOWED_PREFIXES = ["/clinic", "/intake", "/patient", "/match", "/admin", "/booking"]
  const sanitizedNext = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") && ALLOWED_PREFIXES.some(p => nextParam.startsWith(p))
    ? nextParam
    : null
  const errorDescription = searchParams.get("error_description")

  // Determine error redirect based on the flow
  const isPatientFlow = sanitizedNext ? (sanitizedNext.startsWith("/intake") || sanitizedNext.startsWith("/patient") || sanitizedNext.startsWith("/match") || sanitizedNext.startsWith("/booking")) : true
  const errorRedirect = isPatientFlow
    ? `${origin}/intake?error=${encodeURIComponent(errorDescription || error || "auth_failed")}`
    : `${origin}/clinic/login?error=${encodeURIComponent(errorDescription || error || "auth_failed")}`

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
      const defaultRedirect = userRole === "clinic" ? "/clinic" : "/patient/dashboard"
      return NextResponse.redirect(`${origin}${defaultRedirect}`)
    }

    console.error("[Auth Callback] Code exchange error:", exchangeError)
  }

  // Return to appropriate page with error
  return NextResponse.redirect(errorRedirect)
}
