"use client"

import { useState } from "react"
import { Shield, CheckCircle2, ShieldCheck } from "lucide-react"
import { GoogleReviewCard } from "./google-review-card"
import { OpeningHoursCard } from "./opening-hours-card"
import { LanguagesSection } from "./languages-section"
import type { Clinic } from "./types"

interface OverviewTabProps {
  clinic: Clinic
  matchReasons: string[]
  hasLead: boolean
}

export function OverviewTab({ clinic, matchReasons, hasLead }: OverviewTabProps) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)

  return (
    <div className="space-y-8">
      {/* Rating + Review */}
      <GoogleReviewCard
        rating={clinic.rating}
        reviewCount={clinic.review_count}
        googleRating={clinic.google_rating}
        googleReviewCount={clinic.google_review_count}
        googlePlaceId={clinic.google_place_id}
        googleMapsUrl={clinic.google_maps_url}
        featuredReview={clinic.featured_review}
        compact
      />

      {/* Pearlie Guarantee — OpenCare-inspired style */}
      {clinic.verified && (
        <section className="border border-[#e5e5e5] rounded-xl overflow-hidden">
          <div className="bg-[#1a1a1a] px-5 py-3 flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-white" />
            <h3 className="font-semibold text-white text-[15px]">Pearlie Guarantee</h3>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-[18px] w-[18px] text-emerald-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[#444] leading-relaxed">
                This clinic has been verified by Pearlie for quality care and transparent pricing.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-[18px] w-[18px] text-emerald-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[#444] leading-relaxed">
                If your new Pearlie dentist doesn&apos;t meet your expectations, we&apos;ll cover your next consultation or check-up fee.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Free Consultation */}
      {clinic.offers_free_consultation && (
        <section className="flex items-center gap-4 bg-[#f0f0ff] border border-indigo-200 rounded-xl p-5">
          <div className="flex-shrink-0 h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-[#1a1a1a]">Free Consultation</h3>
            <p className="text-sm text-[#666] mt-0.5">
              This clinic offers a free initial consultation for cosmetic treatments and Invisalign. Contact them to book yours.
            </p>
          </div>
        </section>
      )}

      {/* Opening Hours */}
      <OpeningHoursCard openingHours={clinic.opening_hours} />

      {/* Languages Spoken */}
      <LanguagesSection languages={clinic.languages || []} />

      {/* About */}
      {clinic.description && (
        <section>
          <h2 className="text-xl font-bold text-[#1a1a1a] mb-3">About {clinic.name}</h2>
          <div className="relative">
            <p className={`text-[#444] leading-relaxed whitespace-pre-line ${!descriptionExpanded ? "line-clamp-3" : ""}`}>
              {clinic.description}
            </p>
            {clinic.description.length > 200 && !descriptionExpanded && (
              <button
                type="button"
                onClick={() => setDescriptionExpanded(true)}
                className="text-sm font-medium text-[#1a1a1a] hover:text-[#666] mt-1 transition-colors"
              >
                Read more
              </button>
            )}
          </div>
        </section>
      )}

      {/* Match reasons (if lead exists) */}
      {hasLead && matchReasons.length > 0 && (
        <section className="border border-[#e5e5e5] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-[#999]" />
            <h3 className="font-semibold text-[#1a1a1a]">Why we matched you</h3>
          </div>
          <div className="space-y-2 text-sm text-[#333] leading-relaxed">
            {matchReasons.slice(0, 3).map((reason, idx) => (
              <p key={idx}>{reason}</p>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
