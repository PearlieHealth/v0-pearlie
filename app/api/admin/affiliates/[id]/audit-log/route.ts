import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("affiliate_audit_log")
      .select("*")
      .eq("affiliate_id", id)
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
