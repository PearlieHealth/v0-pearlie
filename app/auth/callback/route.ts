import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const nextParam = searchParams.get("next") ?? "/clinic"
  const error = searchParams.get("error")

  // Prevent open redirect — only allow relative paths to known app routes
  const ALLOWED_PREFIXES = ["/clinic", "/intake", "/patient", "/match", "/admin", "/booking"]
  const next = (nextParam.startsWith("/") && !nextParam.startsWith("//") && ALLOWED_PREFIXES.some(p => nextParam.startsWith(p)))
    ? nextParam
    : "/clinic"
  const errorDescription = searchParams.get("error_description")

  // Determine error redirect based on the flow
  const isPatientFlow = next.startsWith("/intake") || next.startsWith("/patient") || next.startsWith("/match")
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
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error("[Auth Callback] Code exchange error:", exchangeError)
  }

  // Return to appropriate page with error
  return NextResponse.redirect(errorRedirect)
}
