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

  const staticSrc = useMemo(() => {
    const validClinics = clinics.filter((c) => c.latitude && c.longitude)

    if (!apiKey || validClinics.length === 0) return null

    // Use Static Maps API with markers pinned at each clinic's exact coordinates
    // This ensures only our clinics appear on the map (no Google search results)
    const markers = validClinics
      .slice(0, 15)
      .map((c) => `${c.latitude},${c.longitude}`)
      .join("|")

    return `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=${zoom}&size=800x400&scale=2&maptype=roadmap&markers=color:0x0fbcb0|size:mid|${markers}&key=${apiKey}`
  }, [clinics, center, zoom, apiKey])

  const mapsLink = useMemo(() => {
    const validClinics = clinics.filter((c) => c.latitude && c.longitude)
    if (validClinics.length === 0) return null
    // Link to Google Maps with the first clinic as the destination
    const c = validClinics[0]
    return `https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`
  }, [clinics])

  if (!apiKey || !staticSrc) {
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
    <a
      href={mapsLink || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full h-[350px] sm:h-[400px] rounded-xl overflow-hidden cursor-pointer group relative"
    >
      <img
        src={staticSrc}
        alt={`Map showing ${clinics.length} dental clinics`}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-center pb-4">
        <span className="bg-white/95 backdrop-blur-sm text-sm font-medium text-[#004443] px-4 py-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
          Open in Google Maps
        </span>
      </div>
    </a>
  )
}
