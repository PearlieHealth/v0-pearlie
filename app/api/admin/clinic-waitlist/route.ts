import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { STARTER_TAGS } from "@/lib/matching/tag-validation"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"
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
            is_live: true, // Clinics start live (visible in directory)
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

      const portalDomain = process.env.NEXT_PUBLIC_PORTAL_DOMAIN
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"
      const inviteUrl = portalDomain
        ? `https://${portalDomain}/accept-invite?token=${inviteToken}`
        : `${baseUrl}/clinic/accept-invite?token=${inviteToken}`

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
        const emailResult = await sendRegisteredEmail({
          type: EMAIL_TYPE.WAITLIST_APPROVAL,
          to: entry.email,
          data: {
            clinicName: entry.clinic_name,
            contactName: entry.owner_name,
            inviteUrl,
            expiresAt,
            _waitlistId: id,
            _email: entry.email,
          },
          clinicId,
          waitlistId: id,
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
        const emailResult = await sendRegisteredEmail({
          type: EMAIL_TYPE.WAITLIST_REJECTION,
          to: entry.email,
          data: {
            ownerName: entry.owner_name,
            clinicName: entry.clinic_name,
            _waitlistId: id,
            _email: entry.email,
          },
          waitlistId: id,
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
