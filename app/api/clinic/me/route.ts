import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { headers } from "next/headers"

export async function GET() {
  try {
    // 1. Try cookie-based auth first, fall back to Authorization header
    let user = null
    
    const supabase = await createClient()
    const { data: { user: cookieUser } } = await supabase.auth.getUser()
    user = cookieUser

    if (!user) {
      // Fall back to Authorization header (sent by ClinicShell)
      const headersList = await headers()
      const authHeader = headersList.get("authorization")
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "")
        const supabaseWithToken = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { cookies: { getAll: () => [], setAll: () => {} } },
        )
        const { data: { user: tokenUser } } = await supabaseWithToken.auth.getUser(token)
        user = tokenUser
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 })
    }

    // 2. Get clinic user data using admin client to bypass RLS
    const supabaseAdmin = createAdminClient()
    const { data: clinicUser, error: clinicError } = await supabaseAdmin
      .from("clinic_users")
      .select("user_id, role, clinic_id, clinics(id, name)")
      .eq("user_id", user.id)
      .single()

    if (clinicError || !clinicUser) {
      return NextResponse.json({ error: "No clinic account found" }, { status: 404 })
    }

    const clinic = clinicUser.clinics as { id: string; name: string }

    // 3. Return data
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: clinicUser.role,
      },
      clinic,
      newLeadsCount: 0,
    })

  } catch (error) {
    console.error("Clinic me error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
