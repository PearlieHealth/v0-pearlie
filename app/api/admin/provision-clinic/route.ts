import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"
import crypto from "crypto"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"

export async function POST(request: Request) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const body = await request.json()
    const { 
      clinicName, 
      primaryContactEmail, 
      corporateId, 
      corporateName,
      address,
      phone,
      website 
    } = body

    if (!clinicName || !primaryContactEmail) {
      return NextResponse.json(
        { error: "Clinic name and primary contact email are required" },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()
    
    // Generate a temporary password for the user
    const tempPassword = `Pearlie${crypto.randomUUID().slice(0, 8)}!`

    // Generate a secure invite token
    const inviteToken = crypto.randomBytes(32).toString("hex")

    // 1. Create the clinic
    const { data: clinic, error: clinicError } = await supabaseAdmin
      .from("clinics")
      .insert({
        name: clinicName,
        address: address || null,
        phone: phone || null,
        website: website || null,
        corporate_id: corporateId || null,
        is_active: true,
      })
      .select()
      .single()

    if (clinicError) {
      // Log failed provisioning
      await supabaseAdmin.from("provisioning_logs").insert({
        clinic_name: clinicName,
        corporate_id: corporateId || null,
        corporate_name: corporateName || null,
        primary_contact_email: primaryContactEmail,
        status: "FAILED",
        error_message: clinicError.message,
      })

      throw clinicError
    }

    // 2. Create Supabase Auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: primaryContactEmail.toLowerCase(),
      password: tempPassword,
      email_confirm: true, // Auto-confirm since admin is inviting them
    })

    if (authError && !authError.message.includes("already registered")) {
      console.error("Auth user creation error:", authError)
      throw authError
    }

    // Get user ID (either from new user or existing)
    let userId = authUser?.user?.id
    
    if (!userId) {
      // User might already exist, try to find them
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      const existingUser = existingUsers?.users.find(
        u => u.email?.toLowerCase() === primaryContactEmail.toLowerCase()
      )
      userId = existingUser?.id
    }

    // 3. Create clinic_users row to link auth user to clinic
    if (userId) {
      const { error: clinicUserError } = await supabaseAdmin
        .from("clinic_users")
        .upsert({
          user_id: userId,
          clinic_id: clinic.id,
          role: "clinic_admin",
        }, {
          onConflict: "user_id,clinic_id"
        })

      if (clinicUserError) {
        console.error("Clinic user creation error:", clinicUserError)
        // Don't throw - clinic was created, user can be added later
      }
    }

    // 4. Create invite in clinic_invites table
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    await supabaseAdmin.from("clinic_invites").insert({
      clinic_id: clinic.id,
      email: primaryContactEmail.toLowerCase(),
      token: inviteToken,
      role: "CLINIC_ADMIN",
      expires_at: expiresAt.toISOString(),
    })

    // 5. Update clinic with notification email
    await supabaseAdmin
      .from("clinics")
      .update({ notification_email: primaryContactEmail })
      .eq("id", clinic.id)

    // 6. Log successful provisioning
    await supabaseAdmin.from("provisioning_logs").insert({
      clinic_id: clinic.id,
      clinic_name: clinicName,
      corporate_id: corporateId || null,
      corporate_name: corporateName || null,
      primary_contact_email: primaryContactEmail,
      status: "SUCCESS",
      invite_token: inviteToken,
    })

    // 7. Send branded invite email (portal-aware)
    const portalDomain = process.env.NEXT_PUBLIC_PORTAL_DOMAIN
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"
    const inviteUrl = portalDomain
      ? `https://${portalDomain}/accept-invite?token=${inviteToken}`
      : `${baseUrl}/clinic/accept-invite?token=${inviteToken}`

    let emailSent = false
    try {
      const result = await sendRegisteredEmail({
        type: EMAIL_TYPE.CLINIC_PROVISION_INVITE,
        to: primaryContactEmail,
        data: { clinicName, inviteUrl, expiresAt, _clinicId: clinic.id, _email: primaryContactEmail },
        clinicId: clinic.id,
      })
      emailSent = result.success && !result.skipped
      if (!result.success && !result.skipped) {
        console.error("[provision-clinic] Failed to send invite email:", result.error)
      }
    } catch (emailErr) {
      console.error("[provision-clinic] Email sending error:", emailErr)
    }

    return NextResponse.json({
      success: true,
      clinicId: clinic.id,
      inviteUrl,
      emailSent,
      message: emailSent
        ? `Clinic provisioned successfully. Invite sent to ${primaryContactEmail}.`
        : `Clinic provisioned. Email could not be sent - share the invite link manually.`,
    })
  } catch (error) {
    console.error("Provisioning error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to provision clinic" },
      { status: 500 }
    )
  }
}

// GET provisioning logs
export async function GET() {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabaseAdmin = createAdminClient()

    const { data: logs, error } = await supabaseAdmin
      .from("provisioning_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) throw error

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("Error fetching provisioning logs:", error)
    return NextResponse.json(
      { error: "Failed to fetch provisioning logs" },
      { status: 500 }
    )
  }
}
