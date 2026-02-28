import { PoundSterling } from "lucide-react"
import type { TreatmentCostContent } from "@/lib/data/treatment-cost-content"

interface FinanceOptionsProps {
  finance: NonNullable<TreatmentCostContent["finance"]>
  treatmentName: string
}

export function FinanceOptions({ finance, treatmentName }: FinanceOptionsProps) {
  return (
    <section className="py-10 sm:py-14 bg-[var(--cream)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-6">
            {finance.heading}
          </h2>

          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {finance.options.map((option, i) => (
              <div key={i} className="bg-white rounded-xl border border-border/50 p-5">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#0fbcb0]/10 mb-3">
                  <PoundSterling className="w-4.5 h-4.5 text-[#0fbcb0]" />
                </div>
                <h3 className="text-sm font-semibold text-[#004443] mb-1">
                  {option.label}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {option.detail}
                </p>
              </div>
            ))}
          </div>

          {finance.monthlyExample && (
            <div className="bg-[#004443] rounded-xl p-5 text-center">
              <p className="text-lg font-heading font-bold text-white mb-1">
                {finance.monthlyExample}
              </p>
              {finance.depositNote && (
                <p className="text-sm text-white/70">
                  {finance.depositNote}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
