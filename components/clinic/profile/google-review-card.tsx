"use client"

import { Star } from "lucide-react"

interface GoogleReviewCardProps {
  rating: number
  reviewCount: number
  googleRating?: number
  googleReviewCount?: number
  googlePlaceId?: string
  googleMapsUrl?: string
  featuredReview?: string
  compact?: boolean
}

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const fill = Math.min(1, Math.max(0, rating - i))
        return (
          <div key={i} className="relative">
            <Star className="h-4 w-4 text-[#e5e5e5]" fill="#e5e5e5" />
            {fill > 0 && (
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className="h-4 w-4 text-amber-400" fill="#fbbf24" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function GoogleReviewCard({
  rating,
  reviewCount,
  googleRating,
  googleReviewCount,
  featuredReview,
  compact = false,
}: GoogleReviewCardProps) {
  return (
    <div className="space-y-5">
      {/* Pearlie rating */}
      <div className="flex items-start gap-6">
        <div className="flex-shrink-0">
          <div className="flex items-baseline gap-1">
            <span className={`font-bold text-[#1a1a1a] ${compact ? "text-4xl" : "text-5xl"}`}>{rating}</span>
            <span className="text-xl text-[#999]">/5</span>
          </div>
          <StarRating rating={rating} />
          {reviewCount > 0 && (
            <p className="text-sm text-[#666] mt-1">{reviewCount} reviews</p>
          )}
        </div>

        {/* Featured review quote */}
        {featuredReview && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#ccc] text-3xl leading-none">{"\u201C"}</span>
              <span className="text-xs font-bold text-[#666] uppercase tracking-wider">Trusted Review</span>
            </div>
            <p className={`text-[#444] leading-relaxed italic ${compact ? "line-clamp-2" : "line-clamp-3"}`}>
              {featuredReview}
            </p>
          </div>
        )}
      </div>

      {/* Google rating */}
      {(googleRating || googleReviewCount) && (
        <div className="flex items-center justify-between bg-[#f8f8f8] rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#1a1a1a]">{googleRating}</span>
                <StarRating rating={googleRating || 0} />
              </div>
              {googleReviewCount && (
                <p className="text-xs text-[#666]">{googleReviewCount} Google reviews</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
