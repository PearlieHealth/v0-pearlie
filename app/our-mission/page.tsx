import type { Metadata } from "next"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"

export const metadata: Metadata = {
  title: "The Pearlie Care Fund — Currently in Development",
  description:
    "We are building a responsible Care Fund to support individuals struggling to access urgent dental care. More information will be available soon.",
}

export default function OurMissionPage() {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />

      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <p className="text-sm font-medium text-[#0fbcb0] mb-4">
              Currently in Development
            </p>

            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
              The Pearlie Care Fund
            </h1>

            <div className="space-y-5 text-muted-foreground leading-relaxed">
              <p>
                We are working with partner clinics and community organisations
                to design a responsible Care Fund that supports individuals
                struggling to access urgent dental care.
              </p>

              <p>
                Our goal is to provide limited emergency support for patients
                experiencing financial hardship and difficulty accessing NHS
                appointments.
              </p>

              <p>
                We are carefully building this initiative to ensure clear
                eligibility criteria, ethical allocation, transparent funding,
                and clinic safeguards.
              </p>

              <p className="font-medium text-foreground">
                More information will be available soon.
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
