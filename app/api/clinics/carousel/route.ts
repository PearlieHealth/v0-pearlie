import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: clinics, error } = await supabase
      .from("clinics")
      .select("id, name, city, images, rating")
      .eq("is_archived", false)
      .eq("verified", true)
      .not("images", "is", null)
      .limit(10)

    if (error) {
      console.error("Error fetching clinics for carousel:", error)
      return NextResponse.json({ clinics: [] }, { status: 200 })
    }

    const clinicsWithImages = clinics?.filter(
      (c) => c.images && Array.isArray(c.images) && c.images.length > 0
    ) || []

    // Custom sort: Ziha Dental first, Watford Smile Clinic last
    const sorted = [...clinicsWithImages].sort((a, b) => {
      const nameA = a.name?.toLowerCase() || ""
      const nameB = b.name?.toLowerCase() || ""
      if (nameA.includes("ziha")) return -1
      if (nameB.includes("ziha")) return 1
      if (nameA.includes("watford")) return 1
      if (nameB.includes("watford")) return -1
      return 0
    })

    const carouselData = sorted.map((clinic) => ({
      src: clinic.images[0],
      alt: `${clinic.name} dental clinic`,
      name: clinic.name,
      location: clinic.city || "UK",
      rating: clinic.rating || 4.8,
    }))

    return NextResponse.json(
      { clinics: carouselData },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    )
  } catch (err) {
    console.error("Failed to fetch carousel clinics:", err)
    return NextResponse.json({ clinics: [] }, { status: 200 })
  }
}
