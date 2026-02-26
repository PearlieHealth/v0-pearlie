"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Star, CheckCircle2 } from "lucide-react"
import { ClinicImage } from "@/components/match/clinic-image"
import Link from "next/link"
import type { LocationClinic } from "@/lib/locations/queries"

interface LocationClinicCardProps {
  clinic: LocationClinic
}

export function LocationClinicCard({ clinic }: LocationClinicCardProps) {
  return (
    <Card className="overflow-hidden border-border/40 hover:border-primary/40 transition-all duration-150 hover:shadow-md">
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="relative w-full sm:w-48 h-40 sm:h-auto flex-shrink-0 bg-muted">
          {clinic.images && clinic.images.length > 0 ? (
            <ClinicImage
              src={clinic.images[0]}
              alt={clinic.name}
              fill
              className="object-cover"
              fallbackClassName="w-full h-full flex items-center justify-center bg-[#004443]"
            />
          ) : (
            <div className="w-full h-full min-h-[160px] flex items-center justify-center bg-[#004443]">
              <span className="text-white font-bold text-2xl">
                {clinic.name.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-5 space-y-3">
          {/* Name + verified */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold text-foreground leading-tight">
              {clinic.name}
            </h3>
            {clinic.verified && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified
              </span>
            )}
          </div>

          {/* Location + distance */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {clinic.address}{clinic.postcode ? `, ${clinic.postcode}` : ""}
            </span>
            <span className="text-xs">~{clinic.distance_miles.toFixed(1)} mi</span>
          </div>

          {/* Rating */}
          {clinic.rating > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{clinic.rating}</span>
              {clinic.review_count > 0 && (
                <span className="text-muted-foreground">
                  ({clinic.review_count} {clinic.review_count === 1 ? "review" : "reviews"})
                </span>
              )}
            </div>
          )}

          {/* Treatments */}
          {clinic.treatments && clinic.treatments.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {clinic.treatments.slice(0, 4).map((t) => (
                <Badge key={t} variant="secondary" className="text-xs font-normal">
                  {t}
                </Badge>
              ))}
              {clinic.treatments.length > 4 && (
                <Badge variant="secondary" className="text-xs font-normal">
                  +{clinic.treatments.length - 4} more
                </Badge>
              )}
            </div>
          )}

          {/* Price range + CTA */}
          <div className="flex items-center justify-between pt-1">
            {clinic.price_range && (
              <span className="text-xs text-muted-foreground">
                Price range: {clinic.price_range}
              </span>
            )}
            <Link
              href="/intake"
              className="text-sm font-medium text-[#0fbcb0] hover:text-[#0da399] transition-colors ml-auto"
            >
              Get matched &rarr;
            </Link>
          </div>
        </div>
      </div>
    </Card>
  )
}
