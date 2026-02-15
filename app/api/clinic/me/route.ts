import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/supabase/get-clinic-user"

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 })
    }

    // 2. Get clinic user data using admin client to bypass RLS
    const supabaseAdmin = createAdminClient()
    const { data: clinicUser, error: clinicError } = await supabaseAdmin
      .from("clinic_users")
      .select("user_id, role, clinic_id")
      .eq("user_id", user.id)
      .single()

    if (clinicError || !clinicUser) {
      console.error("[clinic/me] clinic_users lookup failed:", clinicError?.message)
      return NextResponse.json({ error: "No clinic account found" }, { status: 404 })
    }

    // 3. Fetch clinic details separately (avoids FK join dependency)
    const { data: clinic, error: clinicDetailError } = await supabaseAdmin
      .from("clinics")
      .select("id, name")
      .eq("id", clinicUser.clinic_id)
      .single()

    if (clinicDetailError || !clinic) {
      console.error("[clinic/me] clinic lookup failed:", clinicDetailError?.message)
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
    }

    // 4. Return data
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
