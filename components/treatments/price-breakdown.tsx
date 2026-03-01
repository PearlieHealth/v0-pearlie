import type { TreatmentCostContent } from "@/lib/data/treatment-cost-content"
import { HeroPostcodeCta } from "@/components/treatments/hero-postcode-cta"

interface PriceBreakdownProps {
  costContent: TreatmentCostContent
  treatmentName: string
  intakeTreatment: string
}

export function PriceBreakdown({ costContent, treatmentName, intakeTreatment }: PriceBreakdownProps) {
  const { priceBreakdown, priceFactors } = costContent

  return (
    <section className="py-10 sm:py-14 bg-secondary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Price table */}
          <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-foreground mb-6">
            {priceBreakdown.heading}
          </h2>

          {priceBreakdown.contextParagraph && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {priceBreakdown.contextParagraph}
            </p>
          )}

          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-foreground/10">
                  <th className="text-left py-3 pr-4 font-semibold text-foreground">Treatment</th>
                  <th className="text-left py-3 pr-4 font-semibold text-foreground">Typical cost</th>
                  <th className="text-left py-3 font-semibold text-foreground hidden sm:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {priceBreakdown.rows.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-3 pr-4 font-medium text-foreground">{row.tier}</td>
                    <td className="py-3 pr-4 font-semibold text-foreground whitespace-nowrap">{row.price}</td>
                    <td className="py-3 text-muted-foreground hidden sm:table-cell">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {priceBreakdown.footnote && (
            <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
              {priceBreakdown.footnote}
            </p>
          )}

          {priceBreakdown.nhsNote && (
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed italic">
              {priceBreakdown.nhsNote}
            </p>
          )}

          {/* What affects the price? */}
          <h3 className="text-xl font-heading font-bold text-foreground mt-10 mb-4">
            What affects the price?
          </h3>
          <ul className="space-y-2.5">
            {priceFactors.map((factor, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-muted-foreground leading-relaxed">
                <span className="text-primary mt-0.5 shrink-0">&#10003;</span>
                {factor}
              </li>
            ))}
          </ul>

          {/* Mid-page CTA */}
          <div className="mt-10 p-6 sm:p-8 rounded-2xl bg-card border border-border/50 text-center">
            <p className="text-lg font-heading font-bold text-foreground mb-2">
              {costContent.ctaCopy?.mid || "Get an exact quote from clinics near you"}
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              Enter your postcode to compare verified {treatmentName.toLowerCase()} specialists with transparent, upfront pricing.
            </p>
            <div className="flex justify-center">
              <HeroPostcodeCta
                treatmentName={treatmentName}
                intakeTreatment={intakeTreatment}
                ctaButtonText={costContent.ctaButtonText}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
