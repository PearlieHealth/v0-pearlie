import type { Metadata } from "next"
import Link from "next/link"
import { MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"
import { LONDON_AREAS } from "@/lib/locations/london"
import { getClinicsNearArea } from "@/lib/locations/queries"

export const revalidate = 3600

export const metadata: Metadata = {
  title: "Find a Dentist in London",
  description:
    "Browse trusted, GDC-registered dental clinics across London by area. Compare dentists in Harley Street, Kensington, Soho, Canary Wharf, and more — free on Pearlie.",
  alternates: {
    canonical: "https://pearlie.org/find",
  },
  openGraph: {
    title: "Find a Dentist in London",
    description:
      "Browse trusted dental clinics across London by area. Compare verified dentists — free on Pearlie.",
    url: "https://pearlie.org/find",
  },
}

async function getAreasWithClinics() {
  const results = await Promise.all(
    LONDON_AREAS.map(async (area) => {
      const clinics = await getClinicsNearArea(area)
      return { area, clinicCount: clinics.length }
    })
  )
  return results.filter((r) => r.clinicCount > 0)
}

export default async function FindPage() {
  const areasWithClinics = await getAreasWithClinics()

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://pearlie.org" },
          { name: "Find a Dentist", url: "https://pearlie.org/find" },
        ]}
      />
      <MainNav />

      <main>
        {/* Hero */}
        <section className="pt-32 pb-12 sm:pb-16 md:pt-32 md:pb-20 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-heading font-bold tracking-[-0.03em] mb-6 text-white text-balance">
                Find a Dentist in London
              </h1>
              <p className="text-lg sm:text-xl text-white/75 leading-relaxed max-w-3xl mx-auto">
                Browse by area to find trusted, GDC-registered dental clinics near you. Every clinic on Pearlie is independently verified.
              </p>
            </div>
          </div>
        </section>

        {/* Area Grid */}
        <section className="py-12 sm:py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-8 text-[#004443]">
                London areas
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {areasWithClinics.map(({ area, clinicCount }) => (
                  <Link
                    key={area.slug}
                    href={`/find/${area.slug}`}
                    className="group flex items-start gap-4 p-5 rounded-xl border border-border/50 hover:border-primary/40 hover:shadow-md transition-all"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#0fbcb0]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#0fbcb0]/20 transition-colors">
                      <MapPin className="w-5 h-5 text-[#0fbcb0]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-[#004443] transition-colors">
                        {area.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {clinicCount} verified {clinicCount === 1 ? "clinic" : "clinics"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

              {areasWithClinics.length === 0 && (
                <p className="text-center text-muted-foreground py-12">
                  No areas with clinics found. Check back soon as we expand our network.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 sm:py-20 bg-[#faf3e6]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl sm:text-4xl font-heading font-bold tracking-[-0.03em] mb-6 text-[#004443]">
                Not sure which area?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Tell us what you&apos;re looking for and we&apos;ll match you with the right clinics based on your location, treatment needs, and preferences.
              </p>
              <Button
                size="lg"
                className="text-lg px-10 py-6 h-auto bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full font-normal transition-all"
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
