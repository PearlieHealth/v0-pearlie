import { Building2, Users, MapPin, ShieldCheck } from "lucide-react"
import type { LondonBorough } from "@/lib/data/london-boroughs"

interface AreaStatsBarProps {
  borough: LondonBorough
  clinicCount: number
  treatmentName?: string
}

export function AreaStatsBar({
  borough,
  clinicCount,
  treatmentName,
}: AreaStatsBarProps) {
  const facts = [
    {
      icon: Building2,
      label: treatmentName ? `${treatmentName} clinics` : "Clinics",
      value:
        clinicCount > 0
          ? `${clinicCount} verified`
          : "Clinics available",
    },
    {
      icon: Users,
      label: "Population",
      value: borough.population.toLocaleString("en-GB"),
    },
    {
      icon: MapPin,
      label: "Postcodes",
      value: borough.postcodes.slice(0, 3).join(", "),
    },
    {
      icon: ShieldCheck,
      label: "Standard",
      value: "GDC registered",
    },
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
                  <p className="text-sm font-semibold text-foreground">
                    {fact.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
