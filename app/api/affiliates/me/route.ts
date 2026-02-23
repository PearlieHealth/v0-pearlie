import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { z } from "zod"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: affiliate, error } = await admin
      .from("affiliates")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (error || !affiliate) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 })
    }

    return NextResponse.json({ affiliate })
  } catch (error) {
    console.error("[Affiliate] Error fetching profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  tiktok_handle: z.string().optional(),
  instagram_handle: z.string().optional(),
  youtube_handle: z.string().optional(),
})

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Only update allowed fields
    const updates: Record<string, any> = {}
    if (parsed.data.name !== undefined) updates.name = parsed.data.name
    if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone || null
    if (parsed.data.tiktok_handle !== undefined) updates.tiktok_handle = parsed.data.tiktok_handle || null
    if (parsed.data.instagram_handle !== undefined) updates.instagram_handle = parsed.data.instagram_handle || null
    if (parsed.data.youtube_handle !== undefined) updates.youtube_handle = parsed.data.youtube_handle || null

    const { data: affiliate, error } = await admin
      .from("affiliates")
      .update(updates)
      .eq("user_id", user.id)
      .select("*")
      .single()

    if (error) {
      console.error("[Affiliate] Error updating profile:", error)
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
    }

    return NextResponse.json({ affiliate })
  } catch (error) {
    console.error("[Affiliate] Error updating profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
