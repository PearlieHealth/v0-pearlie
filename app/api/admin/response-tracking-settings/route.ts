/**
 * Admin API: Response Tracking Settings
 *
 * GET  — Read current settings
 * POST — Update settings (toggle nudges, alt-clinics emails, thresholds)
 *
 * Stored in the existing matching_config table as key "response_tracking_settings".
 */
import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAuth } from "@/lib/admin-auth"

export interface ResponseTrackingSettings {
  /** Master toggle — enable/disable the clinic nudge email (2hr) */
  clinicNudgeEnabled: boolean
  /** Master toggle — enable/disable the alternative-clinics email to patients (4hr) */
  altClinicsEmailEnabled: boolean
  /** Hours before clinic nudge fires (default: 2) */
  nudgeThresholdHours: number
  /** Hours before alt-clinics email fires (default: 4) */
  altClinicsThresholdHours: number
}

const CONFIG_KEY = "response_tracking_settings"

const DEFAULTS: ResponseTrackingSettings = {
  clinicNudgeEnabled: false,
  altClinicsEmailEnabled: false,
  nudgeThresholdHours: 2,
  altClinicsThresholdHours: 4,
}

export async function GET() {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("matching_config")
      .select("config_value, updated_at")
      .eq("config_key", CONFIG_KEY)
      .maybeSingle()

    if (error) {
      console.error("[response-tracking-settings] GET error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const settings: ResponseTrackingSettings = {
      ...DEFAULTS,
      ...(data?.config_value || {}),
    }

    return NextResponse.json({ settings, updatedAt: data?.updated_at || null })
  } catch (error) {
    console.error("[response-tracking-settings] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const body = await request.json()
    const { settings } = body

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Invalid settings" }, { status: 400 })
    }

    // Validate and merge with defaults
    const merged: ResponseTrackingSettings = {
      clinicNudgeEnabled: typeof settings.clinicNudgeEnabled === "boolean" ? settings.clinicNudgeEnabled : DEFAULTS.clinicNudgeEnabled,
      altClinicsEmailEnabled: typeof settings.altClinicsEmailEnabled === "boolean" ? settings.altClinicsEmailEnabled : DEFAULTS.altClinicsEmailEnabled,
      nudgeThresholdHours: typeof settings.nudgeThresholdHours === "number" && settings.nudgeThresholdHours >= 1 ? settings.nudgeThresholdHours : DEFAULTS.nudgeThresholdHours,
      altClinicsThresholdHours: typeof settings.altClinicsThresholdHours === "number" && settings.altClinicsThresholdHours >= 1 ? settings.altClinicsThresholdHours : DEFAULTS.altClinicsThresholdHours,
    }

    const supabase = createAdminClient()
    const { error } = await supabase
      .from("matching_config")
      .upsert({
        config_key: CONFIG_KEY,
        config_value: merged,
        updated_at: new Date().toISOString(),
      }, { onConflict: "config_key" })

    if (error) {
      console.error("[response-tracking-settings] POST error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, settings: merged })
  } catch (error) {
    console.error("[response-tracking-settings] POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
