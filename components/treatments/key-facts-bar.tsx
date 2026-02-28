import { PoundSterling, Clock, ShieldCheck, BadgeCheck, Star } from "lucide-react"

interface KeyFactsBarProps {
  priceRange: string
  treatmentDuration: string
}

export function KeyFactsBar({ priceRange, treatmentDuration }: KeyFactsBarProps) {
  const facts = [
    { icon: PoundSterling, label: "Price range", value: priceRange },
    { icon: Clock, label: "Duration", value: treatmentDuration },
    { icon: ShieldCheck, label: "Standard", value: "GDC registered" },
    { icon: BadgeCheck, label: "Quality", value: "Quality reviewed" },
    { icon: Star, label: "Rating", value: "4.8 Avg Rating" },
  ]

  return (
    <section className="bg-[var(--cream)] border-y border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:gap-x-8 md:gap-x-10">
            {facts.map((fact) => (
              <div key={fact.label} className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#0fbcb0]/10 shrink-0">
                  <fact.icon className="w-4.5 h-4.5 text-[#0fbcb0]" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground leading-tight">{fact.label}</p>
                  <p className="text-sm font-semibold text-foreground leading-tight">{fact.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
