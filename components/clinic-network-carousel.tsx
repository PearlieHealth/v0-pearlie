"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ClinicImage } from "@/components/match/clinic-image"
import { Building2, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ClinicImageData {
  id: string
  name: string
  image: string
}

export function ClinicNetworkCarousel() {
  const [clinics, setClinics] = useState<ClinicImageData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("clinics")
          .select("id, name, images")
          .eq("is_archived", false)
          .eq("verified", true)
          .not("images", "is", null)
          .limit(12)

        if (error) {
          console.error("Error fetching clinics:", error)
          return
        }

        const clinicsWithImages =
          data
            ?.filter((c) => c.images && Array.isArray(c.images) && c.images.length > 0)
            .map((c) => ({
              id: c.id,
              name: c.name,
              image: c.images[0],
            })) || []

        setClinics(clinicsWithImages)
      } catch (err) {
        console.error("Failed to fetch clinics:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchClinics()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-56 h-40 flex-shrink-0 rounded-2xl bg-gray-200 animate-pulse"
            />
          ))}
        </div>
        <div className="flex gap-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-56 h-40 flex-shrink-0 rounded-2xl bg-gray-200 animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  // Fill remaining slots with placeholders if fewer than 8 clinics
  const placeholderIcons = [Building2, Users, Building2, Users, Building2, Users, Building2, Users]
  const totalItems = Math.max(clinics.length, 8)
  const placeholderCount = Math.max(0, 8 - clinics.length)

  // Build the full item list
  const allItems: (ClinicImageData | { id: string; placeholder: true; iconIndex: number })[] = [
    ...clinics,
    ...Array.from({ length: placeholderCount }, (_, i) => ({
      id: `placeholder-${i}`,
      placeholder: true as const,
      iconIndex: i,
    })),
  ]

  // Split into two rows
  const midpoint = Math.ceil(allItems.length / 2)
  const topRow = allItems.slice(0, midpoint)
  const bottomRow = allItems.slice(midpoint)

  // Duplicate each row for seamless looping
  const topRowDuped = [...topRow, ...topRow]
  const bottomRowDuped = [...bottomRow, ...bottomRow]

  const speed = Math.max(topRow.length * 6, 25)

  return (
    <div className="space-y-4 overflow-hidden" aria-label="Our clinic network">
      {/* Top row — scrolling right */}
      <div
        className="flex gap-4 marquee-track-reverse"
        style={{ "--marquee-speed": `${speed}s` } as React.CSSProperties}
      >
        {topRowDuped.map((item, i) =>
          "placeholder" in item ? (
            <PlaceholderCard key={`top-${item.id}-${i}`} Icon={placeholderIcons[item.iconIndex % placeholderIcons.length]} />
          ) : (
            <ClinicCard key={`top-${item.id}-${i}`} clinic={item} />
          )
        )}
      </div>

      {/* Bottom row — scrolling left */}
      <div
        className="flex gap-4 marquee-track"
        style={{ "--marquee-speed": `${speed}s` } as React.CSSProperties}
      >
        {bottomRowDuped.map((item, i) =>
          "placeholder" in item ? (
            <PlaceholderCard key={`bottom-${item.id}-${i}`} Icon={placeholderIcons[item.iconIndex % placeholderIcons.length]} />
          ) : (
            <ClinicCard key={`bottom-${item.id}-${i}`} clinic={item} />
          )
        )}
      </div>
    </div>
  )
}

function ClinicCard({ clinic }: { clinic: ClinicImageData }) {
  return (
    <Link href={`/clinic/${clinic.id}`} className="w-56 h-40 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-200 relative group block">
      <ClinicImage
        src={clinic.image}
        alt={`${clinic.name} dental clinic`}
        width={300}
        height={200}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        fallbackClassName="w-full h-full flex items-center justify-center bg-[#004443]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute bottom-0 left-0 right-0 p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <p className="text-sm font-medium truncate">{clinic.name}</p>
      </div>
    </Link>
  )
}

function PlaceholderCard({ Icon }: { Icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="w-56 h-40 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-200 flex items-center justify-center">
      <Icon className="w-12 h-12 text-gray-400" />
    </div>
  )
}
