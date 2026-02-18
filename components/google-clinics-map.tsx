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

  const embedSrc = useMemo(() => {
    const validClinics = clinics.filter((c) => c.latitude && c.longitude)

    if (!apiKey || validClinics.length === 0) return null

    if (validClinics.length === 1) {
      // Single clinic — use place mode (shows a pin marker)
      const c = validClinics[0]
      return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${c.latitude},${c.longitude}&zoom=15`
    }

    // Multiple clinics — use search mode with all addresses so pins show
    const query = validClinics
      .map((c) => `${c.name}, ${c.postcode}`)
      .join(" | ")
    const encoded = encodeURIComponent(query)

    // Calculate center for the view
    const avgLat = validClinics.reduce((sum, c) => sum + c.latitude!, 0) / validClinics.length
    const avgLng = validClinics.reduce((sum, c) => sum + c.longitude!, 0) / validClinics.length

    const latSpread = Math.max(...validClinics.map((c) => c.latitude!)) - Math.min(...validClinics.map((c) => c.latitude!))
    const lngSpread = Math.max(...validClinics.map((c) => c.longitude!)) - Math.min(...validClinics.map((c) => c.longitude!))
    const maxSpread = Math.max(latSpread, lngSpread)

    let zoom = 13
    if (maxSpread > 0.2) zoom = 11
    else if (maxSpread > 0.1) zoom = 12
    else if (maxSpread > 0.05) zoom = 13
    else zoom = 14

    return `https://www.google.com/maps/embed/v1/search?key=${apiKey}&q=${encoded}&center=${avgLat},${avgLng}&zoom=${zoom}`
  }, [clinics, apiKey])

  if (!apiKey || !embedSrc) {
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

  return (
    <iframe
      title="Clinic locations"
      width="100%"
      height="100%"
      style={{ border: 0 }}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      src={embedSrc}
    />
  )
}
