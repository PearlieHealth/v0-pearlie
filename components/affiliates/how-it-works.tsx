"use client"

import { UserPlus, Share2, PoundSterling } from "lucide-react"

const steps = [
  {
    number: "1",
    icon: UserPlus,
    title: "Apply",
    description:
      "Fill in a quick application form. We review all applications within 48 hours and get you set up fast.",
  },
  {
    number: "2",
    icon: Share2,
    title: "Share",
    description:
      "Get your unique referral link and share it with your audience on TikTok, Instagram, YouTube, or anywhere.",
  },
  {
    number: "3",
    icon: PoundSterling,
    title: "Earn",
    description:
      "Every time someone books a confirmed dental appointment through your link, you earn a commission. Simple as that.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28" style={{ backgroundColor: "#FFF8F0" }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2
            className="text-3xl sm:text-4xl font-heading font-extrabold mb-4"
            style={{ color: "#0D4F4F" }}
          >
            How It Works
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "#1A1A2E" }}>
            Three steps to start earning with Pearlie
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <div
                key={step.number}
                className="relative bg-white rounded-2xl p-8 transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                style={{
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  borderTop: "3px solid transparent",
                  borderImage: "linear-gradient(135deg, #FF5C72, #00D4FF) 1",
                }}
              >
                {/* Step number */}
                <div
                  className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5 text-xl font-extrabold text-white"
                  style={{ background: "linear-gradient(135deg, #FF5C72 0%, #00D4FF 100%)" }}
                >
                  {step.number}
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <Icon className="w-5 h-5" style={{ color: "#0D4F4F" }} />
                  <h3 className="text-xl font-heading font-bold" style={{ color: "#0D4F4F" }}>
                    {step.title}
                  </h3>
                </div>

                <p className="leading-relaxed" style={{ color: "#1A1A2E" }}>
                  {step.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
