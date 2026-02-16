"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

// Dynamically import map to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false })
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false })

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

interface ClinicsMapProps {
  clinics: Clinic[]
  highlightedClinicId: string | null
  onClinicHover: (clinicId: string | null) => void
  onClinicClick: (clinicId: string) => void
}

export function ClinicsMap({ clinics, highlightedClinicId, onClinicHover, onClinicClick }: ClinicsMapProps) {
  const [isClient, setIsClient] = useState(false)
  const [L, setL] = useState<any>(null)

  useEffect(() => {
    setIsClient(true)
    import("leaflet").then((leaflet) => {
      setL(leaflet.default)
      // Fix for default marker icons
      delete (leaflet.default.Icon.Default.prototype as any)._getIconUrl
      leaflet.default.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })
    })
  }, [])

  // Filter clinics with valid coordinates
  const validClinics = clinics.filter((c) => c.latitude && c.longitude)

  // Default to London center if no clinics
  const center: [number, number] =
    validClinics.length > 0 ? [validClinics[0].latitude!, validClinics[0].longitude!] : [51.5074, -0.1278]

  if (!isClient || !L) {
    return (
      <div className="w-full h-[350px] md:h-[600px] bg-muted rounded-lg flex items-center justify-center">
        <div className="text-muted-foreground">Loading map...</div>
      </div>
    )
  }

  // Create custom icons for recommended vs regular clinics
  const recommendedIcon =
    L &&
    new L.Icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    })

  const regularIcon =
    L &&
    new L.Icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    })

  const highlightedIcon =
    L &&
    new L.Icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [30, 49],
      iconAnchor: [15, 49],
      popupAnchor: [1, -40],
      shadowSize: [49, 49],
    })

  return (
    <div className="w-full h-[350px] md:h-[600px] rounded-lg overflow-hidden border shadow-sm">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validClinics.map((clinic, index) => {
          const isHighlighted = highlightedClinicId === clinic.id
          const isRecommended = index < 2 // First 2 are recommended
          let icon = regularIcon

          if (isHighlighted) {
            icon = highlightedIcon
          } else if (isRecommended) {
            icon = recommendedIcon
          }

          return (
            <Marker
              key={clinic.id}
              position={[clinic.latitude!, clinic.longitude!]}
              icon={icon}
              eventHandlers={{
                click: () => onClinicClick(clinic.id),
                mouseover: () => onClinicHover(clinic.id),
                mouseout: () => onClinicHover(null),
              }}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold mb-1">{clinic.name}</h3>
                  <p className="text-sm text-gray-600 mb-1">{clinic.address}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-yellow-500">★ {clinic.rating}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-600">{clinic.phone}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
