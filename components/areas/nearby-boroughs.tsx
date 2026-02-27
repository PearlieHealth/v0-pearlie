import Link from "next/link"
import { MapPin, ArrowRight } from "lucide-react"
import type { LondonBorough } from "@/lib/data/london-boroughs"

interface NearbyBoroughsProps {
  boroughs: LondonBorough[]
  /** If set, links go to /london/[borough]/[treatment] instead of /london/[borough] */
  treatmentSlug?: string
  treatmentName?: string
}

export function NearbyBoroughs({
  boroughs,
  treatmentSlug,
  treatmentName,
}: NearbyBoroughsProps) {
  if (boroughs.length === 0) return null

  const heading = treatmentName
    ? `${treatmentName} in nearby areas`
    : "Dental clinics in nearby areas"

  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-2">
            {heading}
          </h2>
          <p className="text-muted-foreground mb-8">
            Also compare clinics in these neighbouring London boroughs.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {boroughs.map((borough) => {
              const href = treatmentSlug
                ? `/london/${borough.slug}/${treatmentSlug}`
                : `/london/${borough.slug}`

              return (
                <Link
                  key={borough.slug}
                  href={href}
                  className="group rounded-xl border border-border/50 bg-white p-5 hover:shadow-md hover:border-[#0fbcb0]/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#0fbcb0]" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {borough.region} London
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-[#0fbcb0] transition-colors" />
                  </div>
                  <h3 className="text-base font-heading font-bold text-foreground mb-1.5">
                    {treatmentName
                      ? `${treatmentName} in ${borough.name}`
                      : `Dentists in ${borough.name}`}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {borough.postcodes.slice(0, 3).join(", ")} area
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
