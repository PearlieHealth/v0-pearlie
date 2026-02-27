"use client"

import { useMemo } from "react"
import { MapPin } from "lucide-react"

interface MapClinic {
  id: string
  name: string
  address: string
  postcode: string
  latitude: number
  longitude: number
}

interface LocationMapProps {
  clinics: MapClinic[]
  center: { lat: number; lng: number }
  zoom: number
}

export function LocationMap({ clinics, center, zoom }: LocationMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY

  const embedSrc = useMemo(() => {
    const validClinics = clinics.filter((c) => c.latitude && c.longitude)

    if (!apiKey || validClinics.length === 0) return null

    if (validClinics.length === 1) {
      const c = validClinics[0]
      return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${c.latitude},${c.longitude}&zoom=${zoom}`
    }

    // Multiple clinics — use view mode centered on the area
    const query = validClinics
      .slice(0, 10)
      .map((c) => `${c.name}, ${c.postcode}`)
      .join(" | ")
    const encoded = encodeURIComponent(query)

    return `https://www.google.com/maps/embed/v1/search?key=${apiKey}&q=${encoded}&center=${center.lat},${center.lng}&zoom=${zoom}`
  }, [clinics, center, zoom, apiKey])

  if (!apiKey || !embedSrc) {
    const fallbackQuery = encodeURIComponent(`dental clinics near ${center.lat},${center.lng}`)

    return (
      <div className="w-full h-[350px] sm:h-[400px] rounded-xl overflow-hidden bg-[#f0eeea] flex items-center justify-center">
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${fallbackQuery}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <MapPin className="h-5 w-5" />
          <span className="text-sm font-medium">View clinics on Google Maps</span>
        </a>
      </div>
    )
  }

  return (
    <div className="w-full h-[350px] sm:h-[400px] rounded-xl overflow-hidden">
      <iframe
        title="Clinic locations"
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={embedSrc}
      />
    </div>
  )
}
