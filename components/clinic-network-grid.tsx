"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { ClinicImage } from "@/components/match/clinic-image"
import { Building2, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ClinicImageData {
  id: string
  name: string
  image: string
}

export function ClinicNetworkGrid() {
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
          .limit(8)

        if (error) {
          console.error("Error fetching clinics:", error)
          return
        }

        // Filter clinics with images and take first image from each
        const clinicsWithImages = data
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

  // Show skeleton loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-gray-200 animate-pulse" />
        ))}
      </div>
    )
  }

  // Fill remaining slots with placeholder icons if we have fewer than 8 clinics
  const placeholderCount = Math.max(0, 8 - clinics.length)
  const placeholderIcons = [Building2, Users, Building2, Users, Building2, Users, Building2, Users]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
      {clinics.map((clinic) => (
        <div key={clinic.id} className="aspect-square rounded-2xl overflow-hidden bg-gray-200">
          <ClinicImage
            src={clinic.image || "/placeholder.svg"}
            alt={`${clinic.name} dental clinic`}
            width={300}
            height={300}
            className="w-full h-full object-cover"
            fallbackClassName="w-full h-full bg-muted flex items-center justify-center"
          />
        </div>
      ))}
      {[...Array(placeholderCount)].map((_, i) => {
        const IconComponent = placeholderIcons[i % placeholderIcons.length]
        return (
          <div
            key={`placeholder-${i}`}
            className="aspect-square rounded-2xl overflow-hidden bg-gray-200 flex items-center justify-center"
          >
            <IconComponent className="w-16 h-16 text-gray-400" />
          </div>
        )
      })}
    </div>
  )
}
