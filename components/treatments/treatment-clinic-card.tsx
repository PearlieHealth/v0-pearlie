import Image from "next/image"
import Link from "next/link"
import { Star, MapPin, BadgeCheck } from "lucide-react"

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
}

interface TreatmentClinicCardProps {
  clinic: ClinicData
}

export function TreatmentClinicCard({ clinic }: TreatmentClinicCardProps) {
  const heroImage = clinic.images?.[0]
  const hasFinance = clinic.highlight_chips?.some(
    (chip) => /finance|pay monthly|0%/i.test(chip)
  )
  const freeConsult = clinic.highlight_chips?.some(
    (chip) => /free consult/i.test(chip)
  )

  return (
    <Link href={`/clinic/${clinic.id}`} className="group rounded-2xl border border-border/50 bg-white overflow-hidden hover:shadow-lg hover:border-[#0fbcb0]/30 transition-all duration-300 block">
      {heroImage && (
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={heroImage}
            alt={`${clinic.name} dental clinic`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {clinic.verified && (
            <div className="absolute top-3 right-3">
              <span className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-white/90 backdrop-blur-sm text-[#0fbcb0] rounded-full">
                <BadgeCheck className="w-3 h-3" />
                Verified
              </span>
            </div>
          )}
          {/* Overlay badges */}
          <div className="absolute bottom-3 left-3 flex gap-1.5 flex-wrap">
            {freeConsult && (
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#004443]/90 text-white rounded-full">
                Free consultation
              </span>
            )}
            {hasFinance && (
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#0fbcb0]/90 text-white rounded-full">
                Finance available
              </span>
            )}
          </div>
        </div>
      )}
      <div className="p-4">
        <h3 className="text-base font-heading font-bold text-foreground mb-1.5 line-clamp-1">
          {clinic.name}
        </h3>

        {(clinic.city || clinic.postcode) && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {[clinic.city, clinic.postcode].filter(Boolean).join(" · ")}
          </p>
        )}

        {/* Price range */}
        {clinic.price_range && (
          <p className="text-sm font-semibold text-[#004443] mb-2">
            {clinic.price_range}
          </p>
        )}

        {/* Description snippet */}
        {clinic.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-relaxed">
            {clinic.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          {clinic.rating != null && (
            <span className="flex items-center gap-1 text-sm font-medium text-foreground">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              {clinic.rating.toFixed(1)}
              {clinic.review_count != null && clinic.review_count > 0 && (
                <span className="text-muted-foreground font-normal">
                  ({clinic.review_count})
                </span>
              )}
            </span>
          )}
          <span className="text-xs font-semibold text-[#0fbcb0] group-hover:underline">
            View profile &rarr;
          </span>
        </div>
      </div>
    </Link>
  )
}

export type { ClinicData }
