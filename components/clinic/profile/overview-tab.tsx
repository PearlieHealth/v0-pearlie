"use client"

import { useState } from "react"
import { CheckCircle2, ShieldCheck, ChevronDown, ArrowRight } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { GoogleReviewCard } from "./google-review-card"
import { LanguagesSection } from "./languages-section"
import type { Clinic, Lead } from "./types"
import { getTreatmentsFromLead } from "@/lib/intake-form-config"

interface OverviewTabProps {
  clinic: Clinic
  matchReasons: string[]
  hasLead: boolean
  lead: Lead | null
  onSwitchToDetails?: () => void
}

export function OverviewTab({ clinic, matchReasons, hasLead, lead, onSwitchToDetails }: OverviewTabProps) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [showAllTreatments, setShowAllTreatments] = useState(false)

  // Services matching logic (reused from ServicesTab)
  const availableTreatments = clinic.treatments || []
  const leadSelectedServices = getTreatmentsFromLead(lead)

  // Use patient's selected treatments directly as Treatment Focus
  // (backend matching already validated the clinic can handle these)
  const hasPatientSelections = leadSelectedServices.length > 0
  const hasBeforeAfters = (clinic.before_after_images?.length ?? 0) > 0

  // FAQs (relocated from details tab)
  const faqs = [
    {
      question: `Where is ${clinic.name} located?`,
      answer: `${clinic.name} is located at ${clinic.address}, ${clinic.postcode}${clinic.city ? `, ${clinic.city}` : ""}.`,
    },
    {
      question: `What treatments are available at ${clinic.name}?`,
      answer: `${clinic.name} offers a range of dental treatments including: ${clinic.treatments.slice(0, 5).join(", ")}${(clinic.treatments?.length || 0) > 5 ? ` and ${clinic.treatments.length - 5} more services` : ""}.`,
    },
    {
      question: `Does ${clinic.name} accept NHS patients?`,
      answer: clinic.accepts_nhs
        ? `Yes, ${clinic.name} accepts NHS patients alongside private treatments.`
        : `${clinic.name} is a private dental practice. Contact them directly for pricing information.`,
    },
    {
      question: "What are the opening hours?",
      answer: clinic.opening_hours && Object.keys(clinic.opening_hours).length > 0
        ? "Opening hours vary by day. Please check the Details tab or contact the clinic directly."
        : `Please contact ${clinic.name} directly to confirm their opening hours.`,
    },
    {
      question: "How can I book an appointment?",
      answer: `You can message ${clinic.name} directly through Pearlie to arrange an appointment, or simply request a visit by choosing from the available times.`,
    },
    {
      question: "Can I see before and after photos of treatments?",
      answer: hasBeforeAfters
        ? "Yes — this clinic has shared before and after case photos with patient consent. You can view them in the Details section. Results vary depending on individual clinical needs, oral health, and treatment complexity."
        : `This clinic does not currently display before and after photos publicly. You can request examples directly through the enquiry form.`,
    },
  ]

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

      {/* Pearlie Guarantee */}
      {clinic.verified && (
        <section className="rounded-2xl bg-[#004443] p-5 shadow-lg">
          <div className="flex items-center gap-2.5 mb-2">
            <ShieldCheck className="h-6 w-6 text-[#0fbcb0]" />
            <h3 className="text-xl font-bold text-white">Pearlie Guarantee</h3>
          </div>
          <p className="text-xs text-white/70 leading-relaxed mb-4">
            Every clinic on Pearlie is held to our quality standards — and backed by our promise to you.
          </p>

          <div className="space-y-3.5">
            <div className="flex gap-2.5">
              <div className="flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-[#0fbcb0]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white">Verified for Quality</p>
                <p className="text-xs text-white/60 leading-relaxed mt-0.5">
                  This clinic has been verified by Pearlie for quality care and transparent pricing.
                </p>
              </div>
            </div>

            <div className="flex gap-2.5">
              <div className="flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-[#0fbcb0]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white">Satisfaction Promise</p>
                <p className="text-xs text-white/60 leading-relaxed mt-0.5">
                  If your new Pearlie dentist doesn&apos;t meet your expectations, we&apos;ll cover your next consultation or check-up fee.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Treatment Focus — matched treatments shown prominently, rest collapsed */}
      {(availableTreatments.length > 0 || hasPatientSelections) && (
        <section>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-3">
            {hasPatientSelections ? "Treatment Focus" : "Services"}
          </h2>

          {/* Patient's selected treatments shown prominently */}
          {hasPatientSelections && (
            <div className="grid sm:grid-cols-2 gap-2 mb-3">
              {leadSelectedServices.map((treatment, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-[#333] py-1.5">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                  <span className="text-[15px] font-medium">{treatment}</span>
                </div>
              ))}
            </div>
          )}

          {/* All clinic services — collapsed when patient has selections */}
          {hasPatientSelections && availableTreatments.length > 0 ? (
            <div>
              <button
                type="button"
                onClick={() => setShowAllTreatments(!showAllTreatments)}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#666] hover:text-[#1a1a1a] transition-colors"
              >
                {showAllTreatments ? "Hide other services" : `+${availableTreatments.length} other services`}
                <ChevronDown className={`h-4 w-4 transition-transform ${showAllTreatments ? "rotate-180" : ""}`} />
              </button>
              {showAllTreatments && (
                <div className="grid sm:grid-cols-2 gap-2 mt-2">
                  {availableTreatments.map((treatment, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 text-[#333] py-1.5">
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                      <span className="text-[15px]">{treatment}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : !hasPatientSelections ? (
            /* No patient context — show all with show more toggle */
            <>
              <div className="grid sm:grid-cols-2 gap-2">
                {(showAllTreatments ? availableTreatments : availableTreatments.slice(0, 6)).map((treatment, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-[#333] py-1.5">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                    <span className="text-[15px]">{treatment}</span>
                  </div>
                ))}
              </div>
              {availableTreatments.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllTreatments(!showAllTreatments)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#666] hover:text-[#1a1a1a] transition-colors mt-2"
                >
                  {showAllTreatments ? "Show less" : `Show all ${availableTreatments.length}`}
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAllTreatments ? "rotate-180" : ""}`} />
                </button>
              )}
            </>
          ) : null}
        </section>
      )}

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

      {/* FAQs */}
      <section>
        <h2 className="text-lg font-bold text-[#1a1a1a] mb-3">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, idx) => (
            <AccordionItem key={idx} value={`faq-${idx}`}>
              <AccordionTrigger className="text-[15px] font-medium text-[#1a1a1a] hover:no-underline text-left py-3">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-[#666] leading-relaxed">{faq.answer}</p>
                {faq.question === "Can I see before and after photos of treatments?" && hasBeforeAfters && onSwitchToDetails && (
                  <button
                    type="button"
                    onClick={onSwitchToDetails}
                    className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-[#004443] hover:text-[#0fbcb0] transition-colors"
                  >
                    View Smile Results
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Match reasons — mobile only */}
      {hasLead && matchReasons.length > 0 && (
        <section className="lg:hidden border border-[#0fbcb0]/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold text-[#0fbcb0]">Why we matched you</h3>
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
