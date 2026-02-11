import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAuth } from "@/lib/admin-auth"

export async function GET() {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = createAdminClient()

    const { data: tags, error } = await supabase
      .from("clinic_tags")
      .select("key, label, category, description")
      .eq("active", true)
      .order("category")
      .order("label")

    if (error) {
      console.error("Error fetching tags:", error)
      return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 })
    }

    return NextResponse.json(tags)
  } catch (error) {
    console.error("Error in tags API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const body = await request.json()
    const { key, label, category, description } = body

    // Validate required fields
    if (!key || !label || !category) {
      return NextResponse.json({ error: "Missing required fields: key, label, category" }, { status: 400 })
    }

    // Validate category
    const validCategories = ["care", "pricing", "capability", "convenience"]
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 })
    }

    // Validate key format (kebab-case)
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key)) {
      return NextResponse.json({ error: "Key must be in kebab-case format (e.g., gentle-dentist)" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: newTag, error } = await supabase
      .from("clinic_tags")
      .insert({
        key,
        label,
        category,
        description: description || null,
        active: true,
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Tag key already exists" }, { status: 409 })
      }
      console.error("Error creating tag:", error)
      return NextResponse.json({ error: "Failed to create tag" }, { status: 500 })
    }

    return NextResponse.json(newTag)
  } catch (error) {
    console.error("Error in tags POST API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
