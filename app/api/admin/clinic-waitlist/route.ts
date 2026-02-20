import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { STARTER_TAGS } from "@/lib/matching/tag-validation"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { escapeHtml } from "@/lib/escape-html"
import { generateInviteEmailHTML } from "@/lib/email-templates"
import { sendEmailWithRetry } from "@/lib/email-send"
import { EMAIL_FROM } from "@/lib/email-config"
import crypto from "crypto"

export async function GET() {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = await createClient()

    const { data: entries, error } = await supabase
      .from("clinic_waitlist")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching clinic waitlist:", error)
      return NextResponse.json({ error: "Failed to fetch waitlist" }, { status: 500 })
    }

    return NextResponse.json({ entries })
  } catch (error) {
    console.error("Clinic waitlist error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = await createClient()
    const body = await request.json()

    const { id, action, adminNotes } = body

    if (!id || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    // Get the waitlist entry first
    const { data: entry, error: fetchError } = await supabase.from("clinic_waitlist").select("*").eq("id", id).single()

    if (fetchError || !entry) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {
      status: action === "approve" ? "approved" : "rejected",
      admin_notes:
        adminNotes ||
        entry.admin_notes ||
        `${action === "approve" ? "Approved" : "Rejected"} at ${new Date().toISOString()}`,
    }

    if (action === "approve") {
      updateData.approved_at = new Date().toISOString()

      // Step 4: Create clinic record on approval
      const { data: existingClinic } = await supabase.from("clinics").select("id").eq("email", entry.email).single()

      let clinicId: string

      if (!existingClinic) {
        // Create new clinic
        const { data: newClinic, error: createError } = await supabase
          .from("clinics")
          .insert({
            name: entry.clinic_name,
            email: entry.email,
            notification_email: entry.email,
            phone: entry.phone || "",
            postcode: entry.postcodes?.[0] || "",
            city: "",
            address: "",
            description: "",
            treatments: entry.treatments_offered || [],
            price_range: "mid",
            opening_hours: "",
            is_archived: false,
            is_live: false, // Step 2: New clinics start as NOT live
          })
          .select("id")
          .single()

        if (createError) {
          console.error("Error creating clinic:", createError)
          return NextResponse.json({ error: "Failed to create clinic" }, { status: 500 })
        }

        clinicId = newClinic.id

        // Add starter tags so clinic is WEAK not NOT_MATCHABLE
        const starterSelections = STARTER_TAGS.map((tag) => ({
          clinic_id: clinicId,
          filter_key: tag,
        }))

        await supabase.from("clinic_filter_selections").upsert(starterSelections, {
          onConflict: "clinic_id,filter_key",
        })
      } else {
        clinicId = existingClinic.id
      }

      // Link clinic ID to waitlist entry
      updateData.clinic_id = clinicId

      // Generate invite token for the clinic owner
      const inviteToken = crypto.randomBytes(32).toString("hex")
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

      await supabase.from("clinic_invites").insert({
        clinic_id: clinicId,
        email: entry.email.toLowerCase(),
        token: inviteToken,
        role: "CLINIC_ADMIN",
        expires_at: expiresAt.toISOString(),
      })

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"
      const inviteUrl = `${baseUrl}/clinic/accept-invite?token=${inviteToken}`

      const emailLogId = crypto.randomUUID()
      await supabase.from("waitlist_email_log").insert({
        id: emailLogId,
        waitlist_id: id,
        email_type: "approval",
        to_email: entry.email,
        status: "pending",
      })

      // Step 5: Send branded invite email
      try {
        const emailResult = await sendEmailWithRetry({
          from: EMAIL_FROM.CLINICS,
          to: entry.email,
          subject: `You're invited to join ${entry.clinic_name} on Pearlie`,
          html: generateInviteEmailHTML({
            clinicName: entry.clinic_name,
            contactName: entry.owner_name,
            inviteUrl,
            expiresAt,
          }),
        })

        await supabase
          .from("waitlist_email_log")
          .update({
            status: "sent",
            provider_message_id: emailResult?.messageId,
          })
          .eq("id", emailLogId)
      } catch (emailError) {
        console.error("Error sending approval email:", emailError)
        await supabase
          .from("waitlist_email_log")
          .update({
            status: "failed",
            error: emailError instanceof Error ? emailError.message : "Unknown error",
          })
          .eq("id", emailLogId)
      }
    } else {
      updateData.rejected_at = new Date().toISOString()

      const emailLogId = crypto.randomUUID()
      await supabase.from("waitlist_email_log").insert({
        id: emailLogId,
        waitlist_id: id,
        email_type: "rejection",
        to_email: entry.email,
        status: "pending",
      })

      // Step 5: Send rejection email
      try {
        const emailResult = await sendEmailWithRetry({
          from: EMAIL_FROM.CLINICS,
          to: entry.email,
          subject: "Your Pearlie application",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #1a1a1a;">Thank you for applying</h1>
              <p>Hi ${escapeHtml(entry.owner_name)},</p>
              <p>Thank you for your interest in joining Pearlie with ${escapeHtml(entry.clinic_name)}.</p>
              <p>Unfortunately, we're unable to include your clinic in this cohort. This may be due to:</p>
              <ul>
                <li>Geographic coverage priorities for this phase</li>
                <li>Treatment specialization focus</li>
                <li>Capacity constraints in your area</li>
              </ul>
              <p>We're continuously expanding and would love to reconsider your application in the future. 
                 We'll keep your details on file and reach out when we open up more spots.</p>
              <p style="margin-top: 24px; color: #666; font-size: 14px;">
                Best regards,<br/>The Pearlie Team
              </p>
            </div>
          `,
        })

        await supabase
          .from("waitlist_email_log")
          .update({
            status: "sent",
            provider_message_id: emailResult?.messageId,
          })
          .eq("id", emailLogId)
      } catch (emailError) {
        console.error("Error sending rejection email:", emailError)
        await supabase
          .from("waitlist_email_log")
          .update({
            status: "failed",
            error: emailError instanceof Error ? emailError.message : "Unknown error",
          })
          .eq("id", emailLogId)
      }
    }

    const { error } = await supabase.from("clinic_waitlist").update(updateData).eq("id", id)

    if (error) {
      console.error("Error updating clinic waitlist:", error)
      return NextResponse.json({ error: "Failed to update application" }, { status: 500 })
    }

    return NextResponse.json({ success: true, clinicId: updateData.clinic_id })
  } catch (error) {
    console.error("Clinic waitlist update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
