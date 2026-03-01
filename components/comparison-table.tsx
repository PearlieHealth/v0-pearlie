"use client"

import { Check, X, Sparkles, Clock, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const withPearlieFeatures: Array<string | { text: string; href: string }> = [
  "Time to think before deciding",
  "Know what matters to you first",
  "Matched to the right clinic",
  "Compare options side-by-side",
  "Chat directly with clinics",
  "Book simply, when ready",
  { text: "Confidence with the Pearlie Guarantee", href: "/about#pearlie-guarantee" },
]

const traditionalFeatures = [
  "Rushed into decisions",
  "Unclear on priorities",
  "Random clinic selection",
  "No easy way to compare",
  "Calling multiple clinics",
  "Repeating your story",
]

export function ComparisonTable() {
  return (
    <section className="py-16 md:py-28 lg:py-32 bg-[#0d1019]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 md:mb-16">
            {/* Small accent label */}
            <span className="inline-block text-xs font-extrabold tracking-[0.08em] uppercase text-primary mb-4">
              Why Pearlie
            </span>

            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-heading font-bold tracking-[-0.03em] mb-4 text-white leading-[1.1]">
              Clarity before commitment.<br />
              Confidence before booking.<br />
              <span className="text-primary">Peace of mind.</span>
            </h2>

            <p className="text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
              Pearlie gives you space to understand your options before making a decision.
            </p>
          </div>

          {/* Side by Side Comparison Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* With Pearlie Card */}
            <div className="relative rounded-3xl border-2 border-primary bg-white/10 backdrop-blur-sm p-5 sm:p-8 shadow-lg overflow-hidden h-full">
              {/* Badge */}
              <div className="absolute top-4 right-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold">
                  <Sparkles className="w-3 h-3" />
                  Recommended
                </span>
              </div>

              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-primary shadow-lg flex items-center justify-center">
                  <Check className="w-7 h-7 text-white" strokeWidth={3} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">With Pearlie</h4>
                  <p className="text-sm text-white/70">Clarity before commitment.</p>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-4">
                {withPearlieFeatures.map((feature, index) => {
                  const isLink = typeof feature === "object"
                  const text = isLink ? feature.text : feature
                  return (
                    <li key={index} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-emerald-400" strokeWidth={3} />
                      </div>
                      {isLink ? (
                        <Link href={feature.href} className="text-white font-medium hover:underline inline-flex items-center gap-1.5">
                          {text}
                          <Info className="w-4 h-4 text-white/50" />
                        </Link>
                      ) : (
                        <span className="text-white font-medium">{text}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* The Traditional Way Card */}
            <div className="rounded-3xl border border-white/20 bg-white/5 backdrop-blur-sm p-5 sm:p-8 h-full">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                  <Clock className="w-7 h-7 text-white/50" strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white/60">The traditional way</h4>
                  <p className="text-sm text-white/40">Less clarity. More pressure.</p>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-4">
                {traditionalFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <X className="w-4 h-4 text-red-400" strokeWidth={2.5} />
                    </div>
                    <span className="text-white/60">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button
              size="lg"
              className="text-base px-10 h-14 bg-primary hover:bg-[var(--primary-hover)] text-white rounded-full shadow-lg hover:shadow-xl transition-all border-0"
              asChild
            >
              <Link href="/intake">Get my clinic matches</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
