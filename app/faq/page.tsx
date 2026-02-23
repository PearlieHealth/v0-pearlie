import type { Metadata } from "next"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { HelpCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"

export const metadata: Metadata = {
  title: "FAQ - Frequently Asked Questions",
  description: "Common questions about Pearlie's free dental clinic matching service. Learn how clinics are selected, how pricing works, and how your data is protected under UK GDPR.",
  alternates: {
    canonical: "https://pearlie.org/faq",
  },
}

export default function FAQPage() {
  const faqItems = [
    { question: "Is Pearlie free to use?", answer: "Yes. Pearlie is completely free for patients. There are no sign-up fees, subscription charges, or hidden costs. You are under no obligation to book or proceed with any clinic you are matched with." },
    { question: "Does Pearlie provide dental advice?", answer: "No. Pearlie does not provide dental or medical advice. All diagnosis, treatment planning, and clinical care are provided by independent dental clinics. For general dental health information, visit the NHS dental health pages." },
    { question: "How are clinics selected?", answer: "Clinics are selected based on practical factors such as location, services offered, availability, and suitability for your preferences. Every clinic on Pearlie is verified as registered with the General Dental Council (GDC), the UK's dental regulator. Not all clinics in an area are listed — we focus on quality over quantity." },
    { question: "Do I have to book with a clinic?", answer: "No. You are under no obligation to book or contact any clinic shown. Pearlie simply helps you explore suitable options. You can compare clinics, ask questions via chat, and decide in your own time." },
    { question: "How does Pearlie make money?", answer: "Pearlie may receive a fee from clinics when a patient chooses to book following an introduction. This is how we keep the service free for patients. Importantly, clinic fees do not influence which clinics are recommended — matching is based on relevance and fit." },
    { question: "Are prices guaranteed?", answer: "No. Any pricing information shown on Pearlie is indicative only and provided by the clinics themselves. Final treatment costs are always discussed and agreed directly between you and the clinic before any treatment begins." },
    { question: "Does Pearlie replace my dentist?", answer: "No. Pearlie helps you find a clinic — it does not replace ongoing dental care or existing dentist relationships. If you already have a dentist you trust, Pearlie can still be useful when seeking a second opinion or specialist treatment." },
    { question: "What happens to my data?", answer: "Your data is used only to provide the matching service and is handled in line with our Privacy Policy and UK GDPR. Clinics only see your details when you choose to contact them. You can request data deletion at any time by emailing privacy@pearlie.org." },
    { question: "Is Pearlie part of the NHS?", answer: "No. Pearlie is an independent, private service and is not affiliated with, endorsed by, or connected to the National Health Service (NHS). Clinics listed on Pearlie are private dental practices. If you are looking for NHS dental services, visit the NHS Find a Dentist tool." },
    { question: "Can I compare clinics side by side?", answer: "Yes. Pearlie lets you compare clinics side by side — including services offered, pricing indications, patient reviews, clinic photos, and availability. This helps you make an informed decision without needing to call each clinic individually." },
    { question: "What if I don't find the right clinic?", answer: "You can adjust your preferences or submit another match request at any time. Pearlie is continuously expanding its clinic network across London and the wider UK to offer more options." },
    { question: "Do clinics pay to appear higher?", answer: "No. Clinic visibility on Pearlie is based on match relevance and profile completeness — not paid ranking. Clinics cannot pay to appear higher in your results. This ensures recommendations are based on fit, not advertising spend." },
  ]

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbSchema items={[
        { name: "Home", url: "https://pearlie.org" },
        { name: "FAQ", url: "https://pearlie.org/faq" },
      ]} />
      <MainNav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqItems.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
              },
            })),
          }),
        }}
      />

      <main>
        <section className="pt-32 pb-12 sm:pt-32 sm:pb-20 bg-background">
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
                    Yes. Pearlie is completely free for patients. There are no sign-up fees, subscription charges, or
                    hidden costs. You are under no obligation to book or proceed with any clinic you are matched with.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2" className="border-none rounded-lg px-4 sm:px-6 bg-[var(--cream)]">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                    Does Pearlie provide dental advice?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    No. Pearlie does not provide dental or medical advice. All diagnosis, treatment planning, and
                    clinical care are provided by independent dental clinics. For general dental health information,
                    visit the{" "}
                    <a href="https://www.nhs.uk/live-well/healthy-teeth-and-gums/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      NHS dental health pages
                    </a>.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3" className="border-none rounded-lg px-4 sm:px-6 bg-[var(--cream)]">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                    How are clinics selected?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    Clinics are selected based on practical factors such as location, services offered, availability,
                    and suitability for your preferences. Every clinic on Pearlie is verified as registered with the{" "}
                    <a href="https://www.gdc-uk.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      General Dental Council (GDC)
                    </a>, the UK&apos;s dental regulator. Not all clinics in an area are listed — we focus on quality over quantity.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4" className="border-none rounded-lg px-4 sm:px-6 bg-[var(--cream)]">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                    Do I have to book with a clinic?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    No. You are under no obligation to book or contact any clinic shown. Pearlie simply helps you
                    explore suitable options. You can compare clinics, ask questions via chat, and decide in your own time.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5" className="border-none rounded-lg px-4 sm:px-6 bg-[var(--cream)]">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                    How does Pearlie make money?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    Pearlie may receive a fee from clinics when a patient chooses to book following an introduction.
                    This is how we keep the service free for patients. Importantly, clinic fees do not influence which
                    clinics are recommended — matching is based on relevance and fit.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-6" className="border-none rounded-lg px-4 sm:px-6 bg-[var(--cream)]">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                    Are prices guaranteed?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    No. Any pricing information shown on Pearlie is indicative only and provided by the clinics
                    themselves. Final treatment costs are always discussed and agreed directly between you and the clinic
                    before any treatment begins.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-7" className="border-none rounded-lg px-4 sm:px-6 bg-[var(--cream)]">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                    Does Pearlie replace my dentist?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    No. Pearlie helps you find a clinic — it does not replace ongoing dental care or existing dentist
                    relationships. If you already have a dentist you trust, Pearlie can still be useful when seeking a
                    second opinion or specialist treatment.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-8" className="border-none rounded-lg px-4 sm:px-6 bg-[var(--cream)]">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                    What happens to my data?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    Your data is used only to provide the matching service and is handled in line with our{" "}
                    <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>{" "}
                    and UK GDPR. Clinics only see your details when you choose to contact them. You can request data
                    deletion at any time by emailing{" "}
                    <a href="mailto:privacy@pearlie.org" className="text-primary hover:underline">privacy@pearlie.org</a>.
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
                    Yes. Pearlie lets you compare clinics side by side — including services offered, pricing indications,
                    patient reviews, clinic photos, and availability. This helps you make an informed decision without
                    needing to call each clinic individually.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-11" className="border-none rounded-lg px-4 sm:px-6 bg-[var(--cream)]">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                    What if I don't find the right clinic?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    You can adjust your preferences or submit another match request at any time. Pearlie is continuously
                    expanding its clinic network across London and the wider UK to offer more options.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-12" className="border-none rounded-lg px-4 sm:px-6 bg-[var(--cream)]">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                    Do clinics pay to appear higher?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    No. Clinic visibility on Pearlie is based on match relevance and profile completeness — not paid
                    ranking. Clinics cannot pay to appear higher in your results. This ensures recommendations are based
                    on fit, not advertising spend.
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
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" variant="outline" asChild>
                  <a href="mailto:hello@pearlie.org">Contact Us</a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/about">About Pearlie</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/our-mission">Our Mission</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
