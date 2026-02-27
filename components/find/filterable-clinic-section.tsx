"use client"

import { useState, useMemo } from "react"
import { Shield } from "lucide-react"
import { LocationClinicCard } from "./location-clinic-card"
import type { LocationClinic } from "@/lib/locations/queries"

type ClinicFilter = "all" | "nhs" | "private" | "denplan"

const FILTERS: { value: ClinicFilter; label: string }[] = [
  { value: "all", label: "All Clinics" },
  { value: "nhs", label: "NHS" },
  { value: "private", label: "Private" },
  { value: "denplan", label: "Denplan" },
]

interface FilterableClinicSectionProps {
  clinics: LocationClinic[]
  areaName: string
  variant?: "area" | "region"
}

export function FilterableClinicSection({ clinics, areaName, variant = "area" }: FilterableClinicSectionProps) {
  const [activeFilter, setActiveFilter] = useState<ClinicFilter>("all")

  const filteredClinics = useMemo(() => {
    switch (activeFilter) {
      case "nhs":
        return clinics.filter((c) => c.accepts_nhs)
      case "private":
        return clinics.filter((c) => !c.accepts_nhs)
      case "denplan": {
        const denplanTags = ["denplan", "Denplan"]
        return clinics.filter((c) =>
          c.tags?.some((t) => denplanTags.includes(t.toLowerCase())) ||
          c.highlight_chips?.some((chip) => chip.toLowerCase().includes("denplan"))
        )
      }
      default:
        return clinics
    }
  }, [clinics, activeFilter])

  const nhsCount = clinics.filter((c) => c.accepts_nhs).length
  const bgClass = variant === "region" ? "bg-white" : "bg-[#faf9f6]"

  return (
    <section className={`py-10 sm:py-14 ${bgClass} overflow-hidden`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-4 text-[#004443]">
            Dental clinics {variant === "region" ? "in" : "near"} {areaName}
          </h2>
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {FILTERS.map((filter) => {
              const isActive = activeFilter === filter.value
              const count = filter.value === "nhs" ? nhsCount : undefined
              return (
                <button
                  key={filter.value}
                  onClick={() => setActiveFilter(filter.value)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[#004443] text-white shadow-sm"
                      : "bg-white border border-border/60 text-muted-foreground hover:border-[#0fbcb0]/40 hover:text-foreground"
                  }`}
                >
                  {filter.value === "all" && <Shield className={`w-3 h-3 ${isActive ? "text-[#0fbcb0]" : "text-[#0fbcb0]"}`} />}
                  {filter.label}
                  {count !== undefined && count > 0 && (
                    <span className={`text-[10px] ${isActive ? "text-white/70" : "text-muted-foreground/60"}`}>
                      ({count})
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      {filteredClinics.length > 0 ? (
        <div className="flex gap-4 md:gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide px-4 sm:px-6 lg:px-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] pb-4 -mb-4">
          {filteredClinics.map((clinic) => (
            <LocationClinicCard key={clinic.id} clinic={clinic} />
          ))}
        </div>
      ) : (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center py-10 rounded-xl bg-white border border-border/40">
              <p className="text-muted-foreground text-sm mb-1">
                No {activeFilter === "nhs" ? "NHS" : activeFilter === "denplan" ? "Denplan" : "private"} clinics found in {areaName}
              </p>
              <button
                onClick={() => setActiveFilter("all")}
                className="text-sm font-medium text-[#0fbcb0] hover:text-[#0da399] transition-colors"
              >
                Show all clinics
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
