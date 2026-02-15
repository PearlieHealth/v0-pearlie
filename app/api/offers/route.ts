import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "10") || 10, 100)

    const supabase = await createClient()

    // Fetch active offers with clinic details
    const { data: offers, error } = await supabase
      .from("offers")
      .select(`
        id,
        title,
        subtitle,
        indicative_price,
        saving_text,
        valid_until,
        priority,
        created_at,
        clinics (
          id,
          name,
          address,
          postcode,
          latitude,
          longitude,
          images,
          website
        )
      `)
      .eq("active", true)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching offers:", error)
      return NextResponse.json({ error: "Failed to fetch offers" }, { status: 500 })
    }

    return NextResponse.json({ offers: offers || [] })
  } catch (error) {
    console.error("Error in offers API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
