import type { Metadata } from "next"
import Link from "next/link"
import { MapPin, Shield, Star, Users, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"
import { HeroPostcodeSearch } from "@/components/find/hero-postcode-search"
import { StickyPostcodeBar } from "@/components/find/sticky-postcode-bar"
import { LONDON_REGIONS } from "@/lib/locations/london"

export const revalidate = 3600

export const metadata: Metadata = {
  title: "Top Dentists in London | Find & Compare | Pearlie",
  description:
    "Find your perfect dentist in London. Compare trusted, GDC-registered dental clinics across Central, South, North, West, and East London — free on Pearlie.",
  alternates: {
    canonical: "https://pearlie.org/find",
  },
  openGraph: {
    title: "Top Dentists in London | Find & Compare | Pearlie",
    description:
      "Find your perfect dentist in London. Compare verified dental clinics by area — free on Pearlie.",
    url: "https://pearlie.org/find",
  },
}

const VALUE_PROPS = [
  {
    icon: Shield,
    title: "GDC-Verified Clinics",
    description: "Every clinic on Pearlie is independently verified and GDC-registered.",
  },
  {
    icon: Star,
    title: "Transparent Reviews",
    description: "See real patient ratings and reviews to make an informed choice.",
  },
  {
    icon: Users,
    title: "Personalised Matches",
    description: "Tell us your needs and we match you with the right clinics — not just the nearest.",
  },
  {
    icon: MapPin,
    title: "London-Wide Coverage",
    description: "From Harley Street to Stratford, we cover dental clinics across all of London.",
  },
]

export default function FindPage() {
  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://pearlie.org" },
          { name: "Find a Dentist", url: "https://pearlie.org/find" },
        ]}
      />
      <MainNav />
      <StickyPostcodeBar />

      <main>
        {/* Hero */}
        <section className="pt-28 pb-16 sm:pt-32 sm:pb-20 md:pt-36 md:pb-24 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-heading font-bold tracking-[-0.03em] mb-6 text-white text-balance">
                Find your perfect dentist
              </h1>
              <p className="text-lg sm:text-xl text-white/75 leading-relaxed max-w-2xl mx-auto mb-10">
                Enter your postcode to get matched with trusted, GDC-registered dental clinics near you.
              </p>
              <div id="hero-postcode-search">
                <HeroPostcodeSearch variant="hero" />
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Pearlie */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443]">
                  Why choose Pearlie?
                </h2>
              </div>
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {VALUE_PROPS.map((prop) => (
                  <div key={prop.title} className="text-center">
                    <div className="w-12 h-12 rounded-full bg-[#0fbcb0]/10 flex items-center justify-center mx-auto mb-4">
                      <prop.icon className="w-6 h-6 text-[#0fbcb0]" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{prop.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{prop.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Browse by Region */}
        <section className="py-16 sm:py-20 bg-[#faf9f6]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-3">
                  Dentists across London
                </h2>
                <p className="text-muted-foreground text-lg">Browse by region to find clinics near you</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {LONDON_REGIONS.map((region) => (
                  <Link
                    key={region.slug}
                    href={`/find/${region.slug}`}
                    className="group flex items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-border/50 hover:border-[#0fbcb0]/40 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#004443] flex items-center justify-center flex-shrink-0 group-hover:bg-[#004443]/90 transition-colors">
                        <MapPin className="w-5 h-5 text-[#0fbcb0]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground group-hover:text-[#004443] transition-colors text-lg">
                          {region.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {region.areaSlugs.length} {region.areaSlugs.length === 1 ? "area" : "areas"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-[#0fbcb0] transition-colors" />
                  </Link>
                ))}

                {/* Dentist Near Me card */}
                <Link
                  href="/find/dentist-near-me"
                  className="group flex items-center justify-between gap-4 p-6 rounded-2xl bg-[#0fbcb0]/5 border border-[#0fbcb0]/20 hover:border-[#0fbcb0]/50 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#0fbcb0] flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-[#004443] transition-colors text-lg">
                        Dentist Near Me
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Search by your postcode
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-[#0fbcb0] transition-colors" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* For clinics CTA */}
        <section className="py-10 sm:py-14 bg-gradient-to-br from-[#1a2e35] to-[#0d1f26]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-[#0fbcb0] text-sm font-medium mb-2">Dentist?</p>
              <h2 className="text-xl sm:text-2xl font-heading font-bold tracking-[-0.02em] text-white mb-3">
                Grow Your Dental Practice
              </h2>
              <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-md mx-auto">
                Join the platform with everything you need to grow your practice.
              </p>
              <Button
                className="bg-white text-[#004443] hover:bg-white/90 rounded-full font-semibold px-8"
                size="lg"
                asChild
              >
                <Link href="/for-clinics">List your practice free</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16 sm:py-24 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl sm:text-4xl font-heading font-bold tracking-[-0.03em] mb-6 text-white">
                Not sure which area?
              </h2>
              <p className="text-lg text-white/75 mb-8 leading-relaxed">
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
