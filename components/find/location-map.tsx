"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false })
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false })

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
  const [isClient, setIsClient] = useState(false)
  const [L, setL] = useState<typeof import("leaflet") | null>(null)

  useEffect(() => {
    setIsClient(true)
    import("leaflet").then((leaflet) => {
      setL(leaflet)
      delete (leaflet.default.Icon.Default.prototype as any)._getIconUrl
      leaflet.default.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })
    })
  }, [])

  if (!isClient || !L) {
    return (
      <div className="w-full h-[350px] sm:h-[400px] bg-muted rounded-xl flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    )
  }

  const validClinics = clinics.filter((c) => c.latitude && c.longitude)

  return (
    <div className="w-full h-[350px] sm:h-[400px] rounded-xl overflow-hidden">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validClinics.map((clinic) => (
          <Marker key={clinic.id} position={[clinic.latitude, clinic.longitude]}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{clinic.name}</p>
                <p className="text-muted-foreground">{clinic.address}, {clinic.postcode}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
