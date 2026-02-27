import Link from "next/link"
import { MapPin, Train } from "lucide-react"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import type { LondonBorough } from "@/lib/data/london-boroughs"

interface AreaHeroProps {
  borough: LondonBorough
  clinicCount: number
  /** Optional treatment name when rendering a borough+treatment page */
  treatmentName?: string
  treatmentSlug?: string
}

export function AreaHero({
  borough,
  clinicCount,
  treatmentName,
  treatmentSlug,
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
    ? `${treatmentName} in ${borough.name}`
    : `Dentists in ${borough.name}`

  const subtitle = treatmentName
    ? `Compare verified ${treatmentName.toLowerCase()} providers in ${borough.name}. See pricing, read reviews, and get matched — free and independent.`
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
            {clinicCount > 0 && (
              <span className="inline-block px-3 py-1 text-xs font-semibold text-white bg-white/10 rounded-full">
                {clinicCount} verified clinic{clinicCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-[-0.03em] text-white mb-6 text-balance">
            {title}
          </h1>

          <p className="text-lg sm:text-xl text-white/70 leading-relaxed mb-6">
            {subtitle}
          </p>

          {/* Local signals */}
          <div className="flex flex-wrap gap-4 text-sm text-white/60">
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
        </div>
      </div>
    </div>
  )
}
