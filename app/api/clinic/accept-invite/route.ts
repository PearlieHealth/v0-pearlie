import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = createAdminClient()
  
  try {
    const { token, password, email } = await request.json()

    if (!token || !password || !email) {
      return NextResponse.json({ error: "Token, email, and password are required" }, { status: 400 })
    }

    // 1. Get the invite
    const { data: invite, error: inviteError } = await supabase
      .from("clinic_invites")
      .select("*")
      .eq("token", token)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: "Invalid invitation token" }, { status: 404 })
    }

    if (invite.accepted_at) {
      return NextResponse.json({ error: "This invitation has already been used" }, { status: 400 })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "This invitation has expired" }, { status: 400 })
    }

    // 2. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
    })

    if (authError) {
      if (authError.message.includes("already been registered")) {
        return NextResponse.json({ error: "An account with this email already exists. Please log in instead." }, { status: 400 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id

    // 3. Link user to clinic (simple clinic_users table)
    const { error: linkError } = await supabase
      .from("clinic_users")
      .insert({
        user_id: userId,
        clinic_id: invite.clinic_id,
        role: "clinic_manager"
      })

    if (linkError) {
      // Rollback - delete auth user
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: "Failed to link user to clinic: " + linkError.message }, { status: 500 })
    }

    // 4. Mark invite as accepted
    await supabase
      .from("clinic_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("token", token)

    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
