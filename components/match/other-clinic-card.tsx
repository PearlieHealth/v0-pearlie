"use client"

import { Card } from "@/components/ui/card"
import { MapPin, Star, Sparkles, CheckCircle2 } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { getChipData } from "@/lib/chipData"

interface OtherClinicCardProps {
  clinic: {
    id: string
    name: string
    images?: string[]
    rating: number
    review_count: number
    distance_miles?: number
    match_percentage?: number
    verified?: boolean
    tier?: string
    is_directory_listing?: boolean
    highlight_chips?: string[]
    offers_free_consultation?: boolean
  }
  isSelected: boolean
  onClick: () => void
}

export function OtherClinicCard({ clinic, isSelected, onClick }: OtherClinicCardProps) {
  const showMatchPercent =
    clinic.match_percentage && clinic.tier !== "directory" && !clinic.is_directory_listing

  return (
    <Card
      className={cn(
        "p-3 cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected
          ? "ring-2 ring-primary border-primary bg-primary/5"
          : "hover:border-primary/40"
      )}
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* Thumbnail */}
        <div className="flex-shrink-0">
          {clinic.images && clinic.images.length > 0 ? (
            <Image
              src={clinic.images[0] || "/placeholder.svg"}
              alt={clinic.name}
              width={72}
              height={72}
              className="rounded-lg object-cover w-[72px] h-[72px]"
            />
          ) : (
            <div className="w-[72px] h-[72px] bg-muted rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm text-foreground truncate">{clinic.name}</h3>
            {isSelected && (
              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0">
                Selected
              </span>
            )}
          </div>

          {/* Match % */}
          {showMatchPercent && (
            <div className="flex items-center gap-1 text-primary font-semibold text-xs">
              <Sparkles className="w-3 h-3" />
              <span>{clinic.match_percentage}% match</span>
            </div>
          )}

          {/* Meta row: distance + rating */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {clinic.distance_miles !== undefined && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                ~{clinic.distance_miles.toFixed(1)} mi
              </span>
            )}
            {clinic.rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {clinic.rating}
              </span>
            )}
            {clinic.verified && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </span>
            )}
          </div>

          {/* 1-2 chips max */}
          {clinic.highlight_chips && clinic.highlight_chips.length > 0 && (
            <div className="flex gap-1.5 pt-0.5">
              {clinic.highlight_chips.slice(0, 2).map((chip) => {
                const chipData = getChipData(chip)
                return (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                  >
                    {chipData.label}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
