import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && user) {
      // Check if this user has an affiliate record
      const admin = createAdminClient()
      const { data: affiliate } = await admin
        .from("affiliates")
        .select("id, user_id")
        .eq("email", user.email!)
        .single()

      if (affiliate) {
        // Link the affiliate to this auth user if not already linked
        if (!affiliate.user_id) {
          await admin
            .from("affiliates")
            .update({ user_id: user.id })
            .eq("id", affiliate.id)
        }

        return NextResponse.redirect(`${origin}/affiliate/dashboard`)
      }

      // No affiliate record found — redirect to signup
      return NextResponse.redirect(`${origin}/affiliates?error=no_account`)
    }
  }

  // Auth failed
  return NextResponse.redirect(`${origin}/affiliate/login?error=auth_failed`)
}
