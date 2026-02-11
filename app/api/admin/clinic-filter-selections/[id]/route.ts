import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAuth } from "@/lib/admin-auth"

// Update a filter selection (e.g., approve AI tag by changing source to manual)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const { id } = await params
    const body = await request.json()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("clinic_filter_selections")
      .update(body)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating filter selection:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ selection: data })
  } catch (error) {
    console.error("[v0] Error in PATCH filter selection:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

// Delete a filter selection (e.g., reject AI tag)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { error } = await supabase
      .from("clinic_filter_selections")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("[v0] Error deleting filter selection:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in DELETE filter selection:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
