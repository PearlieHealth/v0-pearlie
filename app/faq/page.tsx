import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { HelpCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { MobileNavMenu } from "@/components/mobile-nav-menu"
import { SiteFooter } from "@/components/site-footer"

export const metadata = {
  title: "FAQ | Pearlie",
  description: "Frequently asked questions about Pearlie dental matching platform.",
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <MobileNavMenu />

      <main>
        <section className="py-12 sm:py-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <HelpCircle className="w-8 h-8 text-primary" />
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-[-0.03em]">Frequently asked questions</h1>
              </div>
              <p className="text-lg text-muted-foreground mb-12">Everything you need to know about using Pearlie</p>

              <Accordion type="single" collapsible className="space-y-4">
                <AccordionItem value="item-1" className="border-none rounded-lg px-4 sm:px-6 bg-[var(--cream)]">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                    Is Pearlie free to use?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    Yes. Pearlie is free for patients. There is no obligation to book or proceed with any clinic.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2" className="border-none rounded-lg px-4 sm:px-6 bg-[var(--cream)]">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                    Does Pearlie provide dental advice?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    No. Pearlie does not provide dental or medical advice. All diagnosis, treatment planning, and
                    clinical care are provided by independent dental clinics.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3" className="border-none rounded-lg px-4 sm:px-6 bg-[var(--cream)]">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                    How are clinics selected?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    Clinics are selected based on practical factors such as location, services offered, availability,
                    and suitability for your preferences. Not all clinics in an area are listed.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4" className="border-none rounded-lg px-4 sm:px-6 bg-[var(--cream)]">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                    Do I have to book with a clinic?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    No. You are under no obligation to book or contact any clinic shown. Pearlie simply helps you
                    explore suitable options.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5" className="border-none rounded-lg px-4 sm:px-6 bg-[var(--cream)]">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                    How does Pearlie make money?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    Pearlie may receive a fee from clinics when a patient chooses to book following an introduction.
                    Patients are never charged for using Pearlie.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-6" className="border-none rounded-lg px-4 sm:px-6 bg-[var(--cream)]">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                    Are prices guaranteed?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    No. Any pricing information shown is indicative only. Final treatment costs are discussed and agreed
                    directly with the clinic.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-7" className="border-none rounded-lg px-4 sm:px-6 bg-[var(--cream)]">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                    Does Pearlie replace my dentist?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    No. Pearlie helps you find a clinic — it does not replace ongoing dental care or existing dentist
                    relationships.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-8" className="border-none rounded-lg px-4 sm:px-6 bg-[var(--cream)]">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                    What happens to my data?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    Your data is used only to provide matching and is handled in line with our Privacy Policy. You can
                    request deletion at any time.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-9" className="border-none rounded-lg px-4 sm:px-6 bg-[var(--cream)]">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                    Is Pearlie part of the NHS?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    No. Pearlie is an independent, private service and is not affiliated with, endorsed by, or connected
                    to the National Health Service (NHS). Clinics listed on Pearlie are private dental practices. If you
                    are looking for NHS dental services, please visit{" "}
                    <a href="https://www.nhs.uk/service-search/find-a-dentist" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      NHS Find a Dentist
                    </a>.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-10" className="border-none rounded-lg px-4 sm:px-6 bg-[var(--cream)]">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                    Can I compare clinics side by side?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    Yes. You can review pricing, services, photos, reviews, and availability before deciding.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-11" className="border-none rounded-lg px-4 sm:px-6 bg-[var(--cream)]">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                    What if I don't find the right clinic?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    You can adjust your preferences or submit another match request. Pearlie is continuously expanding
                    its clinic network.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-12" className="border-none rounded-lg px-4 sm:px-6 bg-[var(--cream)]">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                    Do clinics pay to appear higher?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    No. Clinic visibility is based on match relevance and profile completeness — not paid ranking.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-semibold tracking-tight mb-4">Still have questions?</h2>
              <p className="text-lg text-muted-foreground mb-8">We're here to help. Get in touch with our team.</p>
              <Button size="lg" variant="outline" asChild>
                <a href="mailto:hello@pearlie.co.uk">Contact Us</a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
