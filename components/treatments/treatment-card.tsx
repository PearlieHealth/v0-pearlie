import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { TreatmentMeta } from "@/lib/content/treatments"

interface TreatmentCardProps {
  treatment: TreatmentMeta
}

export function TreatmentCard({ treatment }: TreatmentCardProps) {
  return (
    <Link
      href={`/treatments/${treatment.slug}`}
      className="group block rounded-2xl border border-border/50 bg-white p-6 hover:shadow-lg hover:border-[#0fbcb0]/30 transition-all duration-300"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#0fbcb0] bg-[#0fbcb0]/10 rounded-full">
          {treatment.category}
        </span>
      </div>

      <h3 className="text-xl font-heading font-bold text-foreground mb-2 group-hover:text-[#0fbcb0] transition-colors">
        {treatment.treatmentName}
      </h3>

      <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
        {treatment.description}
      </p>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#004443]">
          {treatment.priceRange}
        </span>
        <ArrowRight className="w-4 h-4 text-[#0fbcb0] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
      </div>
    </Link>
  )
}
