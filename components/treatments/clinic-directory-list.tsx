import Link from "next/link"
import { MapPin, Star } from "lucide-react"
import type { ClinicData } from "./treatment-clinic-card"

interface ClinicDirectoryListProps {
  clinics: ClinicData[]
  treatmentName: string
}

export function ClinicDirectoryList({ clinics, treatmentName }: ClinicDirectoryListProps) {
  if (clinics.length === 0) return null

  return (
    <section className="py-10 sm:py-14 bg-secondary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-heading font-bold tracking-[-0.02em] text-foreground mb-1">
            More {treatmentName.toLowerCase()} clinics
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Additional clinics offering {treatmentName.toLowerCase()} in our directory.
          </p>

          <div className="space-y-3">
            {clinics.map((clinic) => (
              <Link
                key={clinic.id}
                href={`/clinic/${clinic.id}`}
                className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {clinic.name}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {(clinic.city || clinic.postcode) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {[clinic.city, clinic.postcode].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    {clinic.price_range && (
                      <span className="font-medium text-foreground">
                        {clinic.price_range}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {clinic.google_rating != null && clinic.google_rating > 0 ? (
                    <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      {clinic.google_rating.toFixed(1)}
                      {clinic.google_review_count != null && clinic.google_review_count > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({clinic.google_review_count})
                        </span>
                      )}
                    </span>
                  ) : clinic.rating != null && (
                    <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      {clinic.rating.toFixed(1)}
                    </span>
                  )}
                  <span className="inline-flex items-center px-4 py-1.5 text-xs font-semibold text-white bg-primary rounded-full group-hover:bg-[var(--primary-hover)] transition-colors">
                    View profile
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
