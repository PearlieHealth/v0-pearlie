import Link from "next/link"
import { MapPin } from "lucide-react"
import {
  getBoroughsByRegion,
  type LondonBorough,
} from "@/lib/data/london-boroughs"

interface TreatmentAreaLinksProps {
  treatmentSlug: string
  treatmentName: string
}

const REGIONS: LondonBorough["region"][] = [
  "Central",
  "North",
  "South",
  "East",
  "West",
]

export function TreatmentAreaLinks({
  treatmentSlug,
  treatmentName,
}: TreatmentAreaLinksProps) {
  return (
    <section className="py-10 sm:py-14 bg-[var(--cream)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-[#0fbcb0]" />
            <h2 className="text-xl sm:text-2xl font-heading font-bold tracking-[-0.02em] text-[#004443]">
              {treatmentName} by area
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Compare {treatmentName.toLowerCase()} clinics and pricing in your
            London borough.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {REGIONS.map((region) => {
              const boroughs = getBoroughsByRegion(region)
              if (boroughs.length === 0) return null

              return (
                <div key={region}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    {region} London
                  </h3>
                  <ul className="space-y-1.5">
                    {boroughs.map((borough) => (
                      <li key={borough.slug}>
                        <Link
                          href={`/london/${borough.slug}/${treatmentSlug}`}
                          className="text-sm text-foreground hover:text-[#0fbcb0] transition-colors"
                        >
                          {borough.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
