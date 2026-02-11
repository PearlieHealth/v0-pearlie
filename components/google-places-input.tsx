"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { MapPin, Loader2, Search } from "lucide-react"

interface PlaceResult {
  placeId: string
  name: string
  address: string
  city: string
  postcode: string
  lat: number
  lng: number
  phone?: string
  website?: string
  rating?: number
  reviewCount?: number
}

interface GooglePlacesInputProps {
  value: string
  onChange: (value: string) => void
  onPlaceSelect: (place: PlaceResult) => void
  placeholder?: string
  disabled?: boolean
}

interface Suggestion {
  placeId: string
  primaryText: string
  secondaryText: string
}

export function GooglePlacesInput({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Start typing clinic name...",
  disabled = false,
}: GooglePlacesInputProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const sessionToken = useRef<string>(crypto.randomUUID())

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const searchPlaces = useCallback(async (input: string) => {
    if (!input || input.length < 3) {
      setSuggestions([])
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/places/autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: input,
          sessionToken: sessionToken.current,
        }),
      })

      const data = await response.json()

      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions)
        setShowDropdown(true)
      } else {
        setSuggestions([])
      }
    } catch (error) {
      console.error("Error searching places:", error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (value && value.length >= 3) {
        searchPlaces(value)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [value, searchPlaces])

  const handlePlaceSelect = async (suggestion: Suggestion) => {
    setIsLoading(true)
    setShowDropdown(false)

    try {
      const response = await fetch("/api/places/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: suggestion.placeId,
          sessionToken: sessionToken.current,
        }),
      })

      const data = await response.json()

      if (data.clinic) {
        const clinic = data.clinic
        
        // Extract postcode from address if not directly available
        let postcode = ""
        let city = ""
        const addressParts = clinic.formattedAddress?.split(", ") || []
        
        // UK postcodes are usually in the format "XX## #XX" at the end
        const postcodeMatch = clinic.formattedAddress?.match(/[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}/i)
        if (postcodeMatch) {
          postcode = postcodeMatch[0]
        }
        
        // City is usually the second-to-last part before the postcode in UK addresses
        if (addressParts.length >= 3) {
          city = addressParts[addressParts.length - 3] || addressParts[addressParts.length - 2] || ""
        }

        const result: PlaceResult = {
          placeId: clinic.placeId,
          name: clinic.name,
          address: clinic.formattedAddress,
          city,
          postcode,
          lat: clinic.lat || 0,
          lng: clinic.lng || 0,
          phone: clinic.phone || undefined,
          website: clinic.website || undefined,
          rating: clinic.rating || undefined,
          reviewCount: clinic.ratingCount || undefined,
        }

        onChange(clinic.name)
        onPlaceSelect(result)
        setSuggestions([])

        // Reset session token after selection
        sessionToken.current = crypto.randomUUID()
      }
    } catch (error) {
      console.error("Error fetching place details:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            if (e.target.value.length >= 3) {
              setShowDropdown(true)
            }
          }}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowDropdown(true)
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.placeId}
              type="button"
              onClick={() => handlePlaceSelect(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0"
            >
              <div className="font-medium text-sm">{suggestion.primaryText}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {suggestion.secondaryText}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
