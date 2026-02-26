import Link from "next/link"
import Image from "next/image"
import { Star, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  intakeTreatment?: string
}

export function TreatmentClinicCard({ clinic, intakeTreatment }: TreatmentClinicCardProps) {
  const intakeUrl = intakeTreatment
    ? `/intake?treatment=${encodeURIComponent(intakeTreatment)}`
    : "/intake"
  const heroImage = clinic.images?.[0]

  return (
    <div className="group rounded-2xl border border-border/50 bg-white overflow-hidden hover:shadow-lg hover:border-[#0fbcb0]/30 transition-all duration-300">
      {heroImage && (
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={heroImage}
            alt={`${clinic.name} dental clinic`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {clinic.verified && (
            <span className="absolute top-3 right-3 px-2 py-1 text-xs font-semibold bg-white/90 backdrop-blur-sm text-[#0fbcb0] rounded-full">
              Verified
            </span>
          )}
        </div>
      )}
      <div className="p-5">
        <h3 className="text-lg font-heading font-bold text-foreground mb-1.5 line-clamp-1">
          {clinic.name}
        </h3>

        {(clinic.city || clinic.postcode) && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {[clinic.city, clinic.postcode].filter(Boolean).join(" · ")}
          </p>
        )}

        <div className="flex items-center gap-3 mb-4">
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
          {clinic.price_range && (
            <span className="text-sm text-muted-foreground">
              {clinic.price_range}
            </span>
          )}
        </div>

        {clinic.highlight_chips && clinic.highlight_chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {clinic.highlight_chips.slice(0, 3).map((chip) => (
              <span
                key={chip}
                className="px-2 py-0.5 text-xs text-muted-foreground bg-secondary rounded-full"
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        <Button
          size="sm"
          className="w-full rounded-full bg-[#0fbcb0] text-white hover:bg-[#0da399] transition-colors"
          asChild
        >
          <Link href={intakeUrl}>Get matched</Link>
        </Button>
      </div>
    </div>
  )
}

export type { ClinicData }
