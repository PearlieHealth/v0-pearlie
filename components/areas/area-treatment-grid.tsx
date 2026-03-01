import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { TreatmentMeta } from "@/lib/content/treatments"
import type { LondonBorough } from "@/lib/data/london-boroughs"

interface AreaTreatmentGridProps {
  borough: LondonBorough
  treatments: TreatmentMeta[]
}

export function AreaTreatmentGrid({
  borough,
  treatments,
}: AreaTreatmentGridProps) {
  if (treatments.length === 0) return null

  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-foreground mb-2">
            Treatments available in {borough.name}
          </h2>
          <p className="text-muted-foreground mb-8">
            Compare clinics and pricing for specific dental treatments in{" "}
            {borough.name}.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {treatments.map((treatment) => (
              <Link
                key={treatment.slug}
                href={`/london/${borough.slug}/${treatment.slug}`}
                className="group rounded-xl border border-border/50 bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="inline-block px-2.5 py-1 text-xs font-semibold text-primary bg-primary/10 rounded-full">
                    {treatment.category}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-base font-heading font-bold text-foreground mb-1.5">
                  {treatment.treatmentName} in {borough.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  Compare verified {treatment.treatmentName.toLowerCase()}{" "}
                  providers near {borough.landmarks[0]}
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {treatment.priceRange}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
