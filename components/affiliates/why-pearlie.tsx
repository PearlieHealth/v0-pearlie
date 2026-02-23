"use client"

import {
  TrendingUp,
  Shield,
  BarChart3,
  Clock,
  Users,
  Zap,
} from "lucide-react"

const benefits = [
  {
    icon: TrendingUp,
    title: "Competitive commissions",
    description: "Earn a generous fixed fee for every confirmed dental booking made through your referral link.",
  },
  {
    icon: Clock,
    title: "30-day cookie window",
    description:
      "Your audience has 30 days to book after clicking your link. No pressure, no rush — you still get credited.",
  },
  {
    icon: BarChart3,
    title: "Real-time dashboard",
    description: "Track your clicks, conversions, and earnings in real-time from your personal affiliate dashboard.",
  },
  {
    icon: Shield,
    title: "Trusted brand",
    description:
      "Pearlie is an independent, UK-founded platform matching patients with GDC-registered clinics. Your audience is in safe hands.",
  },
  {
    icon: Users,
    title: "Built for creators",
    description:
      "Whether you're a TikTok creator, Instagram influencer, health blogger, or dental professional — this programme is designed for you.",
  },
  {
    icon: Zap,
    title: "Quick payouts",
    description: "Monthly payouts via bank transfer or PayPal. No minimum thresholds to worry about.",
  },
]

export function WhyPearlie() {
  return (
    <section className="py-20 sm:py-28" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2
            className="text-3xl sm:text-4xl font-heading font-extrabold mb-4"
            style={{ color: "#0D4F4F" }}
          >
            Why Partner with Pearlie?
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "#1A1A2E" }}>
            Everything you need to earn confidently
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {benefits.map((benefit) => {
            const Icon = benefit.icon
            return (
              <div
                key={benefit.title}
                className="flex items-start gap-4 p-6 rounded-2xl transition-all duration-200 hover:shadow-md"
                style={{ backgroundColor: "#FFF8F0" }}
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "rgba(255, 92, 114, 0.1)" }}
                >
                  <Icon className="w-5 h-5" style={{ color: "#FF5C72" }} />
                </div>
                <div>
                  <h3 className="font-heading font-bold mb-1" style={{ color: "#0D4F4F" }}>
                    {benefit.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#1A1A2E" }}>
                    {benefit.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
