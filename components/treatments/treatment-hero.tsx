import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { HeroPostcodeCta } from "@/components/treatments/hero-postcode-cta"
import type { TreatmentMeta } from "@/lib/content/treatments"

interface TreatmentHeroProps {
  treatment: TreatmentMeta
}

export function TreatmentHero({ treatment }: TreatmentHeroProps) {
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Treatments", href: "/treatments" },
    { label: treatment.treatmentName, href: `/treatments/${treatment.slug}` },
  ]

  return (
    <div className="pt-28 pb-8 sm:pt-32 sm:pb-12 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <BreadcrumbNav items={breadcrumbs} />

          <Link
            href="/treatments"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#0fbcb0] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            All treatments
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#0fbcb0] bg-[#0fbcb0]/10 rounded-full">
              {treatment.category}
            </span>
            <span className="inline-block px-3 py-1 text-xs font-semibold text-[#004443] bg-[#004443]/10 rounded-full">
              {treatment.priceRange}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-[-0.03em] text-[#004443] mb-6 text-balance">
            {treatment.title}
          </h1>

          <p data-speakable="description" className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-4">
            {treatment.description}
          </p>

          <p className="text-sm text-muted-foreground/70 mb-8">
            Last reviewed:{" "}
            <time dateTime={treatment.updatedAt || treatment.publishedAt}>
              {new Date(treatment.updatedAt || treatment.publishedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
            {" · "}By {treatment.author}
          </p>

          <HeroPostcodeCta
            treatmentName={treatment.treatmentName}
            intakeTreatment={treatment.intakeTreatment}
          />
        </div>
      </div>
    </div>
  )
}
