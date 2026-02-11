import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase.from("leads").delete().eq("id", id)

    if (error) {
      console.error("Error deleting lead:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in delete lead route:", error)
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 })
  }
}
