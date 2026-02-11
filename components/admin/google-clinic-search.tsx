"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, MapPin, Star, Phone, Globe, Loader2, CheckCircle2 } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"

interface GoogleClinicResult {
  placeId: string
  name: string
  address: string
  postcode: string
  latitude: number
  longitude: number
  rating: number
  reviewCount: number
  phone: string
  website: string
  mapsUrl: string
  openingHours: string[]
  photoUrl: string | null
}

interface GoogleClinicSearchProps {
  onSelect: (clinic: GoogleClinicResult) => void
}

export function GoogleClinicSearch({ onSelect }: GoogleClinicSearchProps) {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<GoogleClinicResult[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Enter a search query",
        description: "Please enter a clinic name and postcode (e.g., 'Harley Street Dental W1')",
        variant: "destructive",
      })
      return
    }

    setSearching(true)
    setResults([])

    try {
      const response = await fetch("/api/google/clinics/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      })

      if (!response.ok) {
        throw new Error("Search failed")
      }

      const data = await response.json()

      if (data.results.length === 0) {
        toast({
          title: "No clinics found",
          description: "We couldn't find that clinic — try adding the postcode or checking the spelling",
        })
      }

      setResults(data.results)
    } catch (error) {
      console.error("Search error:", error)
      toast({
        title: "Search failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSearching(false)
    }
  }

  const handleSelect = (clinic: GoogleClinicResult) => {
    setSelectedId(clinic.placeId)
    onSelect(clinic)
    toast({
      title: "Clinic details imported",
      description: "Fields have been auto-filled from Google. You can edit any field before saving.",
    })
  }

  return (
    <div className="space-y-4 p-4 bg-blue-50/50 border border-blue-200 rounded-lg">
      <div className="flex items-start gap-2">
        <Search className="w-5 h-5 text-blue-600 mt-3" />
        <div className="flex-1 space-y-2">
          <Label htmlFor="google-search" className="text-sm font-semibold text-blue-900">
            Search Google for clinic info
          </Label>
          <p className="text-xs text-blue-700">
            Find a clinic on Google to auto-fill details like address, phone, rating, and photos. All fields remain
            editable.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          id="google-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Enter clinic name + postcode (e.g., 'Harley Street Dental W1')"
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={searching} className="bg-blue-600 hover:bg-blue-700">
          {searching ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Search
            </>
          )}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {results.map((clinic) => (
            <Card
              key={clinic.placeId}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedId === clinic.placeId ? "ring-2 ring-blue-600 bg-blue-50" : ""
              }`}
              onClick={() => handleSelect(clinic)}
            >
              <div className="flex gap-4">
                {clinic.photoUrl && (
                  <div className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden">
                    <Image
                      src={clinic.photoUrl || "/placeholder.svg"}
                      alt={clinic.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm">{clinic.name}</h4>
                    {selectedId === clinic.placeId && (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Selected
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{clinic.address}</span>
                    </div>

                    {clinic.rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium text-foreground">
                          {clinic.rating.toFixed(1)} ({clinic.reviewCount} reviews)
                        </span>
                      </div>
                    )}

                    {clinic.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span>{clinic.phone}</span>
                      </div>
                    )}

                    {clinic.website && (
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        <span className="truncate">{clinic.website}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
