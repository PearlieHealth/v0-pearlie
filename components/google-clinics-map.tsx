"use client"

import { useMemo } from "react"
import { MapPin } from "lucide-react"

interface Clinic {
  id: string
  name: string
  address: string
  postcode: string
  latitude?: number
  longitude?: number
  rating: number
  phone: string
}

interface GoogleClinicsMapProps {
  clinics: Clinic[]
  highlightedClinicId: string | null
  onClinicHover: (clinicId: string | null) => void
  onClinicClick: (clinicId: string) => void
}

export function GoogleClinicsMap({
  clinics,
}: GoogleClinicsMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY

  const { center, zoom, validClinics } = useMemo(() => {
    const valid = clinics.filter((c) => c.latitude && c.longitude)

    if (valid.length === 0) {
      return { center: { lat: 51.5074, lng: -0.1278 }, zoom: 12, validClinics: valid }
    }

    if (valid.length === 1) {
      return {
        center: { lat: valid[0].latitude!, lng: valid[0].longitude! },
        zoom: 14,
        validClinics: valid,
      }
    }

    const avgLat = valid.reduce((sum, c) => sum + c.latitude!, 0) / valid.length
    const avgLng = valid.reduce((sum, c) => sum + c.longitude!, 0) / valid.length

    const latSpread = Math.max(...valid.map((c) => c.latitude!)) - Math.min(...valid.map((c) => c.latitude!))
    const lngSpread = Math.max(...valid.map((c) => c.longitude!)) - Math.min(...valid.map((c) => c.longitude!))
    const maxSpread = Math.max(latSpread, lngSpread)

    let zoomLevel = 13
    if (maxSpread > 0.2) zoomLevel = 11
    else if (maxSpread > 0.1) zoomLevel = 12
    else if (maxSpread > 0.05) zoomLevel = 13
    else zoomLevel = 14

    return { center: { lat: avgLat, lng: avgLng }, zoom: zoomLevel, validClinics: valid }
  }, [clinics])

  if (!apiKey) {
    const firstClinic = clinics.find((c) => c.latitude && c.longitude)
    const fallbackQuery = firstClinic
      ? encodeURIComponent(firstClinic.address + ", " + firstClinic.postcode)
      : encodeURIComponent("London dental clinics")

    return (
      <div className="w-full h-full bg-[#e5e5e5] flex items-center justify-center">
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${fallbackQuery}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-[#666] hover:text-[#1a1a1a] transition-colors"
        >
          <MapPin className="h-5 w-5" />
          <span className="text-sm">View on Google Maps</span>
        </a>
      </div>
    )
  }

  // Build marker params for each clinic with coordinates
  const markerParams = validClinics
    .map((c) => `${c.latitude},${c.longitude}`)
    .join("|")

  const markers = validClinics.length > 0
    ? `&markers=color:0x0fbcb0|${markerParams}`
    : ""

  const staticSrc = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=${zoom}&size=640x480&scale=2&maptype=roadmap${markers}&key=${apiKey}`

  return (
    <img
      src={staticSrc}
      alt="Map showing clinic locations"
      className="w-full h-full object-cover"
      loading="lazy"
    />
  )
}
