import { MapPin, Train, ShieldCheck, Star } from "lucide-react"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { HeroPostcodeCta } from "@/components/treatments/hero-postcode-cta"
import type { LondonBorough } from "@/lib/data/london-boroughs"

interface AreaHeroProps {
  borough: LondonBorough
  clinicCount: number
  /** Optional treatment name when rendering a borough+treatment page */
  treatmentName?: string
  treatmentSlug?: string
  /** Intake treatment key for postcode CTA */
  intakeTreatment?: string
  /** Price range string (e.g. "£2,500 – £5,500") for treatment pages */
  priceRange?: string
}

export function AreaHero({
  borough,
  clinicCount,
  treatmentName,
  treatmentSlug,
  intakeTreatment = "general",
  priceRange,
}: AreaHeroProps) {
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "London", href: "/london" },
    { label: borough.name, href: `/london/${borough.slug}` },
    ...(treatmentName && treatmentSlug
      ? [
          {
            label: treatmentName,
            href: `/london/${borough.slug}/${treatmentSlug}`,
          },
        ]
      : []),
  ]

  const title = treatmentName
    ? `${treatmentName} in ${borough.name} — Compare Verified Clinics`
    : `Dentists in ${borough.name}`

  const subtitle = treatmentName
    ? `Looking for ${treatmentName.toLowerCase()} treatment in ${borough.name}? Compare GDC-registered clinics near ${borough.postcodes[0]} and see price ranges, reviews and availability.`
    : `Compare verified, GDC registered dental clinics in ${borough.name}. See pricing, read reviews, and get matched with the right clinic — free.`

  return (
    <div className="pt-28 pb-8 sm:pt-32 sm:pb-12 bg-[#004443]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="[&_a]:text-white/60 [&_a:hover]:text-[#0fbcb0] [&_span]:text-white [&_svg]:text-white/30 mb-6">
            <BreadcrumbNav items={breadcrumbs} />
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#0fbcb0] bg-[#0fbcb0]/10 rounded-full">
              {borough.region} London
            </span>
            {treatmentName && (
              <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/80 bg-white/10 rounded-full">
                Verified clinics only
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-[-0.03em] text-white mb-6 text-balance">
            {title}
          </h1>

          <p className="text-lg sm:text-xl text-white/70 leading-relaxed mb-6">
            {subtitle}
          </p>

          {/* Trust signals */}
          {treatmentName && (
            <div className="flex flex-wrap gap-4 text-sm text-white/70 mb-6">
              {priceRange && (
                <span className="flex items-center gap-1.5">
                  <span className="text-[#0fbcb0] font-semibold">From {priceRange.split("–")[0].trim()}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-[#0fbcb0] fill-[#0fbcb0]" />
                Rated clinics
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#0fbcb0]" />
                GDC registered
              </span>
            </div>
          )}

          {/* Local signals */}
          <div className="flex flex-wrap gap-4 text-sm text-white/60 mb-8">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#0fbcb0]" />
              {borough.postcodes.slice(0, 4).join(", ")}
              {borough.postcodes.length > 4 && " +more"}
            </span>
            <span className="flex items-center gap-1.5">
              <Train className="w-4 h-4 text-[#0fbcb0]" />
              {borough.transport.slice(0, 3).join(", ")}
            </span>
          </div>

          {/* Postcode CTA */}
          <div className="[&_p]:text-white/60 [&_input]:bg-white/10 [&_input]:border-white/20 [&_input]:text-white [&_input]:placeholder:text-white/40 [&_input]:focus-visible:ring-[#0fbcb0] [&_input]:focus-visible:border-[#0fbcb0] [&_.text-destructive]:text-red-300">
            <HeroPostcodeCta
              treatmentName={treatmentName || "dentist"}
              intakeTreatment={intakeTreatment}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
