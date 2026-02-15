"use client"

import { useState } from "react"
import {
  CheckCircle2,
  XCircle,
  CreditCard,
  PoundSterling,
  ChevronDown,
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { Clinic, Lead } from "./types"

// All possible treatments for dental clinics
const ALL_TREATMENTS = [
  "Dental Implants", "Composite Bonding", "Veneers", "Teeth Whitening",
  "Invisalign", "Braces", "Checkups", "Cleaning", "Fillings",
  "Extractions", "Root Canal", "Crowns", "Bridges", "Dentures",
  "Emergency Care", "Sedation Dentistry",
]

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
  const unavailableTreatments = ALL_TREATMENTS.filter(
    (t) => !availableTreatments.some(
      (at) => at.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(at.toLowerCase()),
    ),
  )

  const clinicFacilities = [...(clinic.facilities || [])]
  if (clinic.wheelchair_accessible) clinicFacilities.push("Wheelchair Accessible")
  if (clinic.parking_available) clinicFacilities.push("Parking Available")
  const availableFacilities = [...new Set(clinicFacilities)]
  const unavailableFacilities = ALL_FACILITIES.filter(
    (f) => !availableFacilities.some(
      (af) => af.toLowerCase().includes(f.toLowerCase()) || f.toLowerCase().includes(af.toLowerCase()),
    ),
  )

  const leadSelectedServices = lead?.treatment_interest
    ? lead.treatment_interest.split(",").map((s) => s.trim()).filter(Boolean)
    : []

  // Filter priced categories
  const pricedCategories = (clinic.treatment_prices || [])
    .map((cat) => ({
      ...cat,
      treatments: cat.treatments.filter((t) => t.price && t.price.trim() !== ""),
    }))
    .filter((cat) => cat.treatments.length > 0)

  return (
    <div className="space-y-8">
      {/* Patient selected treatments */}
      {leadSelectedServices.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-3">Your Selected Treatments</h2>
          <div className="space-y-2">
            {leadSelectedServices.map((service, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                <span className="text-[#333] font-medium">{service}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Treatments */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-[#1a1a1a]">
            {leadSelectedServices.length > 0 ? "All Treatments" : "Treatments Available"}
          </h2>
          {availableTreatments.length > 6 && (
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
        <div className="grid sm:grid-cols-2 gap-2">
          {(showAllTreatments ? availableTreatments : availableTreatments.slice(0, 6)).map((treatment, idx) => (
            <div key={idx} className="flex items-center gap-2.5 text-[#333] py-1.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              <span className="text-[15px]">{treatment}</span>
            </div>
          ))}
        </div>
        {showAllTreatments && unavailableTreatments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#f0f0f0]">
            <h3 className="text-sm font-semibold text-[#999] mb-2">Not Listed</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {unavailableTreatments.map((treatment, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[#999] py-1">
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{treatment}</span>
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
            <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-[#f5f0ff] flex items-center justify-center">
              <PoundSterling className="h-4 w-4 text-[#7c3aed]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1a1a1a]">Treatment Prices</h2>
              <p className="text-xs text-[#666]">Prices are a guide. Your dentist will confirm costs before treatment.</p>
            </div>
          </div>
          <Accordion type="multiple" className="w-full">
            {pricedCategories.map((category, catIdx) => (
              <AccordionItem key={catIdx} value={`pricing-${catIdx}`}>
                <AccordionTrigger className="text-[15px] font-semibold text-[#1a1a1a] hover:no-underline py-3">
                  {category.category}
                  <span className="text-xs text-[#999] font-normal ml-2">
                    {category.treatments.length} treatment{category.treatments.length !== 1 ? "s" : ""}
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

      {/* Insurance & Payment */}
      <section className="flex items-start gap-4">
        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-[#f0f5f0] flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-bold text-[#1a1a1a]">
            {clinic.accepts_nhs ? "NHS & Private Patients Accepted" : "Private Practice"}
          </h3>
          <p className="text-sm text-[#666] mt-1 leading-relaxed">
            {clinic.accepts_nhs
              ? `${clinic.name} accepts both NHS and private patients. Contact the clinic directly for pricing and insurance queries.`
              : `${clinic.name} is a private dental practice offering flexible payment options. Contact them directly for pricing information.`}
          </p>
        </div>
      </section>

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
