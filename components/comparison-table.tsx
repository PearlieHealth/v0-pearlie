"use client"

import { Check, X, Sparkles, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const withPearlieFeatures = [
  "Time to think before deciding",
  "Know what matters to you first",
  "Matched to the right clinic",
  "Compare options side-by-side",
  "No pressure sales tactics",
  "Confidence before you book",
]

const withoutPearlieFeatures = [
  "Rushed into decisions",
  "Unclear on your priorities",
  "Random clinic selection",
  "No easy comparison",
  "Potential sales pressure",
  "Uncertainty when booking",
]

export function ComparisonTable() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h3 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-foreground">
              Dental decisions shouldn't feel stressful.
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Pearlie gives you space to think before you're in the chair.
            </p>
          </div>

          {/* Side by Side Comparison Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* With Pearlie Card */}
            <div className="relative rounded-3xl border-2 border-primary bg-gradient-to-br from-primary/5 to-secondary/50 p-8 shadow-lg overflow-hidden">
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
                  <h4 className="text-xl font-bold text-foreground">With Pearlie</h4>
                  <p className="text-sm text-muted-foreground">Smart, stress-free matching</p>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-4">
                {withPearlieFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-emerald-600" strokeWidth={3} />
                    </div>
                    <span className="text-foreground font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Without Pearlie Card */}
            <div className="rounded-3xl border border-border bg-white p-8 shadow-sm">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <Clock className="w-7 h-7 text-gray-400" strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-500">On your own</h4>
                  <p className="text-sm text-gray-400">The traditional way</p>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-4">
                {withoutPearlieFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                      <X className="w-4 h-4 text-red-400" strokeWidth={2.5} />
                    </div>
                    <span className="text-gray-500">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Tagline */}
          <div className="text-center mb-10">
            <p className="text-lg text-foreground/80 font-medium leading-relaxed max-w-xl mx-auto">
              Taking time to think isn't hesitation. It's good decision-making.
            </p>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button
              size="lg"
              className="text-base px-10 h-14 bg-primary hover:bg-[var(--primary-hover)] text-white rounded-full shadow-lg hover:shadow-xl transition-all mb-3"
              asChild
            >
              <Link href="/intake">Get my clinic matches</Link>
            </Button>
            <p className="text-sm text-muted-foreground">Free • No sign-up required</p>
          </div>
        </div>
      </div>
    </section>
  )
}
