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

  const { center, zoom } = useMemo(() => {
    const validClinics = clinics.filter((c) => c.latitude && c.longitude)

    if (validClinics.length === 0) {
      return { center: { lat: 51.5074, lng: -0.1278 }, zoom: 12 }
    }

    if (validClinics.length === 1) {
      return {
        center: { lat: validClinics[0].latitude!, lng: validClinics[0].longitude! },
        zoom: 14,
      }
    }

    // Calculate geographic center of all clinics
    const avgLat = validClinics.reduce((sum, c) => sum + c.latitude!, 0) / validClinics.length
    const avgLng = validClinics.reduce((sum, c) => sum + c.longitude!, 0) / validClinics.length

    // Calculate zoom based on spread
    const latSpread = Math.max(...validClinics.map((c) => c.latitude!)) - Math.min(...validClinics.map((c) => c.latitude!))
    const lngSpread = Math.max(...validClinics.map((c) => c.longitude!)) - Math.min(...validClinics.map((c) => c.longitude!))
    const maxSpread = Math.max(latSpread, lngSpread)

    let zoomLevel = 13
    if (maxSpread > 0.2) zoomLevel = 11
    else if (maxSpread > 0.1) zoomLevel = 12
    else if (maxSpread > 0.05) zoomLevel = 13
    else zoomLevel = 14

    return { center: { lat: avgLat, lng: avgLng }, zoom: zoomLevel }
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

  const embedSrc = `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${center.lat},${center.lng}&zoom=${zoom}&maptype=roadmap`

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
