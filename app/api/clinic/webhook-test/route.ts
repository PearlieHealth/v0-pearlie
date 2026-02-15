import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/supabase/get-clinic-user"
import { createHmac } from "crypto"

export async function POST() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()

    const { data: clinicUser } = await supabaseAdmin
      .from("clinic_users")
      .select("clinic_id")
      .eq("user_id", user.id)
      .single()

    if (!clinicUser) {
      return NextResponse.json({ error: "No clinic found" }, { status: 404 })
    }

    const { data: clinic } = await supabaseAdmin
      .from("clinics")
      .select("booking_webhook_url, booking_webhook_secret, name")
      .eq("id", clinicUser.clinic_id)
      .single()

    if (!clinic?.booking_webhook_url) {
      return NextResponse.json({ error: "No webhook URL configured" }, { status: 400 })
    }

    // Build sample payload
    const payload = {
      event: "booking.test",
      lead_id: "00000000-0000-0000-0000-000000000000",
      patient_name: "Test Patient",
      appointment_datetime: new Date().toISOString(),
      treatment: "Test Booking",
      clinic_name: clinic.name,
      test: true,
    }

    const body = JSON.stringify(payload)

    // Sign if secret is configured
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (clinic.booking_webhook_secret) {
      const signature = createHmac("sha256", clinic.booking_webhook_secret)
        .update(body)
        .digest("hex")
      headers["X-Pearlie-Signature"] = `sha256=${signature}`
    }

    // Send the test webhook
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    try {
      const response = await fetch(clinic.booking_webhook_url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      })

      clearTimeout(timeout)

      return NextResponse.json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
      })
    } catch (fetchError: unknown) {
      clearTimeout(timeout)
      const message = fetchError instanceof Error ? fetchError.message : "Connection failed"
      return NextResponse.json({
        success: false,
        status: 0,
        statusText: message.includes("abort") ? "Timeout (10s)" : message,
      })
    }
  } catch (error) {
    console.error("[webhook-test] Error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
