import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { generateInviteEmailHTML } from "@/lib/email-templates"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { sendEmailWithRetry } from "@/lib/email-send"
import { EMAIL_FROM } from "@/lib/email-config"

/**
 * Clinic Provisioning API
 * 
 * When admin adds a clinic, this API:
 * 1. Creates invite token
 * 2. Stores invite in clinic_invites table
 * 3. Optionally assigns to corporate group
 * 4. Returns invite link for the clinic owner
 */

interface ProvisionClinicRequest {
  clinic_id: string
  clinic_name: string
  primary_contact_email: string
  primary_contact_name?: string
  role?: "CLINIC_ADMIN" | "CLINIC_USER"
  corporate_id?: string // If part of a corporate group
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const body: ProvisionClinicRequest = await request.json()
    const { 
      clinic_id, 
      clinic_name, 
      primary_contact_email, 
      primary_contact_name,
      role = "CLINIC_ADMIN",
      corporate_id 
    } = body

    if (!clinic_id || !clinic_name || !primary_contact_email) {
      return NextResponse.json(
        { error: "clinic_id, clinic_name, and primary_contact_email are required" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Generate secure invite token
    const inviteToken = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // Check if invite already exists for this clinic/email combo
    const { data: existingInvite } = await supabase
      .from("clinic_invites")
      .select("id")
      .eq("clinic_id", clinic_id)
      .eq("email", primary_contact_email)
      .is("accepted_at", null)
      .single()

    if (existingInvite) {
      // Update existing invite with new token
      const { error: updateError } = await supabase
        .from("clinic_invites")
        .update({
          token: inviteToken,
          expires_at: expiresAt.toISOString(),
          role,
          corporate_id: corporate_id || null,
        })
        .eq("id", existingInvite.id)

      if (updateError) {
        console.error("[v0] Error updating invite:", updateError)
        return NextResponse.json({ error: "Failed to update invite" }, { status: 500 })
      }
    } else {
      // Create new invite
      const { error: insertError } = await supabase
        .from("clinic_invites")
        .insert({
          clinic_id,
          email: primary_contact_email,
          token: inviteToken,
          role,
          corporate_id: corporate_id || null,
          expires_at: expiresAt.toISOString()
        })

      if (insertError) {
        console.error("[v0] Error creating invite:", insertError)
        return NextResponse.json({ error: "Failed to create invite" }, { status: 500 })
      }
    }

    // Update clinic with notification email if not set
    await supabase
      .from("clinics")
      .update({ 
        notification_email: primary_contact_email,
        corporate_id: corporate_id || null,
      })
      .eq("id", clinic_id)

    // Log provisioning action (optional - don't fail if this fails)
    try {
      await supabase.from("provisioning_logs").insert({
        clinic_id,
        clinic_name,
        primary_contact_email,
        corporate_id: corporate_id || null,
        invite_token: inviteToken,
        status: "INVITE_CREATED",
      })
    } catch (logError) {
      console.error("[v0] Failed to log provisioning (non-critical):", logError)
    }
    
    console.log("[v0] Invite created successfully for", primary_contact_email)

    // Build invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"
    const inviteUrl = `${baseUrl}/clinic/accept-invite?token=${inviteToken}`

    // Send invite email
    let emailSent = false
    try {
      const result = await sendEmailWithRetry({
        from: EMAIL_FROM.CLINICS,
        to: primary_contact_email,
        subject: `You're invited to join ${clinic_name} on Pearlie`,
        html: generateInviteEmailHTML({
          clinicName: clinic_name,
          contactName: primary_contact_name,
          inviteUrl,
          expiresAt,
        }),
      })

      if (!result.success) {
        console.error("[v0] Failed to send invite email:", result.error)
      } else {
        emailSent = true
      }
    } catch (emailErr) {
      console.error("[v0] Email sending error:", emailErr)
    }

    return NextResponse.json({
      success: true,
      invite_url: inviteUrl,
      expires_at: expiresAt.toISOString(),
      email_sent: emailSent,
      message: emailSent 
        ? `Invite sent to ${primary_contact_email}` 
        : `Invite created for ${primary_contact_email}. Email could not be sent - share the link manually.`,
    })
  } catch (error) {
    console.error("[v0] Clinic provisioning error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET endpoint to list pending invites
export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const clinicId = searchParams.get("clinic_id")

    const supabase = createAdminClient()

    let query = supabase
      .from("clinic_invites")
      .select(`
        *,
        clinics(id, name)
      `)
      .is("accepted_at", null)
      .order("created_at", { ascending: false })

    if (clinicId) {
      query = query.eq("clinic_id", clinicId)
    }

    const { data: invites, error } = await query

    if (error) {
      console.error("[v0] Error fetching invites:", error)
      return NextResponse.json({ error: "Failed to fetch invites" }, { status: 500 })
    }

    return NextResponse.json({ invites })
  } catch (error) {
    console.error("[v0] Fetch invites error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
