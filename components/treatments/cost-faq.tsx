"use client"

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import type { CostFAQ as CostFAQType } from "@/lib/data/treatment-cost-content"

function questionToId(question: string): string {
  return (
    "cost-faq-" +
    question
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  )
}

interface CostFAQProps {
  faqs: CostFAQType[]
  treatmentName: string
}

export function CostFAQ({ faqs, treatmentName }: CostFAQProps) {
  if (faqs.length === 0) return null

  return (
    <section data-speakable="faq" className="py-12 sm:py-16 bg-secondary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 id="cost-faq" className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-foreground mb-8">
            {treatmentName} cost: frequently asked questions
          </h2>

          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => {
              const anchorId = questionToId(faq.question)
              return (
                <AccordionItem
                  key={index}
                  id={anchorId}
                  value={`cost-faq-${index}`}
                  className="rounded-xl border border-border/50 bg-card px-5 sm:px-6 scroll-mt-24"
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
