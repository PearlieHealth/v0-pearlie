import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifyAdminAuth } from "@/lib/admin-auth"

export async function GET() {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = await createClient()

    // Fetch custom reason templates from database
    const { data, error } = await supabase
      .from("matching_config")
      .select("*")
      .eq("config_key", "reason_templates")
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found, which is OK
      throw error
    }

    return NextResponse.json({
      reasonTemplates: data?.config_value || {},
      updatedAt: data?.updated_at || null,
    })
  } catch (error) {
    console.error("[matching-config] GET error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const body = await request.json()
    const { reasonTemplates } = body

    if (!reasonTemplates || typeof reasonTemplates !== "object") {
      return NextResponse.json(
        { error: "Invalid reasonTemplates" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Upsert the config
    const { error } = await supabase
      .from("matching_config")
      .upsert({
        config_key: "reason_templates",
        config_value: reasonTemplates,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "config_key",
      })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[matching-config] POST error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
