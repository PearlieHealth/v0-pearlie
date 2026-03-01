import { Hospital } from "lucide-react"
import type { LondonBorough } from "@/lib/data/london-boroughs"

interface AreaNhsInfoProps {
  borough: LondonBorough
}

export function AreaNhsInfo({ borough }: AreaNhsInfoProps) {
  return (
    <section className="py-10 sm:py-14">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border border-border/50 bg-card p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 shrink-0">
                <Hospital className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-heading font-bold text-foreground mb-2">
                  NHS dental care in {borough.name}
                </h2>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {borough.nhsInfo}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
