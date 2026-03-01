import Image from "next/image"
import Link from "next/link"
import { Star, MapPin, CheckCircle2, ChevronRight } from "lucide-react"

interface ClinicData {
  id: string
  name: string
  slug: string | null
  city: string | null
  address: string | null
  postcode: string | null
  rating: number | null
  review_count: number | null
  images: string[] | null
  treatments: string[] | null
  price_range: string | null
  highlight_chips: string[] | null
  verified: boolean | null
  description: string | null
  google_rating: number | null
  google_review_count: number | null
}

interface TreatmentClinicCardProps {
  clinic: ClinicData
}

export function TreatmentClinicCard({ clinic }: TreatmentClinicCardProps) {
  const heroImage = clinic.images?.[0]
  const isVerified = clinic.verified === true
  const hasFinance = clinic.highlight_chips?.some(
    (chip) => /finance|pay monthly|0%/i.test(chip)
  )
  const freeConsult = clinic.highlight_chips?.some(
    (chip) => /free consult/i.test(chip)
  )

  const hasGoogleRating = clinic.google_rating != null && clinic.google_rating > 0
  const showGoogleRating =
    hasGoogleRating &&
    (clinic.rating == null || clinic.rating <= 0 || clinic.google_rating !== clinic.rating)

  return (
    <Link
      href={`/clinic/${clinic.id}`}
      className="group rounded-2xl border border-border/50 bg-card overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300 block"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={`${clinic.name} dental clinic`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0d1019] to-[#111828]">
            <span className="text-white/80 font-bold text-3xl">
              {clinic.name.charAt(0)}
            </span>
          </div>
        )}

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          {isVerified && (
            <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold bg-primary text-white rounded-full shadow-sm">
              <CheckCircle2 className="w-3 h-3" />
              Verified by Pearlie
            </span>
          )}
        </div>

        {/* Bottom overlay badges */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 flex-wrap">
          {/* Rating pills */}
          {clinic.rating != null && clinic.rating > 0 && (
            <div className="flex items-center gap-1 bg-[#111218]/80 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-[11px] text-foreground">
                {clinic.rating.toFixed(1)}
              </span>
              {clinic.review_count != null && clinic.review_count > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  ({clinic.review_count})
                </span>
              )}
            </div>
          )}
          {showGoogleRating && (
            <div className="flex items-center gap-1 bg-[#111218]/80 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-[11px] text-foreground">
                {clinic.google_rating!.toFixed(1)}
              </span>
              {clinic.google_review_count != null && clinic.google_review_count > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  ({clinic.google_review_count})
                </span>
              )}
            </div>
          )}
          {/* Feature pills */}
          {freeConsult && (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#0d1019]/90 text-white rounded-full">
              Free consultation
            </span>
          )}
          {hasFinance && (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-primary/90 text-white rounded-full">
              Finance available
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-1.5">
        <h3 className="text-base font-heading font-bold text-foreground line-clamp-1 group-hover:text-foreground transition-colors">
          {clinic.name}
        </h3>

        {(clinic.city || clinic.postcode) && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {[clinic.city, clinic.postcode].filter(Boolean).join(" · ")}
          </p>
        )}

        {clinic.description && (
          <p className="text-[13px] text-muted-foreground leading-snug line-clamp-2">
            {clinic.description}
          </p>
        )}

        {/* View clinic CTA */}
        <div className="pt-1.5 border-t border-border/30">
          <span className="inline-flex items-center gap-1 text-[13px] font-medium text-primary group-hover:text-[var(--primary-hover)] transition-colors">
            View clinic
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  )
}

export type { ClinicData }
