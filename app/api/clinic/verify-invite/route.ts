import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 })
  }

  try {
    const supabaseAdmin = createAdminClient()
    
    console.log("[v0] Verifying invite token:", token.substring(0, 8) + "...")

    const { data: invite, error } = await supabaseAdmin
      .from("clinic_invites")
      .select(`
        email,
        role,
        expires_at,
        accepted_at,
        clinics(name)
      `)
      .eq("token", token)
      .single()

    if (error) {
      console.error("[v0] Invite lookup error:", error)
      return NextResponse.json({ error: "Invalid invitation token" }, { status: 404 })
    }
    
    if (!invite) {
      console.log("[v0] No invite found for token")
      return NextResponse.json({ error: "Invalid invitation token" }, { status: 404 })
    }
    
    console.log("[v0] Found invite for:", invite.email)

    if (invite.accepted_at) {
      return NextResponse.json({ error: "This invitation has already been used" }, { status: 400 })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "This invitation has expired" }, { status: 400 })
    }

    return NextResponse.json({
      invite: {
        email: invite.email,
        role: invite.role,
        clinic_name: (invite.clinics as { name: string })?.name || "Unknown Clinic",
      },
    })
  } catch (error) {
    console.error("Error verifying invite:", error)
    return NextResponse.json({ error: "Failed to verify invitation" }, { status: 500 })
  }
}
