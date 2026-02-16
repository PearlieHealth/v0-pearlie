"use client"

import { Shield, ExternalLink } from "lucide-react"
import { GoogleReviewCard } from "./google-review-card"
import type { Clinic } from "./types"

interface ReviewsTabProps {
  clinic: Clinic
}

export function ReviewsTab({ clinic }: ReviewsTabProps) {
  const googleReviewsUrl = clinic.google_place_id
    ? `https://search.google.com/local/reviews?placeid=${clinic.google_place_id}`
    : clinic.google_maps_url || null

  return (
    <div className="space-y-8">
      {/* Full review display */}
      <GoogleReviewCard
        rating={clinic.rating}
        reviewCount={clinic.review_count}
        googleRating={clinic.google_rating}
        googleReviewCount={clinic.google_review_count}
        googlePlaceId={clinic.google_place_id}
        googleMapsUrl={clinic.google_maps_url}
        featuredReview={clinic.featured_review}
      />

      {/* Google reviews CTA */}
      {googleReviewsUrl && (
        <a
          href={googleReviewsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border border-[#e5e5e5] text-[#333] font-medium hover:bg-[#fafafa] transition-colors"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          See all reviews on Google
          <ExternalLink className="h-4 w-4 text-[#999]" />
        </a>
      )}

      {/* Trust indicators */}
      <div className="space-y-4 pt-2">
        {clinic.verified && (
          <div className="flex items-center gap-3 text-sm text-[#444]">
            <Shield className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            <span>Verified by Pearlie — quality care guaranteed</span>
          </div>
        )}
        {clinic.review_count > 0 && (
          <div className="flex items-center gap-3 text-sm text-[#444]">
            <div className="h-5 w-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-amber-700">{clinic.rating}</span>
            </div>
            <span>Rated {clinic.rating}/5 based on {clinic.review_count} patient reviews</span>
          </div>
        )}
      </div>
    </div>
  )
}
