"use client"

import { useMemo, useState } from "react"
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
  const [staticFailed, setStaticFailed] = useState(false)

  const validClinics = useMemo(
    () => clinics.filter((c) => c.latitude && c.longitude),
    [clinics],
  )

  // Static Maps API URL — shows markers at each clinic's exact coordinates
  const staticSrc = useMemo(() => {
    if (!apiKey || validClinics.length === 0) return null

    const markers = validClinics
      .slice(0, 15)
      .map((c) => `${c.latitude},${c.longitude}`)
      .join("|")

    return `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=${zoom}&size=800x400&scale=2&maptype=roadmap&markers=color:0x0fbcb0|size:mid|${markers}&key=${apiKey}`
  }, [validClinics, center, zoom, apiKey])

  // Embed API view mode — fallback that works with any Maps Embed API key
  const embedSrc = useMemo(() => {
    if (!apiKey) return null
    return `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${center.lat},${center.lng}&zoom=${zoom}&maptype=roadmap`
  }, [center, zoom, apiKey])

  const mapsLink = useMemo(() => {
    if (validClinics.length === 0) return null
    const c = validClinics[0]
    return `https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`
  }, [validClinics])

  // No API key at all — show a simple link
  if (!apiKey) {
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

  // Fallback: Embed API view mode (iframe) — works with any Embed API key
  if (staticFailed || !staticSrc) {
    return (
      <div className="relative w-full h-[350px] sm:h-[400px] rounded-xl overflow-hidden">
        <iframe
          src={embedSrc!}
          className="w-full h-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          title={`Map showing area with ${validClinics.length} dental clinics`}
        />
        {mapsLink && (
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm text-sm font-medium text-[#004443] px-4 py-2 rounded-full shadow-sm hover:bg-white transition-colors z-10"
          >
            View clinics on Google Maps
          </a>
        )}
      </div>
    )
  }

  // Primary: Static Maps API with clinic markers
  return (
    <div className="relative w-full h-[350px] sm:h-[400px] rounded-xl overflow-hidden group">
      <a
        href={mapsLink || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full h-full cursor-pointer"
      >
        <img
          src={staticSrc}
          alt={`Map showing ${validClinics.length} dental clinics`}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setStaticFailed(true)}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-center pb-4">
          <span className="bg-white/95 backdrop-blur-sm text-sm font-medium text-[#004443] px-4 py-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
            Open in Google Maps
          </span>
        </div>
      </a>
    </div>
  )
}
