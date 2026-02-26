"use client"

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import type { TreatmentFAQ as TreatmentFAQType } from "@/lib/content/treatments"

function questionToId(question: string): string {
  return (
    "faq-" +
    question
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  )
}

interface TreatmentFAQProps {
  faqs: TreatmentFAQType[]
  treatmentName: string
}

export function TreatmentFAQ({ faqs, treatmentName }: TreatmentFAQProps) {
  if (faqs.length === 0) return null

  return (
    <section data-speakable="faq" className="py-12 sm:py-16 bg-[var(--cream)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 id="faq" className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-8">
            Frequently asked questions about {treatmentName.toLowerCase()}
          </h2>

          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => {
              const anchorId = questionToId(faq.question)
              return (
                <AccordionItem
                  key={index}
                  id={anchorId}
                  value={`faq-${index}`}
                  className="rounded-xl border border-border/50 bg-white px-5 sm:px-6 scroll-mt-24"
                >
                  <AccordionTrigger className="text-base font-semibold text-foreground text-left py-5 hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground leading-relaxed pb-5">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
