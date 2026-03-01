"use client"

import { Card } from "@/components/ui/card"
import { MapPin, Star, Sparkles, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { getChipData } from "@/lib/chipData"
import { ClinicImage } from "@/components/match/clinic-image"

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
        "p-2 cursor-pointer transition-all duration-150 hover:shadow-sm active:scale-[0.99] bg-card rounded-lg",
        isSelected
          ? "ring-2 ring-primary border-primary"
          : "border-border/40 hover:border-primary/40"
      )}
      onClick={onClick}
    >
      <div className="flex gap-2">
        {/* Thumbnail */}
        <div className="flex-shrink-0">
          {clinic.images && clinic.images.length > 0 ? (
            <ClinicImage
              src={clinic.images[0]}
              alt={clinic.name}
              width={48}
              height={48}
              className="rounded object-cover w-[40px] h-[40px] sm:w-[48px] sm:h-[48px]"
              fallbackClassName="w-[40px] h-[40px] sm:w-[48px] sm:h-[48px] rounded flex items-center justify-center bg-[#0d1019]"
            />
          ) : (
            <div className="w-[40px] h-[40px] sm:w-[48px] sm:h-[48px] bg-muted rounded flex items-center justify-center">
              <MapPin className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-start justify-between gap-1">
            <h3 className="font-semibold text-xs text-foreground truncate">{clinic.name}</h3>
            {isSelected && (
              <span className="text-[9px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0">
                Selected
              </span>
            )}
          </div>

          {/* Match % + meta inline */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
            {showMatchPercent && (
              <span className="flex items-center gap-0.5 text-primary font-semibold">
                <Sparkles className="w-3 h-3" />
                {clinic.match_percentage}%
              </span>
            )}
            {clinic.distance_miles !== undefined && (
              <span className="flex items-center gap-0.5">
                <MapPin className="w-3 h-3" />
                ~{clinic.distance_miles.toFixed(1)} mi
              </span>
            )}
            {clinic.rating > 0 && (
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {clinic.rating}
              </span>
            )}
            {clinic.verified && (
              <span className="flex items-center gap-0.5 text-green-600">
                <CheckCircle2 className="w-3 h-3" />
                <span className="hidden sm:inline">Verified</span>
              </span>
            )}
          </div>

          {/* 1-2 chips max */}
          {clinic.highlight_chips && clinic.highlight_chips.length > 0 && (
            <div className="flex gap-1 pt-0.5">
              {clinic.highlight_chips.slice(0, 2).map((chip) => {
                const chipData = getChipData(chip)
                return (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-0.5 text-[9px] font-medium text-foreground bg-muted/60 px-1 py-0.5 rounded"
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
