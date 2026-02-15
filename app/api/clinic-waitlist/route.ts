import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { Resend } from "resend"
import { escapeHtml } from "@/lib/escape-html"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      clinicName,
      ownerName,
      email,
      phone,
      website,
      address,
      city,
      postcode,
      postcodes,
      treatmentsOffered,
      facilities,
      capacity,
      preferredStartDate,
      additionalInfo,
      // Google Places data
      googlePlaceId,
      latitude,
      longitude,
      googleRating,
      googleReviewCount,
    } = body

    // Validate required fields
    if (!clinicName || !ownerName || !email) {
      return NextResponse.json(
        { error: "Missing required fields: clinicName, ownerName, email" },
        { status: 400 },
      )
    }

    // Check if email already exists in waitlist
    const { data: existing } = await supabase
      .from("clinic_waitlist")
      .select("id, status")
      .eq("email", email.toLowerCase().trim())
      .single()

    if (existing) {
      return NextResponse.json(
        {
          error: "This email is already on our waitlist",
          status: existing.status,
          alreadyExists: true,
        },
        { status: 409 },
      )
    }

    // Insert new waitlist entry
    const { data, error } = await supabase
      .from("clinic_waitlist")
      .insert({
        clinic_name: clinicName.trim(),
        owner_name: ownerName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        website: website?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
        postcode: postcode?.trim() || null,
        postcodes: postcodes?.map((p: string) => p.toUpperCase().trim()) || [],
        treatments_offered: treatmentsOffered || [],
        facilities: facilities || [],
        capacity: capacity || null,
        preferred_start_date: preferredStartDate || null,
        additional_info: additionalInfo?.trim() || null,
        google_place_id: googlePlaceId || null,
        latitude: latitude || null,
        longitude: longitude || null,
        google_rating: googleRating || null,
        google_review_count: googleReviewCount || null,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("Error inserting clinic waitlist:", error)
      return NextResponse.json({ error: "Failed to submit application" }, { status: 500 })
    }

    // Send confirmation email on submission
    try {
      await resend.emails.send({
        from: "Pearlie <clinics@pearlie.org>",
        to: email.toLowerCase().trim(),
        subject: "We received your application",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a1a;">Application Received</h1>
            <p>Hi ${escapeHtml(ownerName.trim())},</p>
            <p>Thank you for applying to join Pearlie with <strong>${escapeHtml(clinicName.trim())}</strong>.</p>
            <p>We're reviewing applications for our founding clinic cohort and will be in touch soon with next steps.</p>
            <p>What happens next:</p>
            <ul>
              <li>We review your application (typically 2-3 business days)</li>
              <li>If approved, you'll receive setup instructions</li>
              <li>Complete your clinic profile and start receiving matched patients</li>
            </ul>
            <p style="margin-top: 24px; color: #666; font-size: 14px;">
              Questions? Reply to this email and we'll get back to you.
            </p>
            <p style="color: #666; font-size: 14px;">— The Pearlie Team</p>
          </div>
        `,
      })
    } catch (emailError) {
      console.error("Error sending confirmation email:", emailError)
      // Don't fail submission if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully",
      id: data.id,
    })
  } catch (error) {
    console.error("Clinic waitlist error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email parameter required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("clinic_waitlist")
      .select("id, clinic_name, status, created_at")
      .eq("email", email.toLowerCase().trim())
      .single()

    if (error || !data) {
      return NextResponse.json({ found: false })
    }

    return NextResponse.json({
      found: true,
      status: data.status,
      clinicName: data.clinic_name,
      submittedAt: data.created_at,
    })
  } catch (error) {
    console.error("Clinic waitlist check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
