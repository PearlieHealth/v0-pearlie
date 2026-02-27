import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Star, CheckCircle2, ChevronRight } from "lucide-react"
import { ClinicImage } from "@/components/match/clinic-image"
import type { LocationClinic } from "@/lib/locations/queries"

interface LocationClinicCardProps {
  clinic: LocationClinic
}

export function LocationClinicCard({ clinic }: LocationClinicCardProps) {
  const hasGoogleRating = clinic.google_rating != null && clinic.google_rating > 0

  return (
    <Link href={`/clinic/${clinic.id}`} className="snap-start flex-shrink-0 w-[280px] sm:w-[300px] md:w-[320px] group">
      <Card className="h-full overflow-hidden border border-[#e8e4dc] shadow-none rounded-2xl bg-white group-hover:shadow-md group-hover:border-[#d5cfc8] group-hover:-translate-y-0.5 transition-all duration-300 ease-out">
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
          <h3 className="text-[15px] font-semibold text-foreground leading-tight line-clamp-1 group-hover:text-[#004443] transition-colors">
            {clinic.name}
          </h3>

          {/* Location + distance */}
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{clinic.address}{clinic.postcode ? `, ${clinic.postcode}` : ""}</span>
            <span className="flex-shrink-0 text-xs">&middot; {clinic.distance_miles.toFixed(1)} mi</span>
          </div>

          {/* Ratings row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Pearlie rating */}
            {clinic.rating > 0 && (
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                <span className="font-medium text-[13px]">{clinic.rating}</span>
                {clinic.review_count > 0 && (
                  <span className="text-muted-foreground text-[13px]">
                    ({clinic.review_count})
                  </span>
                )}
              </div>
            )}
            {/* Google rating */}
            {hasGoogleRating && (
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="font-medium text-[13px]">{clinic.google_rating}</span>
                {clinic.google_review_count != null && clinic.google_review_count > 0 && (
                  <span className="text-muted-foreground text-[13px]">
                    ({clinic.google_review_count})
                  </span>
                )}
              </div>
            )}
          </div>

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

          {/* View clinic CTA */}
          <div className="pt-1">
            <span className="inline-flex items-center gap-1 text-[13px] font-medium text-[#0fbcb0] group-hover:text-[#0da399] transition-colors">
              View clinic
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </Card>
    </Link>
  )
}
