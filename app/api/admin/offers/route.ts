import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"

export async function POST(request: Request) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const body = await request.json()
    const supabase = await createClient()

    const { data, error } = await supabase.from("offers").insert([body]).select().single()

    if (error) {
      console.error("Error creating offer:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ offer: data })
  } catch (error) {
    console.error("Error in create offer API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
