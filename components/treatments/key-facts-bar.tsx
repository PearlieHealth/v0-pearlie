import { PoundSterling, Clock, Building2, ShieldCheck } from "lucide-react"

interface KeyFactsBarProps {
  priceRange: string
  treatmentDuration: string
}

export function KeyFactsBar({ priceRange, treatmentDuration }: KeyFactsBarProps) {
  const facts = [
    { icon: PoundSterling, label: "Price range", value: priceRange },
    { icon: Clock, label: "Duration", value: treatmentDuration },
    { icon: Building2, label: "Clinics", value: "Verified clinics" },
    { icon: ShieldCheck, label: "Standard", value: "GDC registered" },
  ]

  return (
    <section className="bg-[var(--cream)] border-y border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {facts.map((fact) => (
              <div key={fact.label} className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#0fbcb0]/10 shrink-0">
                  <fact.icon className="w-5 h-5 text-[#0fbcb0]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{fact.label}</p>
                  <p className="text-sm font-semibold text-foreground">{fact.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
