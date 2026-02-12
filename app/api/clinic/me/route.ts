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
