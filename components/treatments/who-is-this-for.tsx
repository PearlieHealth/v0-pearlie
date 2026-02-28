import { UserCheck } from "lucide-react"

interface WhoIsThisForProps {
  personas: string[]
  summary: string
  treatmentName: string
}

export function WhoIsThisFor({ personas, summary, treatmentName }: WhoIsThisForProps) {
  return (
    <section className="py-10 sm:py-14 bg-[var(--cream)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-6">
            Is {treatmentName.toLowerCase()} right for you?
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            {summary}
          </p>

          <ul className="space-y-3">
            {personas.map((persona, i) => (
              <li key={i} className="flex gap-3 text-sm text-foreground leading-relaxed">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0fbcb0]/10 shrink-0 mt-0.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#0fbcb0]" />
                </div>
                {persona}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
