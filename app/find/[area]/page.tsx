import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { MapPin, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"
import { LocationClinicCard } from "@/components/find/location-clinic-card"
import { LocationJsonLd } from "@/components/find/location-jsonld"
import { LocationMap } from "@/components/find/location-map"
import { LONDON_AREAS, getAreaBySlug } from "@/lib/locations/london"
import { getClinicsNearArea } from "@/lib/locations/queries"

export const revalidate = 3600

interface PageProps {
  params: Promise<{ area: string }>
}

export async function generateStaticParams() {
  return LONDON_AREAS.map((area) => ({ area: area.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { area: slug } = await params
  const area = getAreaBySlug(slug)
  if (!area) return {}

  return {
    title: area.metaTitle,
    description: area.metaDescription,
    alternates: {
      canonical: `https://pearlie.org/find/${area.slug}`,
    },
    openGraph: {
      title: area.metaTitle,
      description: area.metaDescription,
      url: `https://pearlie.org/find/${area.slug}`,
    },
  }
}

export default async function AreaPage({ params }: PageProps) {
  const { area: slug } = await params
  const area = getAreaBySlug(slug)
  if (!area) notFound()

  const clinics = await getClinicsNearArea(area)
  if (clinics.length === 0) notFound()

  const nearbyAreas = area.nearbyAreas
    .map((s) => getAreaBySlug(s))
    .filter((a): a is NonNullable<typeof a> => a !== undefined)

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://pearlie.org" },
          { name: "Find a Dentist", url: "https://pearlie.org/find" },
          { name: area.name, url: `https://pearlie.org/find/${area.slug}` },
        ]}
      />
      <LocationJsonLd area={area} clinics={clinics} />
      <MainNav />

      <main>
        {/* Hero */}
        <section className="pt-32 pb-12 sm:pb-16 md:pt-32 md:pb-20 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-heading font-bold tracking-[-0.03em] mb-6 text-white text-balance">
                Find a Dentist in {area.name}
              </h1>
              <p className="text-lg sm:text-xl text-white/75 leading-relaxed max-w-3xl mx-auto mb-4">
                {area.intro}
              </p>
              <p className="text-sm text-white/50">
                {clinics.length} verified {clinics.length === 1 ? "clinic" : "clinics"} near {area.name}
              </p>
            </div>
          </div>
        </section>

        {/* Description + CTA */}
        <section className="py-10 sm:py-14 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                {area.description}
              </p>
              <Button
                size="lg"
                className="bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full font-normal transition-all"
                asChild
              >
                <Link href="/intake">
                  <Search className="w-4 h-4 mr-2" />
                  Get matched with a clinic in {area.name}
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Clinic Cards */}
        <section className="py-10 sm:py-14 bg-[#faf9f6]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-8 text-[#004443]">
                Dental clinics near {area.name}
              </h2>
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                {clinics.map((clinic) => (
                  <LocationClinicCard key={clinic.id} clinic={clinic} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Map */}
        <section className="py-10 sm:py-14 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-6 text-[#004443]">
                Clinics on the map
              </h2>
              <LocationMap
                clinics={clinics}
                center={area.center}
                zoom={area.mapZoom}
              />
            </div>
          </div>
        </section>

        {/* FAQ */}
        {area.faq.length > 0 && (
          <section className="py-10 sm:py-14 bg-[#faf3e6]">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-8 text-[#004443]">
                  Common questions about dentists in {area.name}
                </h2>
                <Accordion type="single" collapsible className="space-y-3">
                  {area.faq.map((item, i) => (
                    <AccordionItem
                      key={i}
                      value={`faq-${i}`}
                      className="border-none rounded-lg px-4 sm:px-6 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                    >
                      <AccordionTrigger className="text-left text-base font-semibold hover:no-underline text-foreground">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </section>
        )}

        {/* Nearby Areas */}
        {nearbyAreas.length > 0 && (
          <section className="py-10 sm:py-14 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] mb-6 text-[#004443]">
                  Explore nearby areas
                </h2>
                <div className="flex flex-wrap gap-3">
                  {nearbyAreas.map((nearby) => (
                    <Link
                      key={nearby.slug}
                      href={`/find/${nearby.slug}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-border/60 hover:border-primary/40 hover:bg-primary/5 text-sm font-medium text-foreground transition-all"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#0fbcb0]" />
                      Dentists in {nearby.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <section className="py-12 sm:py-20 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl sm:text-4xl font-heading font-bold tracking-[-0.03em] mb-6 text-white">
                Ready to find your dentist in {area.name}?
              </h2>
              <p className="text-lg text-white/75 mb-8 leading-relaxed">
                Answer a few questions about your dental needs and get matched with clinics that are right for you.
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
