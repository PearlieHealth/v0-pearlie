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
    <section className="py-10 sm:py-14 bg-[var(--cream)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Price table */}
          <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-6">
            {priceBreakdown.heading}
          </h2>

          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-[#004443]/10">
                  <th className="text-left py-3 pr-4 font-semibold text-[#004443]">Treatment</th>
                  <th className="text-left py-3 pr-4 font-semibold text-[#004443]">Typical cost</th>
                  <th className="text-left py-3 font-semibold text-[#004443] hidden sm:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {priceBreakdown.rows.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-3 pr-4 font-medium text-foreground">{row.tier}</td>
                    <td className="py-3 pr-4 font-semibold text-[#004443] whitespace-nowrap">{row.price}</td>
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

          {/* What affects the price? */}
          <h3 className="text-xl font-heading font-bold text-[#004443] mt-10 mb-4">
            What affects the price?
          </h3>
          <ul className="space-y-2.5">
            {priceFactors.map((factor, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-muted-foreground leading-relaxed">
                <span className="text-[#0fbcb0] mt-0.5 shrink-0">&#10003;</span>
                {factor}
              </li>
            ))}
          </ul>

          {/* Mid-page CTA */}
          <div className="mt-10 p-6 sm:p-8 rounded-2xl bg-white border border-border/50 text-center">
            <p className="text-lg font-heading font-bold text-[#004443] mb-2">
              Want exact pricing from clinics near you?
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              Enter your postcode and we&apos;ll match you with verified {treatmentName.toLowerCase()} clinics with transparent pricing.
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
