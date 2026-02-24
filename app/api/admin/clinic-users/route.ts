import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAuth } from "@/lib/admin-auth"
import crypto from "crypto"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"

// Admin API to manage clinic user associations
// Uses service role key to bypass RLS

export async function GET() {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response
  
  try {
    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .from("clinic_users")
      .select(`
        user_id,
        clinic_id,
        role,
        created_at,
        clinics(id, name)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching clinic_users:", error)
      throw error
    }

    // Get user emails from Supabase Auth
    let emailMap = new Map<string, string | undefined>()
    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
      if (!authError && authUsers) {
        emailMap = new Map(authUsers.users.map(u => [u.id, u.email]))
      }
    } catch (authErr) {
      console.error("Auth admin error:", authErr)
    }

    // Transform data to include email and clinic name
    const users = (data || []).map(cu => ({
      user_id: cu.user_id,
      clinic_id: cu.clinic_id,
      email: emailMap.get(cu.user_id) || null,
      role: cu.role,
      created_at: cu.created_at,
      clinic_name: (cu.clinics as unknown as { name: string } | null)?.name || null,
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error fetching clinic users:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch clinic users" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  const supabase = createAdminClient()

  try {
    const { email, password, clinicId, role = "clinic_manager" } = await request.json()

    if (!email || !password || !clinicId) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, clinicId" },
        { status: 400 }
      )
    }

    // Look up clinic name for the invite email
    const { data: clinic } = await supabase
      .from("clinics")
      .select("name")
      .eq("id", clinicId)
      .single()

    const clinicName = clinic?.name || "your clinic"

    // First, check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users.find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    )

    let userId: string

    if (existingUser) {
      // User exists - update their password and link to clinic
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          password,
          user_metadata: { ...existingUser.user_metadata, must_change_password: true },
        }
      )

      if (updateError) {
        console.error("Error updating user password:", updateError)
        return NextResponse.json(
          { error: "Failed to update user password" },
          { status: 500 }
        )
      }

      // Link existing user to clinic
      const { error: linkError } = await supabase
        .from("clinic_users")
        .upsert({
          user_id: existingUser.id,
          clinic_id: clinicId,
          role,
        }, {
          onConflict: "user_id,clinic_id"
        })

      if (linkError) throw linkError

      userId = existingUser.id
    } else {
      // User doesn't exist - create new user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { must_change_password: true },
      })

      if (authError) {
        throw authError
      }

      // Link new user to clinic
      const { error: linkError } = await supabase
        .from("clinic_users")
        .insert({
          user_id: authData.user.id,
          clinic_id: clinicId,
          role,
        })

      if (linkError) throw linkError

      userId = authData.user.id
    }

    // Generate invite token and send branded invite email
    const inviteToken = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // Check if invite already exists for this clinic/email combo
    const { data: existingInvite } = await supabase
      .from("clinic_invites")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("email", email.toLowerCase())
      .is("accepted_at", null)
      .single()

    if (existingInvite) {
      await supabase
        .from("clinic_invites")
        .update({
          token: inviteToken,
          expires_at: expiresAt.toISOString(),
          role,
        })
        .eq("id", existingInvite.id)
    } else {
      await supabase
        .from("clinic_invites")
        .insert({
          clinic_id: clinicId,
          email: email.toLowerCase(),
          token: inviteToken,
          role,
          expires_at: expiresAt.toISOString(),
        })
    }

    // Send branded invite email (portal-aware)
    const portalDomain = process.env.NEXT_PUBLIC_PORTAL_DOMAIN
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"
    const inviteUrl = portalDomain
      ? `https://${portalDomain}/accept-invite?token=${inviteToken}`
      : `${baseUrl}/clinic/accept-invite?token=${inviteToken}`

    let emailSent = false
    try {
      const result = await sendRegisteredEmail({
        type: EMAIL_TYPE.CLINIC_INVITE,
        to: email.toLowerCase(),
        data: { clinicName, inviteUrl, expiresAt, _clinicId: clinicId, _email: email.toLowerCase() },
        clinicId,
      })
      emailSent = result.success && !result.skipped
      if (!result.success && !result.skipped) {
        console.error("[clinic-users] Failed to send invite email:", result.error)
      }
    } catch (emailErr) {
      console.error("[clinic-users] Email sending error:", emailErr)
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? `User created and invite sent to ${email}`
        : `User created. Email could not be sent - share the invite link manually.`,
      userId,
      inviteUrl,
      emailSent,
    })
  } catch (error) {
    console.error("Error creating clinic user:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create clinic user" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  const supabase = createAdminClient()
  
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    // Remove user from clinic (they can be re-added later)
    const { error } = await supabase
      .from("clinic_users")
      .delete()
      .eq("user_id", userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing clinic user:", error)
    return NextResponse.json(
      { error: "Failed to remove clinic user" },
      { status: 500 }
    )
  }
}
