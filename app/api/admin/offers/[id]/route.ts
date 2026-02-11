import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const body = await request.json()
    const supabase = await createClient()

    const { data, error } = await supabase.from("offers").update(body).eq("id", params.id).select().single()

    if (error) {
      console.error("Error updating offer:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ offer: data })
  } catch (error) {
    console.error("Error in update offer API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = await createClient()

    const { error } = await supabase.from("offers").delete().eq("id", params.id)

    if (error) {
      console.error("Error deleting offer:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in delete offer API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
