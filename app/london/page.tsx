import type { Metadata } from "next"
import Link from "next/link"
import { MapPin, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import {
  LONDON_BOROUGHS,
  getBoroughsByRegion,
  type LondonBorough,
} from "@/lib/data/london-boroughs"

export const metadata: Metadata = {
  title: "Dentists in London — Compare Clinics by Borough",
  description:
    "Find and compare verified, GDC registered dental clinics across London. Browse by borough, see pricing, read reviews, and get matched with the right clinic — free.",
  alternates: {
    canonical: "https://pearlie.org/london",
  },
  openGraph: {
    title: "Dentists in London — Compare Clinics by Borough | Pearlie",
    description:
      "Find and compare verified, GDC registered dental clinics across London boroughs.",
    url: "https://pearlie.org/london",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dentists in London — Compare Clinics by Borough | Pearlie",
    description:
      "Find and compare verified dental clinics across London boroughs.",
  },
}

const REGIONS: LondonBorough["region"][] = [
  "Central",
  "North",
  "South",
  "East",
  "West",
]

export default function LondonPage() {
  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://pearlie.org" },
          { name: "London", url: "https://pearlie.org/london" },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Dental Clinics in London by Borough",
            description:
              "Compare verified dental clinics across London boroughs on Pearlie.",
            numberOfItems: LONDON_BOROUGHS.length,
            itemListElement: LONDON_BOROUGHS.map((b, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: `Dentists in ${b.name}`,
              url: `https://pearlie.org/london/${b.slug}`,
            })),
          }),
        }}
      />

      <MainNav />

      <main>
        {/* Hero */}
        <section className="pt-28 pb-10 sm:pt-32 sm:pb-14 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-[#0fbcb0]" />
                <span className="text-sm font-semibold uppercase tracking-wider text-[#0fbcb0]">
                  London
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-[-0.03em] text-white mb-4 text-balance">
                Find a dentist in London
              </h1>
              <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
                Compare verified, GDC registered dental clinics across{" "}
                {LONDON_BOROUGHS.length} London boroughs. See pricing, read
                reviews, and get matched — free.
              </p>
            </div>
          </div>
        </section>

        {/* Borough grid by region */}
        <section className="py-10 sm:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <BreadcrumbNav
                items={[
                  { label: "Home", href: "/" },
                  { label: "London", href: "/london" },
                ]}
              />

              {REGIONS.map((region) => {
                const boroughs = getBoroughsByRegion(region)
                if (boroughs.length === 0) return null

                return (
                  <div key={region} className="mb-12 last:mb-0">
                    <h2 className="text-xl sm:text-2xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-1">
                      {region} London
                    </h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      {boroughs.length} borough
                      {boroughs.length !== 1 ? "s" : ""}
                    </p>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {boroughs.map((borough) => (
                        <Link
                          key={borough.slug}
                          href={`/london/${borough.slug}`}
                          className="group rounded-xl border border-border/50 bg-white p-5 hover:shadow-md hover:border-[#0fbcb0]/30 transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-[#0fbcb0]" />
                              <span className="text-xs text-muted-foreground">
                                {borough.postcodes.slice(0, 3).join(", ")}
                              </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-[#0fbcb0] transition-colors" />
                          </div>
                          <h3 className="text-base font-heading font-bold text-foreground mb-1.5">
                            Dentists in {borough.name}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {borough.description.slice(0, 120)}...
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 sm:py-16 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-4">
                Not sure where to start?
              </h2>
              <p className="text-white/70 mb-6 leading-relaxed">
                Answer a few questions and Pearlie will match you with the right
                clinic for your treatment and location — completely free.
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
