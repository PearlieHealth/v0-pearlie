import Link from "next/link"
import { MapPin } from "lucide-react"
import { LONDON_BOROUGHS } from "@/lib/data/london-boroughs"

interface TreatmentAreaLinksProps {
  treatmentSlug: string
  treatmentName: string
}

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
              {treatmentName} by borough
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Compare {treatmentName.toLowerCase()} clinics and pricing in your
            London borough.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {LONDON_BOROUGHS.map((borough) => (
              <Link
                key={borough.slug}
                href={`/london/${borough.slug}/${treatmentSlug}`}
                className="text-sm text-foreground hover:text-[#0fbcb0] transition-colors flex items-center gap-1.5 p-2 rounded-lg hover:bg-muted/50"
              >
                <MapPin className="w-3 h-3 text-[#0fbcb0] flex-shrink-0" />
                {borough.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
