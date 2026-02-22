"use client"

import { Check, X, Sparkles, Clock, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const withPearlieFeatures: Array<string | { text: string; href: string }> = [
  "Time to think before deciding",
  "Know what matters to you first",
  "Matched to the right clinic",
  "Compare options side-by-side",
  "Chat directly with clinics online",
  "Book appointments online, simply",
  "Manage messages and visits in one place",
  { text: "Confidence with the Pearlie Guarantee", href: "/about#pearlie-guarantee" },
]

const withoutPearlieFeatures = [
  "Rushed into decisions",
  "Unclear on your priorities",
  "Random clinic selection",
  "No easy way to compare",
  "Calling multiple clinics",
  "Repeating your story again and again",
  "Potential sales pressure",
  "Uncertainty before committing",
]

export function ComparisonTable() {
  return (
    <section className="py-16 md:py-28 lg:py-32 bg-[#004443]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-heading font-medium tracking-tight mb-6 text-[#0fbcb0]">
              Why Pearlie
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-white">
              Dental decisions shouldn&apos;t feel stressful.
            </h3>
            <p className="text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
              Pearlie gives you space to think before you&apos;re in the chair.
            </p>
          </div>

          {/* Side by Side Comparison Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* With Pearlie Card */}
            <div className="relative rounded-3xl border-2 border-[#0fbcb0] bg-white/10 backdrop-blur-sm p-5 sm:p-8 shadow-lg overflow-hidden h-full">
              {/* Badge */}
              <div className="absolute top-4 right-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0fbcb0] text-white text-xs font-semibold">
                  <Sparkles className="w-3 h-3" />
                  Recommended
                </span>
              </div>

              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-[#0fbcb0] shadow-lg flex items-center justify-center">
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

            {/* Without Pearlie Card */}
            <div className="rounded-3xl border border-white/20 bg-white/5 backdrop-blur-sm p-5 sm:p-8 h-full">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                  <Clock className="w-7 h-7 text-white/50" strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white/60">On your own</h4>
                  <p className="text-sm text-white/40">The traditional way.</p>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-4">
                {withoutPearlieFeatures.map((feature, index) => (
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

          {/* Tagline */}
          <div className="text-center mb-10">
            <p className="text-lg text-white/70 font-medium leading-relaxed max-w-xl mx-auto">
              Taking time to think isn&apos;t hesitation. It&apos;s good decision-making.
            </p>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button
              size="lg"
              className="text-base px-10 h-14 bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full shadow-lg hover:shadow-xl transition-all border-0"
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
