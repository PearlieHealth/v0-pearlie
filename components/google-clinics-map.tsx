"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Loader2 } from "lucide-react"

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

let googleMapsLoadPromise: Promise<void> | null = null

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (googleMapsLoadPromise) return googleMapsLoadPromise

  if (typeof window !== "undefined" && (window as any).google?.maps) {
    return Promise.resolve()
  }

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      googleMapsLoadPromise = null
      reject(new Error("Failed to load Google Maps"))
    }
    document.head.appendChild(script)
  })

  return googleMapsLoadPromise
}

export function GoogleClinicsMap({
  clinics,
  highlightedClinicId,
  onClinicHover,
  onClinicClick,
}: GoogleClinicsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const infoWindowRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load the Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY
    if (!apiKey) {
      setError("Google Maps API key not configured")
      return
    }

    loadGoogleMapsScript(apiKey)
      .then(() => setIsLoaded(true))
      .catch(() => setError("Failed to load Google Maps"))
  }, [])

  // Initialize the map
  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current) return

    const google = (window as any).google

    const validClinics = clinics.filter((c) => c.latitude && c.longitude)
    const center =
      validClinics.length > 0
        ? { lat: validClinics[0].latitude!, lng: validClinics[0].longitude! }
        : { lat: 51.5074, lng: -0.1278 }

    const map = new google.maps.Map(mapContainerRef.current, {
      center,
      zoom: 12,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: "cooperative",
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
        {
          featureType: "transit",
          elementType: "labels",
          stylers: [{ visibility: "simplified" }],
        },
      ],
    })

    mapRef.current = map
    infoWindowRef.current = new google.maps.InfoWindow()

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    // Add markers
    validClinics.forEach((clinic, index) => {
      const isRecommended = index < 2

      const marker = new google.maps.Marker({
        position: { lat: clinic.latitude!, lng: clinic.longitude! },
        map,
        title: clinic.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: isRecommended ? 10 : 8,
          fillColor: isRecommended ? "#0fbcb0" : "#004443",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2.5,
        },
        zIndex: isRecommended ? 10 : 1,
      })

      marker.addListener("click", () => {
        const content = `
          <div style="padding: 8px; max-width: 220px; font-family: system-ui, -apple-system, sans-serif;">
            <h3 style="font-weight: 600; font-size: 14px; margin: 0 0 4px 0; color: #004443;">${clinic.name}</h3>
            <p style="font-size: 12px; color: #666; margin: 0 0 4px 0;">${clinic.address}</p>
            <div style="font-size: 12px; color: #888;">
              <span style="color: #f59e0b;">&#9733;</span> ${clinic.rating}
            </div>
          </div>
        `
        infoWindowRef.current.setContent(content)
        infoWindowRef.current.open(map, marker)
        onClinicClick(clinic.id)
      })

      marker.addListener("mouseover", () => {
        onClinicHover(clinic.id)
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#0fbcb0",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        })
      })

      marker.addListener("mouseout", () => {
        onClinicHover(null)
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: isRecommended ? 10 : 8,
          fillColor: isRecommended ? "#0fbcb0" : "#004443",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2.5,
        })
      })

      markersRef.current.push(marker)
    })

    // Fit bounds to show all markers
    if (validClinics.length > 1) {
      const bounds = new google.maps.LatLngBounds()
      validClinics.forEach((c) => {
        bounds.extend({ lat: c.latitude!, lng: c.longitude! })
      })
      map.fitBounds(bounds, { top: 30, right: 30, bottom: 30, left: 30 })
    }

    return () => {
      markersRef.current.forEach((m) => m.setMap(null))
      markersRef.current = []
    }
  }, [isLoaded, clinics, onClinicClick, onClinicHover])

  // Handle highlighted clinic changes
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return

    const google = (window as any).google
    const validClinics = clinics.filter((c) => c.latitude && c.longitude)

    markersRef.current.forEach((marker, index) => {
      const clinic = validClinics[index]
      if (!clinic) return

      const isHighlighted = highlightedClinicId === clinic.id
      const isRecommended = index < 2

      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: isHighlighted ? 13 : isRecommended ? 10 : 8,
        fillColor: isHighlighted || isRecommended ? "#0fbcb0" : "#004443",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: isHighlighted ? 3 : 2.5,
      })

      marker.setZIndex(isHighlighted ? 100 : isRecommended ? 10 : 1)
    })
  }, [highlightedClinicId, clinics, isLoaded])

  if (error) {
    return (
      <div className="w-full h-full bg-muted/30 rounded-2xl flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Map unavailable</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 rounded-2xl">
          <Loader2 className="w-6 h-6 animate-spin text-[#0fbcb0]" />
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-full rounded-2xl" />
    </div>
  )
}
