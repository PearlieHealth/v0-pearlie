import { TreatmentCard } from "./treatment-card"
import type { TreatmentMeta } from "@/lib/content/treatments"

interface RelatedTreatmentsProps {
  treatments: TreatmentMeta[]
}

export function RelatedTreatments({ treatments }: RelatedTreatmentsProps) {
  if (treatments.length === 0) return null

  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-foreground mb-8">
            Other treatments
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {treatments.map((treatment) => (
              <TreatmentCard key={treatment.slug} treatment={treatment} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
