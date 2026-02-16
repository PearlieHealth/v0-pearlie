"use client"

import { useState } from "react"
import Image from "next/image"
import {
  Phone,
  ExternalLink,
  ChevronLeftIcon,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  GraduationCap,
  Award,
  UserRound,
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { OpeningHoursCard } from "./opening-hours-card"
import type { Clinic, ProviderProfile } from "./types"

interface DetailsTabProps {
  clinic: Clinic
  providers: ProviderProfile[]
}

export function DetailsTab({ clinic, providers }: DetailsTabProps) {
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)

  // FAQs
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
        ? "Opening hours vary by day. Please check the opening hours section above or contact the clinic directly."
        : `Please contact ${clinic.name} directly to confirm their opening hours.`,
    },
    {
      question: "How can I book an appointment?",
      answer: `You can book an appointment by ${clinic.website ? "visiting their website or " : ""}${clinic.phone ? `calling them on ${clinic.phone}` : "contacting them directly"}.`,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Opening Hours */}
      <OpeningHoursCard openingHours={clinic.opening_hours} />

      {/* Links */}
      {(clinic.website || clinic.phone) && (
        <section>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-3">Links</h2>
          <div className="space-y-3">
            {clinic.website && (
              <a
                href={clinic.website.startsWith("http") ? clinic.website : `https://${clinic.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#444] hover:text-[#1a1a1a] transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Website</span>
              </a>
            )}
            {clinic.phone && (
              <a href={`tel:${clinic.phone}`} className="flex items-center gap-2 text-[#444] hover:text-[#1a1a1a] transition-colors">
                <Phone className="h-4 w-4" />
                <span>{clinic.phone}</span>
              </a>
            )}
          </div>
        </section>
      )}

      {/* Photos */}
      {clinic.images && clinic.images.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-3">Photos</h2>
          <div className="relative rounded-2xl overflow-hidden bg-[#e5e5e5] aspect-[16/9]">
            <Image
              src={clinic.images[lightboxIndex] || clinic.images[0]}
              alt={`${clinic.name} - Photo ${lightboxIndex + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
            {clinic.images.length > 1 && (
              <>
                <button
                  onClick={() => setLightboxIndex((lightboxIndex - 1 + clinic.images.length) % clinic.images.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-colors"
                >
                  <ChevronLeftIcon className="h-5 w-5 text-[#1a1a1a]" />
                </button>
                <button
                  onClick={() => setLightboxIndex((lightboxIndex + 1) % clinic.images.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-colors"
                >
                  <ChevronRight className="h-5 w-5 text-[#1a1a1a]" />
                </button>
                <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-black/60 text-white text-sm font-medium backdrop-blur-sm flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  {lightboxIndex + 1}/{clinic.images.length}
                </div>
              </>
            )}
          </div>
          {clinic.images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
              {clinic.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setLightboxIndex(idx)}
                  className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-colors ${idx === lightboxIndex ? "border-[#1a1a1a]" : "border-transparent opacity-70 hover:opacity-100"}`}
                >
                  <img src={img || "/placeholder.svg"} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Providers */}
      {providers.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-3">Our Providers</h2>
          <div className="space-y-3">
            {providers.map((provider) => {
              const isExpanded = expandedProvider === provider.id
              const hasBio = !!provider.bio
              const hasEducation = provider.education && provider.education.length > 0
              const hasCerts = provider.certifications && provider.certifications.length > 0

              return (
                <div key={provider.id} className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-[#f0f0f0] overflow-hidden flex-shrink-0">
                        {provider.photo_url ? (
                          <img src={provider.photo_url || "/placeholder.svg"} alt={provider.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <UserRound className="h-6 w-6 text-[#999]" />
                          </div>
                        )}
                      </div>
                      <span className="font-semibold text-[#1a1a1a]">{provider.name}</span>
                    </div>
                    {(hasBio || hasEducation || hasCerts) && (
                      <button
                        type="button"
                        onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#666] border border-[#e5e5e5] rounded-full hover:bg-[#f5f5f5] transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {isExpanded ? "Less" : "More"}
                      </button>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-[#e5e5e5] pt-3 space-y-4">
                      {hasBio && <p className="text-sm text-[#444] leading-relaxed">{provider.bio}</p>}
                      {(hasEducation || hasCerts) && (
                        <div className="grid sm:grid-cols-2 gap-3">
                          {(provider.education || []).map((edu, i) => (
                            <div key={`edu-${i}`} className="flex items-start gap-2.5">
                              <div className="rounded-lg bg-[#f0f5ff] p-1.5 flex-shrink-0">
                                <GraduationCap className="h-4 w-4 text-[#3b6fcf]" />
                              </div>
                              <div>
                                <p className="font-medium text-sm text-[#1a1a1a]">{edu.degree}</p>
                                {edu.institution && <p className="text-xs text-[#666]">{edu.institution}</p>}
                              </div>
                            </div>
                          ))}
                          {(provider.certifications || []).map((cert, i) => (
                            <div key={`cert-${i}`} className="flex items-start gap-2.5">
                              <div className="rounded-lg bg-[#f0f5ff] p-1.5 flex-shrink-0">
                                <Award className="h-4 w-4 text-[#3b6fcf]" />
                              </div>
                              <div>
                                <p className="font-medium text-sm text-[#1a1a1a]">{cert.name}</p>
                                {cert.date && <p className="text-xs text-[#666]">{cert.date}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
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
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  )
}
