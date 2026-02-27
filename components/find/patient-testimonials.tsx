import Link from "next/link"
import { Star, Quote } from "lucide-react"
import type { AreaTestimonial } from "@/lib/locations/queries"

interface PatientTestimonialsProps {
  areaName?: string
  testimonials: AreaTestimonial[]
}

export function PatientTestimonials({ areaName, testimonials }: PatientTestimonialsProps) {
  if (testimonials.length === 0) return null

  return (
    <section className="py-14 sm:py-18 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-3">
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] text-center">
              What patients are saying
            </h2>
          </div>
          <p className="text-muted-foreground text-center mb-10">
            Real Google reviews from dental clinics{areaName ? ` in ${areaName}` : ""}
          </p>
          <div className="grid gap-6 sm:grid-cols-3">
            {testimonials.map((t, idx) => (
              <Link
                key={idx}
                href={`/clinic/${t.clinicId}`}
                className="group relative p-6 rounded-2xl bg-[#faf9f6] border border-border/40 hover:border-[#0fbcb0]/40 hover:shadow-md transition-all"
              >
                <Quote className="w-8 h-8 text-[#0fbcb0]/20 mb-3" />
                <p className="text-sm text-foreground leading-relaxed mb-4 line-clamp-4">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-0.5 mb-2">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm font-semibold text-foreground">{t.authorName}</p>
                <p className="text-xs text-muted-foreground">
                  {t.clinicName} &middot; {t.relativeTime}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
