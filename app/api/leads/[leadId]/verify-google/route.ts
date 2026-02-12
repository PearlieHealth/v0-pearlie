import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request, { params }: { params: Promise<{ leadId: string }> }) {
  try {
    const { leadId } = await params

    if (!leadId) {
      return NextResponse.json({ error: "Lead ID is required" }, { status: 400 })
    }

    // Get the authenticated user from Supabase (set by OAuth callback)
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const googleEmail = user.email?.toLowerCase()
    if (!googleEmail) {
      return NextResponse.json({ error: "No email associated with Google account" }, { status: 400 })
    }

    // Fetch the lead
    const admin = createAdminClient()
    const { data: lead, error: leadError } = await admin
      .from("leads")
      .select("id, email, is_verified, user_id")
      .eq("id", leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Check if lead email matches Google email
    if (lead.email?.toLowerCase() !== googleEmail) {
      return NextResponse.json(
        { error: "Google email does not match the email used in your form. Please use the same email or verify via OTP." },
        { status: 403 }
      )
    }

    // Already verified
    if (lead.is_verified && lead.user_id) {
      return NextResponse.json({ verified: true, alreadyVerified: true })
    }

    // Mark lead as verified and link to Supabase user
    const { error: updateError } = await admin
      .from("leads")
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        verification_email: googleEmail,
        user_id: user.id,
      })
      .eq("id", leadId)

    if (updateError) {
      console.error("[verify-google] Error updating lead:", updateError)
      return NextResponse.json({ error: "Failed to verify lead" }, { status: 500 })
    }

    return NextResponse.json({ verified: true })
  } catch (error) {
    console.error("[verify-google] Error:", error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
