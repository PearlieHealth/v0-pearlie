import Link from "next/link"
import { ArrowRight, CreditCard } from "lucide-react"
import type { TreatmentMeta } from "@/lib/content/treatments"

interface TreatmentCardProps {
  treatment: TreatmentMeta
}

/** Extract the starting price from a range like "£2,000 – £6,000 per implant" → "£2,000" */
function extractFromPrice(priceRange: string): string | null {
  const match = priceRange.match(/£[\d,]+/)
  return match ? match[0] : null
}

export function TreatmentCard({ treatment }: TreatmentCardProps) {
  const fromPrice = extractFromPrice(treatment.priceRange)

  return (
    <Link
      href={`/treatments/${treatment.slug}`}
      className="group block rounded-2xl border border-border/50 bg-card p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full">
          {treatment.category}
        </span>
        {treatment.financeAvailable && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium text-foreground bg-foreground/8 rounded-full">
            <CreditCard className="w-3 h-3" />
            0% finance
          </span>
        )}
      </div>

      <h3 className="text-xl font-heading font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
        {treatment.treatmentName}
      </h3>

      <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
        {treatment.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          {fromPrice && (
            <span className="text-lg font-bold text-foreground">
              From {fromPrice}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {treatment.priceRange}
          </span>
        </div>
        <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
      </div>
    </Link>
  )
}
