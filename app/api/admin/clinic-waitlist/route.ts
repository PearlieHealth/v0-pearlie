import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { Resend } from "resend"
import { STARTER_TAGS } from "@/lib/matching/tag-validation"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { escapeHtml } from "@/lib/escape-html"

const resend = new Resend(process.env.RESEND_API_KEY)

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

      const emailLogId = crypto.randomUUID()
      await supabase.from("waitlist_email_log").insert({
        id: emailLogId,
        waitlist_id: id,
        email_type: "approval",
        to_email: entry.email,
        status: "pending",
      })

      // Step 5: Send approval email
      try {
        const emailResult = await resend.emails.send({
          from: "Pearlie <clinics@pearlie.org>",
          to: entry.email,
          subject: "You're in — complete your clinic profile",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #1a1a1a;">Welcome to Pearlie</h1>
              <p>Hi ${escapeHtml(entry.owner_name)},</p>
              <p>Great news — <strong>${escapeHtml(entry.clinic_name)}</strong> has been approved for early access to Pearlie.</p>
              <p>You're now part of our founding clinic cohort. This means:</p>
              <ul>
                <li>Priority placement in patient matches</li>
                <li>Shape the matching algorithm with your feedback</li>
                <li>Lock in founding partner pricing</li>
              </ul>
              <p><strong>Next step:</strong> Complete your clinic profile to start receiving matched patients.</p>
              <p style="margin-top: 24px;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://pearlie.org"}/admin/clinics" 
                   style="background: #1a1a1a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                  Complete Clinic Profile
                </a>
              </p>
              <p style="margin-top: 24px; color: #666; font-size: 14px;">
                Questions? Reply to this email and we'll help you get set up.
              </p>
              <p style="color: #666; font-size: 14px;">— The Pearlie Team</p>
            </div>
          `,
        })

        await supabase
          .from("waitlist_email_log")
          .update({
            status: "sent",
            provider_message_id: emailResult?.data?.id,
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
        const emailResult = await resend.emails.send({
          from: "Pearlie <clinics@pearlie.org>",
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
            provider_message_id: emailResult?.data?.id,
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
