import { Info } from "lucide-react"

interface RisksConsiderationsProps {
  risks: {
    heading: string
    items: {
      risk: string
      detail: string
    }[]
    reassurance: string
  }
}

export function RisksConsiderations({ risks }: RisksConsiderationsProps) {
  return (
    <section className="py-10 sm:py-14">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-6">
            {risks.heading}
          </h2>

          <div className="space-y-4 mb-8">
            {risks.items.map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#004443]/5 shrink-0 mt-0.5">
                  <Info className="w-3.5 h-3.5 text-[#004443]/60" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">
                    {item.risk}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#0fbcb0]/5 border border-[#0fbcb0]/20 rounded-xl p-5">
            <p className="text-sm text-foreground leading-relaxed">
              {risks.reassurance}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
