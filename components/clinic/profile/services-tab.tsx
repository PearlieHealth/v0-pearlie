"use client"

import { useState } from "react"
import {
  CheckCircle2,
  XCircle,
  PoundSterling,
  ChevronDown,
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { Clinic, Lead } from "./types"
import { getTreatmentsFromLead, isGeneralDentistryTreatment } from "@/lib/intake-form-config"

const ALL_FACILITIES = [
  "Wheelchair Accessible", "Parking Available", "WiFi", "TV in Rooms",
  "Refreshments", "Children's Play Area", "Private Rooms",
  "Digital X-Ray", "3D Scanning", "Same Day Appointments",
]

interface ServicesTabProps {
  clinic: Clinic
  lead: Lead | null
}

export function ServicesTab({ clinic, lead }: ServicesTabProps) {
  const [showAllTreatments, setShowAllTreatments] = useState(false)

  const availableTreatments = clinic.treatments || []

  const clinicFacilities = [...(clinic.facilities || [])]
  if (clinic.wheelchair_accessible) clinicFacilities.push("Wheelchair Accessible")
  if (clinic.parking_available) clinicFacilities.push("Parking Available")
  const availableFacilities = [...new Set(clinicFacilities)]
  const unavailableFacilities = ALL_FACILITIES.filter(
    (f) => !availableFacilities.some(
      (af) => af.toLowerCase().includes(f.toLowerCase()) || f.toLowerCase().includes(af.toLowerCase()),
    ),
  )

  const leadSelectedServices = getTreatmentsFromLead(lead)

  // Match patient's selected services against clinic's available treatments
  const treatmentMatches = (service: string, clinicTreatment: string): boolean => {
    const sLower = service.toLowerCase()
    const cLower = clinicTreatment.toLowerCase()
    // Direct substring match
    if (cLower.includes(sLower) || sLower.includes(cLower)) return true
    // General Dentistry sub-options match against "General Dentistry" clinic tag
    if (isGeneralDentistryTreatment(service) && cLower.includes("general dentistry")) return true
    return false
  }

  const matchedPatientTreatments = leadSelectedServices.filter((service) =>
    availableTreatments.some((at) => treatmentMatches(service, at)),
  )

  // Treatments not selected by patient (shown under "Show all")
  const otherTreatments = availableTreatments.filter(
    (t) => !leadSelectedServices.some((s) => treatmentMatches(s, t)),
  )

  // Filter priced categories
  const pricedCategories = (clinic.treatment_prices || [])
    .map((cat) => ({
      ...cat,
      treatments: cat.treatments.filter((t) => t.price && t.price.trim() !== ""),
    }))
    .filter((cat) => cat.treatments.length > 0)

  const hasPatientSelections = matchedPatientTreatments.length > 0

  return (
    <div className="space-y-8">
      {/* Treatments */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-[#1a1a1a]">Treatments Available</h2>
          {(hasPatientSelections ? otherTreatments.length > 0 : availableTreatments.length > 6) && (
            <button
              type="button"
              onClick={() => setShowAllTreatments(!showAllTreatments)}
              className="inline-flex items-center gap-1 text-sm font-medium text-[#666] hover:text-[#1a1a1a] transition-colors"
            >
              {showAllTreatments ? "Show less" : `Show all ${availableTreatments.length}`}
              <ChevronDown className={`h-4 w-4 transition-transform ${showAllTreatments ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>

        {/* Default view: patient's matched treatments OR first 6 */}
        <div className="grid sm:grid-cols-2 gap-2">
          {hasPatientSelections ? (
            matchedPatientTreatments.map((treatment, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-[#333] py-1.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                <span className="text-[15px] font-medium">{treatment}</span>
              </div>
            ))
          ) : (
            availableTreatments.slice(0, 6).map((treatment, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-[#333] py-1.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                <span className="text-[15px]">{treatment}</span>
              </div>
            ))
          )}
        </div>

        {/* Expanded: show remaining treatments */}
        {showAllTreatments && (
          <div className="mt-4 pt-4 border-t border-[#f0f0f0]">
            <div className="grid sm:grid-cols-2 gap-2">
              {(hasPatientSelections ? otherTreatments : availableTreatments.slice(6)).map((treatment, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-[#333] py-1.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-[15px]">{treatment}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Treatment Pricing — collapsed by default */}
      {clinic.show_treatment_prices && pricedCategories.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-[#004443]/10 flex items-center justify-center">
              <PoundSterling className="h-4 w-4 text-[#004443]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#004443]">Treatment Prices</h2>
              <p className="text-xs text-[#666]">Prices are a guide. Your dentist will confirm costs before treatment.</p>
            </div>
          </div>
          <Accordion type="multiple" className="w-full">
            {pricedCategories.map((category, catIdx) => (
              <AccordionItem key={catIdx} value={`pricing-${catIdx}`}>
                <AccordionTrigger className="text-[15px] font-semibold text-[#004443] hover:no-underline py-3 [&>svg]:text-[#004443] [&>svg]:bg-[#004443]/10 [&>svg]:rounded-full [&>svg]:p-0.5 [&>svg]:size-5">
                  <span className="flex items-center gap-2">
                    {category.category}
                    <span className="text-xs text-[#004443]/60 font-normal">
                      {category.treatments.length}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-0">
                    {category.treatments.map((treatment, treatIdx) => (
                      <div
                        key={treatIdx}
                        className="flex items-start justify-between py-2.5 border-b border-[#f0f0f0] last:border-b-0"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="font-medium text-[#1a1a1a] text-sm">{treatment.name}</p>
                          {treatment.description && (
                            <p className="text-xs text-[#666] mt-0.5">{treatment.description}</p>
                          )}
                        </div>
                        <span className="font-semibold text-[#1a1a1a] text-sm whitespace-nowrap">
                          {treatment.price.startsWith("£") ? treatment.price : `£${treatment.price}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="text-xs text-[#999] mt-4">
            Prices shown are indicative and may vary depending on individual treatment needs.
          </p>
        </section>
      )}

      {/* Facilities — collapsed */}
      {availableFacilities.length > 0 && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="facilities">
            <AccordionTrigger className="text-[15px] font-semibold text-[#1a1a1a] hover:no-underline py-3">
              Clinic Facilities
              <span className="text-xs text-[#999] font-normal ml-2">{availableFacilities.length} available</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid sm:grid-cols-2 gap-2">
                {availableFacilities.map((facility, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-[#333] py-1.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-[15px]">{facility}</span>
                  </div>
                ))}
              </div>
              {unavailableFacilities.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#f0f0f0]">
                  <div className="grid sm:grid-cols-2 gap-2">
                    {unavailableFacilities.map((facility, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[#999] py-1">
                        <XCircle className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">{facility}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  )
}
