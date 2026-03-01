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

const GoogleIcon = () => (
  <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

export function TreatmentClinicCard({ clinic }: TreatmentClinicCardProps) {
  const heroImage = clinic.images?.[0]
  const isVerified = clinic.verified === true

  const hasGoogleRating = clinic.google_rating != null && clinic.google_rating > 0
  const showGoogleRating =
    hasGoogleRating &&
    (clinic.rating == null || clinic.rating <= 0 || clinic.google_rating !== clinic.rating)

  return (
    <Link
      href={`/clinic/${clinic.id}`}
      className="group rounded-2xl border border-border/50 bg-white overflow-hidden hover:shadow-lg hover:border-[#0fbcb0]/30 transition-all duration-300 block"
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
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#004443] to-[#00625e]">
            <span className="text-white/80 font-bold text-3xl">
              {clinic.name.charAt(0)}
            </span>
          </div>
        )}

        {/* Top badges */}
        {isVerified && (
          <span className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold bg-[#0fbcb0] text-white rounded-full shadow-sm">
            <CheckCircle2 className="w-3 h-3" />
            Verified by Pearlie
          </span>
        )}

        {/* Bottom rating overlay */}
        {(clinic.rating != null && clinic.rating > 0 || showGoogleRating) && (
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            {clinic.rating != null && clinic.rating > 0 && (
              <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm">
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
              <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm">
                <GoogleIcon />
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
          </div>
        )}
      </div>

      <div className="p-4 space-y-1.5">
        <h3 className="text-base font-heading font-bold text-foreground line-clamp-1 group-hover:text-[#004443] transition-colors">
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
          <span className="inline-flex items-center gap-1 text-[13px] font-medium text-[#0fbcb0] group-hover:text-[#0da399] transition-colors">
            View clinic
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  )
}

export type { ClinicData }
