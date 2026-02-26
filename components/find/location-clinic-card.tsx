import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Star, CheckCircle2 } from "lucide-react"
import { ClinicImage } from "@/components/match/clinic-image"
import type { LocationClinic } from "@/lib/locations/queries"

interface LocationClinicCardProps {
  clinic: LocationClinic
}

export function LocationClinicCard({ clinic }: LocationClinicCardProps) {
  return (
    <Card className="snap-start flex-shrink-0 w-[280px] sm:w-[300px] md:w-[320px] overflow-hidden border border-[#e8e4dc] shadow-none rounded-2xl bg-white hover:shadow-md hover:border-[#d5cfc8] hover:-translate-y-0.5 transition-all duration-300 ease-out">
      {/* Image */}
      <div className="relative w-full h-40 bg-muted">
        {clinic.images && clinic.images.length > 0 ? (
          <ClinicImage
            src={clinic.images[0]}
            alt={clinic.name}
            fill
            className="object-cover"
            fallbackClassName="w-full h-full flex items-center justify-center bg-[#004443]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#004443]">
            <span className="text-white font-bold text-2xl">
              {clinic.name.charAt(0)}
            </span>
          </div>
        )}
        {clinic.verified && (
          <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            Verified
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2.5">
        {/* Name */}
        <h3 className="text-[15px] font-semibold text-foreground leading-tight line-clamp-1">
          {clinic.name}
        </h3>

        {/* Location + distance */}
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{clinic.address}{clinic.postcode ? `, ${clinic.postcode}` : ""}</span>
          <span className="flex-shrink-0 text-xs">&middot; {clinic.distance_miles.toFixed(1)} mi</span>
        </div>

        {/* Rating */}
        {clinic.rating > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="font-medium text-[13px]">{clinic.rating}</span>
            {clinic.review_count > 0 && (
              <span className="text-muted-foreground text-[13px]">
                ({clinic.review_count} {clinic.review_count === 1 ? "review" : "reviews"})
              </span>
            )}
          </div>
        )}

        {/* Treatments */}
        {clinic.treatments && clinic.treatments.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {clinic.treatments.slice(0, 3).map((t) => (
              <Badge key={t} variant="secondary" className="text-[11px] font-normal px-2 py-0.5">
                {t}
              </Badge>
            ))}
            {clinic.treatments.length > 3 && (
              <Badge variant="secondary" className="text-[11px] font-normal px-2 py-0.5">
                +{clinic.treatments.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Price range */}
        {clinic.price_range && (
          <p className="text-xs text-muted-foreground">
            {clinic.price_range}
          </p>
        )}
      </div>
    </Card>
  )
}
