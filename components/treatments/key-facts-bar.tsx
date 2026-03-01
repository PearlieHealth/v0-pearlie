import { ShieldCheck, PoundSterling, BadgeCheck, ArrowRight } from "lucide-react"

const trustSignals = [
  { icon: ShieldCheck, label: "Standard", value: "GDC-registered clinics only" },
  { icon: PoundSterling, label: "Pricing", value: "Transparent pricing ranges" },
  { icon: BadgeCheck, label: "Quality", value: "Reviewed annually" },
  { icon: ArrowRight, label: "Compare", value: "Compare before booking" },
]

export function KeyFactsBar() {
  return (
    <section className="bg-[var(--cream)] border-y border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:gap-x-8 md:gap-x-10">
            {trustSignals.map((fact) => (
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
