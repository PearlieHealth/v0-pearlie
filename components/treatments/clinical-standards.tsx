import { ShieldCheck, BadgeCheck, ClipboardCheck, Eye } from "lucide-react"

interface ClinicalStandardsProps {
  treatmentName?: string
}

const standards = [
  {
    icon: ShieldCheck,
    title: "GDC-registered clinics only",
    description: "Every clinic listed on Pearlie is verified as registered with the General Dental Council.",
  },
  {
    icon: ClipboardCheck,
    title: "CQC inspection compliance",
    description: "Clinics meet Care Quality Commission standards for safety, effectiveness, and patient care.",
  },
  {
    icon: BadgeCheck,
    title: "Annual quality reviews",
    description: "We regularly review clinic credentials, patient feedback, and treatment standards.",
  },
  {
    icon: Eye,
    title: "Transparent pricing commitment",
    description: "All listed clinics provide upfront pricing with no hidden fees or surprise charges.",
  },
]

export function ClinicalStandards({ treatmentName }: ClinicalStandardsProps) {
  return (
    <section className="py-10 sm:py-14 bg-secondary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-foreground mb-2">
            Our quality standards
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            Every {treatmentName ? `${treatmentName.toLowerCase()} clinic` : "clinic"} on Pearlie meets these standards before being listed.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {standards.map((standard) => (
              <div key={standard.title} className="bg-card rounded-xl border border-border/50 p-5">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 mb-3">
                  <standard.icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  {standard.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {standard.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
