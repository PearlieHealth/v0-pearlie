"use client"

import { useEffect, useState } from "react"
import { Shield, ExternalLink, Star, ChevronDown } from "lucide-react"
import { GoogleReviewCard } from "./google-review-card"
import type { Clinic } from "./types"

interface GoogleReview {
  authorName: string
  authorPhotoUrl: string | null
  rating: number
  relativeTime: string
  text: string
}

interface ReviewsTabProps {
  clinic: Clinic
  clinicId: string
}

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const fill = Math.min(1, Math.max(0, rating - i))
        return (
          <div key={i} className="relative">
            <Star className="h-3.5 w-3.5 text-[#e5e5e5]" fill="#e5e5e5" />
            {fill > 0 && (
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className="h-3.5 w-3.5 text-amber-400" fill="#fbbf24" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ReviewSkeleton() {
  return (
    <div className="animate-pulse space-y-3 py-4 border-b border-[#f0f0f0] last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-[#e5e5e5]" />
        <div className="space-y-1.5">
          <div className="h-3.5 w-24 bg-[#e5e5e5] rounded" />
          <div className="h-3 w-16 bg-[#e5e5e5] rounded" />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-full bg-[#e5e5e5] rounded" />
        <div className="h-3 w-3/4 bg-[#e5e5e5] rounded" />
      </div>
    </div>
  )
}

export function ReviewsTab({ clinic, clinicId }: ReviewsTabProps) {
  const [googleReviews, setGoogleReviews] = useState<GoogleReview[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [expandedReviews, setExpandedReviews] = useState<Set<number>>(new Set())

  const googleReviewsUrl = clinic.google_place_id
    ? `https://search.google.com/local/reviews?placeid=${clinic.google_place_id}`
    : clinic.google_maps_url || null

  useEffect(() => {
    const fetchGoogleReviews = async () => {
      try {
        const res = await fetch(`/api/clinics/${clinicId}/google-reviews`)
        if (res.ok) {
          const data = await res.json()
          setGoogleReviews(data.reviews || [])
          if (data.error) {
            console.warn("[ReviewsTab] API returned error:", data.error, data.detail)
            setFetchError(data.error)
          }
        } else {
          setFetchError(`http_${res.status}`)
        }
      } catch (err) {
        console.error("[ReviewsTab] Fetch failed:", err)
        setFetchError("network_error")
      } finally {
        setLoading(false)
      }
    }

    fetchGoogleReviews()
  }, [clinicId])

  const toggleExpanded = (idx: number) => {
    setExpandedReviews((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) {
        next.delete(idx)
      } else {
        next.add(idx)
      }
      return next
    })
  }

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

      {/* Individual Google Reviews */}
      {loading ? (
        <div>
          <ReviewSkeleton />
          <ReviewSkeleton />
          <ReviewSkeleton />
        </div>
      ) : googleReviews.length > 0 ? (
        <section>
          <h3 className="text-base font-semibold text-[#1a1a1a] mb-2">Google Reviews</h3>
          <div className="divide-y divide-[#f0f0f0]">
            {googleReviews.map((review, idx) => {
              const isLong = review.text.length > 200
              const isExpanded = expandedReviews.has(idx)
              return (
                <div key={idx} className="py-4">
                  <div className="flex items-center gap-3 mb-2">
                    {review.authorPhotoUrl ? (
                      <img
                        src={review.authorPhotoUrl}
                        alt={review.authorName}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-[#0fbcb0]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-[#004443]">
                          {review.authorName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-[#1a1a1a]">{review.authorName}</p>
                      <div className="flex items-center gap-2">
                        <StarRating rating={review.rating} />
                        <span className="text-xs text-[#999]">{review.relativeTime}</span>
                      </div>
                    </div>
                  </div>
                  {review.text && (
                    <div>
                      <p className={`text-sm text-[#444] leading-relaxed ${!isExpanded && isLong ? "line-clamp-3" : ""}`}>
                        {review.text}
                      </p>
                      {isLong && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(idx)}
                          className="text-sm font-medium text-[#1a1a1a] hover:text-[#666] mt-1 transition-colors"
                        >
                          {isExpanded ? "Show less" : "Read more"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ) : fetchError ? (
        <div className="text-sm text-[#999] py-4">
          {fetchError === "no_google_place_id" && "Google profile not linked yet."}
          {fetchError === "api_key_missing" && "Google Places API key not configured."}
          {fetchError === "google_api_error" && "Could not load Google reviews right now."}
          {fetchError === "clinic_lookup_failed" && "Could not find clinic data."}
          {!["no_google_place_id", "api_key_missing", "google_api_error", "clinic_lookup_failed"].includes(fetchError) &&
            "Could not load reviews."}
        </div>
      ) : null}

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
