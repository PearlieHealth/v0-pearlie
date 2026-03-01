import { Star, Shield, CheckCircle2 } from "lucide-react"

export function KeyFactsBar() {
  return (
    <section className="border-b border-border/50 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-4 sm:gap-10 py-3 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            <span className="font-semibold text-foreground">4.8</span> avg
          </div>
          <div className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-[#0fbcb0]" />
            <span className="font-semibold text-foreground">100+</span> clinics
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0fbcb0]" />
            Free matching
          </div>
        </div>
      </div>
    </section>
  )
}
