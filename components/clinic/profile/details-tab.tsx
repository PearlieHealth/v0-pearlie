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
import { OpeningHoursCard } from "./opening-hours-card"
import type { Clinic, ProviderProfile } from "./types"

interface DetailsTabProps {
  clinic: Clinic
  providers: ProviderProfile[]
}

export function DetailsTab({ clinic, providers }: DetailsTabProps) {
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)

  const hasPhotos = clinic.images && clinic.images.length > 0

  return (
    <div className="space-y-8">
      {/* Opening Hours + Photos side by side */}
      <div className={`grid gap-6 ${hasPhotos ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
        {/* Opening Hours */}
        <div>
          <OpeningHoursCard openingHours={clinic.opening_hours} />
        </div>

        {/* Photos */}
        {hasPhotos && (
          <div>
            <h2 className="text-lg font-bold text-[#1a1a1a] mb-3">Photos</h2>
            <div className="relative rounded-2xl overflow-hidden bg-[#e5e5e5] aspect-[16/9]">
              <Image
                src={clinic.images[lightboxIndex] || clinic.images[0]}
                alt={`${clinic.name} - Photo ${lightboxIndex + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 30vw"
              />
              {clinic.images.length > 1 && (
                <>
                  <button
                    onClick={() => setLightboxIndex((lightboxIndex - 1 + clinic.images.length) % clinic.images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-colors"
                  >
                    <ChevronLeftIcon className="h-4 w-4 text-[#1a1a1a]" />
                  </button>
                  <button
                    onClick={() => setLightboxIndex((lightboxIndex + 1) % clinic.images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 text-[#1a1a1a]" />
                  </button>
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-medium backdrop-blur-sm flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" />
                    {lightboxIndex + 1}/{clinic.images.length}
                  </div>
                </>
              )}
            </div>
            {clinic.images.length > 1 && (
              <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
                {clinic.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setLightboxIndex(idx)}
                    className={`flex-shrink-0 w-16 h-11 rounded-lg overflow-hidden border-2 transition-colors ${idx === lightboxIndex ? "border-[#1a1a1a]" : "border-transparent opacity-70 hover:opacity-100"}`}
                  >
                    <img src={img || "/placeholder.svg"} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-[#e5e5e5]" />

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

      {/* Before & After */}
      {clinic.before_after_images && clinic.before_after_images.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-3">Before & After</h2>
          <div className="space-y-6">
            {clinic.before_after_images
              .filter((pair) => pair.before_url || pair.after_url)
              .map((pair, idx) => (
                <div key={idx} className="border border-[#e5e5e5] rounded-xl overflow-hidden">
                  {pair.treatment && (
                    <div className="px-4 py-2.5 bg-[#fafafa] border-b border-[#e5e5e5]">
                      <p className="text-sm font-semibold text-[#1a1a1a]">{pair.treatment}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2">
                    {pair.before_url && (
                      <div className="relative bg-[#f5f5f5]">
                        <div className="relative aspect-[4/3]">
                          <Image
                            src={pair.before_url}
                            alt={`Before${pair.treatment ? ` - ${pair.treatment}` : ""}`}
                            fill
                            className="object-contain"
                            sizes="(max-width: 640px) 50vw, 30vw"
                          />
                        </div>
                        <span className="absolute top-2.5 left-2.5 text-xs font-semibold bg-[#1a1a1a]/70 text-white px-2.5 py-1 rounded-md">
                          Before
                        </span>
                      </div>
                    )}
                    {pair.after_url && (
                      <div className="relative bg-[#f5f5f5] border-l border-[#e5e5e5]">
                        <div className="relative aspect-[4/3]">
                          <Image
                            src={pair.after_url}
                            alt={`After${pair.treatment ? ` - ${pair.treatment}` : ""}`}
                            fill
                            className="object-contain"
                            sizes="(max-width: 640px) 50vw, 30vw"
                          />
                        </div>
                        <span className="absolute top-2.5 left-2.5 text-xs font-semibold bg-emerald-600/80 text-white px-2.5 py-1 rounded-md">
                          After
                        </span>
                      </div>
                    )}
                  </div>
                  {pair.description && (
                    <div className="px-4 py-2.5 border-t border-[#e5e5e5]">
                      <p className="text-sm text-[#666]">{pair.description}</p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Links (website + phone) */}
      {(clinic.website || clinic.phone) && (
        <section>
          <div className="flex flex-wrap items-center gap-4">
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
            {clinic.website && clinic.phone && (
              <span className="text-[#e5e5e5]">|</span>
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
    </div>
  )
}
