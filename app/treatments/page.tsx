import type { Metadata } from "next"
import Link from "next/link"
import { Stethoscope, MapPin, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { TreatmentCard } from "@/components/treatments/treatment-card"
import { TrustBadgeStrip } from "@/components/trust-badge-strip"
import { getAllTreatments } from "@/lib/content/treatments"
import {
  LONDON_BOROUGHS,
} from "@/lib/data/london-boroughs"

export const metadata: Metadata = {
  title: "Dental Treatments - Compare Clinics & Prices",
  description:
    "Compare verified UK dental clinics for Invisalign, dental implants, teeth whitening, and more. See pricing, read reviews, and get matched — free and independent.",
  alternates: {
    canonical: "https://pearlie.org/treatments",
  },
  openGraph: {
    title: "Dental Treatments | Pearlie",
    description:
      "Compare verified UK dental clinics for Invisalign, dental implants, teeth whitening, and more.",
    url: "https://pearlie.org/treatments",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dental Treatments — Compare Clinics & Prices | Pearlie",
    description:
      "Compare verified UK dental clinics for Invisalign, dental implants, teeth whitening, and more.",
  },
}

export default function TreatmentsPage() {
  const treatments = getAllTreatments()

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Dental Treatments Available on Pearlie",
    description:
      "Compare verified dental clinics in London for Invisalign, dental implants, teeth whitening, composite bonding, veneers, and emergency dental care.",
    numberOfItems: treatments.length,
    itemListElement: treatments.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.treatmentName,
      url: `https://pearlie.org/treatments/${t.slug}`,
      description: t.description,
    })),
  }

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://pearlie.org" },
          { name: "Treatments", url: "https://pearlie.org/treatments" },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <MainNav />

      <main>
        {/* Hero */}
        <section className="pt-28 pb-10 sm:pt-32 sm:pb-14 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Stethoscope className="w-5 h-5 text-[#0fbcb0]" />
                <span className="text-sm font-semibold uppercase tracking-wider text-[#0fbcb0]">
                  Treatments
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-[-0.03em] text-white mb-4 text-balance">
                Find the right clinic for your treatment
              </h1>
              <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
                Compare verified, GDC-registered dental clinics across London and the UK.
                See pricing, read reviews, and get matched — free and independent.
              </p>
            </div>
          </div>
        </section>

        <TrustBadgeStrip />

        {/* Treatment grid */}
        <section className="py-10 sm:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <BreadcrumbNav
                items={[
                  { label: "Home", href: "/" },
                  { label: "Treatments", href: "/treatments" },
                ]}
              />

              {treatments.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {treatments.map((treatment) => (
                    <TreatmentCard key={treatment.slug} treatment={treatment} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <Stethoscope className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
                    Treatment pages coming soon
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    We&apos;re building detailed treatment guides. In the meantime,
                    find your clinic now.
                  </p>
                  <Button
                    size="lg"
                    className="bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full"
                    asChild
                  >
                    <Link href="/intake">Find my clinic</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Browse by area */}
        <section className="py-10 sm:py-14 bg-[var(--cream)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-[#0fbcb0]" />
                <h2 className="text-xl sm:text-2xl font-heading font-bold tracking-[-0.02em] text-[#004443]">
                  Find treatment clinics by area
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Compare dental clinics and pricing for specific treatments in your London borough.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {LONDON_BOROUGHS.map((borough) => (
                  <Link
                    key={borough.slug}
                    href={`/london/${borough.slug}`}
                    className="text-sm text-foreground hover:text-[#0fbcb0] transition-colors flex items-center gap-1.5 p-2 rounded-lg hover:bg-muted/50"
                  >
                    <MapPin className="w-3 h-3 text-[#0fbcb0] flex-shrink-0" />
                    {borough.name}
                  </Link>
                ))}
              </div>

              <div className="mt-6">
                <Link
                  href="/london"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0fbcb0] hover:underline"
                >
                  View all London areas
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 sm:py-16 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-4">
                Not sure which treatment you need?
              </h2>
              <p className="text-white/70 mb-6 leading-relaxed">
                Answer a few questions and Pearlie will match you with clinics
                that specialise in the right treatment for your needs.
              </p>
              <Button
                size="lg"
                className="bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full px-8 h-12 text-base"
                asChild
              >
                <Link href="/intake">Get my clinic matches</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
