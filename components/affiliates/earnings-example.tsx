"use client"

import { PoundSterling, Users, TrendingUp } from "lucide-react"

export function EarningsExample() {
  return (
    <section className="py-20 sm:py-28" style={{ backgroundColor: "#FFF8F0" }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2
            className="text-3xl sm:text-4xl font-heading font-extrabold mb-4"
            style={{ color: "#0D4F4F" }}
          >
            What Could You Earn?
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "#1A1A2E" }}>
            Here&apos;s a realistic example based on our affiliate commission rates
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div
            className="bg-white rounded-2xl p-8 sm:p-10"
            style={{
              boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
              borderLeft: "4px solid transparent",
              borderImage: "linear-gradient(to bottom, #FF5C72, #00D4FF) 1",
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mb-8">
              {/* Referrals */}
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                  <Users className="w-4 h-4" style={{ color: "#00D4FF" }} />
                  <span className="text-sm font-medium" style={{ color: "#1A1A2E", opacity: 0.6 }}>
                    Monthly referrals
                  </span>
                </div>
                <p className="text-3xl font-extrabold" style={{ color: "#0D4F4F" }}>
                  50
                </p>
                <p className="text-sm" style={{ color: "#1A1A2E", opacity: 0.5 }}>
                  patients sent via your link
                </p>
              </div>

              {/* Commission */}
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                  <PoundSterling className="w-4 h-4" style={{ color: "#FF5C72" }} />
                  <span className="text-sm font-medium" style={{ color: "#1A1A2E", opacity: 0.6 }}>
                    Commission per booking
                  </span>
                </div>
                <p className="text-3xl font-extrabold" style={{ color: "#0D4F4F" }}>
                  &pound;25
                </p>
                <p className="text-sm" style={{ color: "#1A1A2E", opacity: 0.5 }}>
                  per confirmed appointment
                </p>
              </div>

              {/* Earnings */}
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                  <TrendingUp className="w-4 h-4" style={{ color: "#00D68F" }} />
                  <span className="text-sm font-medium" style={{ color: "#1A1A2E", opacity: 0.6 }}>
                    Potential earnings
                  </span>
                </div>
                <p className="text-3xl font-extrabold" style={{ color: "#00D68F" }}>
                  &pound;1,250
                </p>
                <p className="text-sm" style={{ color: "#1A1A2E", opacity: 0.5 }}>
                  per month
                </p>
              </div>
            </div>

            <div
              className="rounded-xl p-4 text-center"
              style={{ backgroundColor: "rgba(0, 214, 143, 0.08)" }}
            >
              <p className="text-sm" style={{ color: "#0D4F4F" }}>
                <strong>The more you share, the more you earn.</strong> Top affiliates with engaged audiences can earn
                significantly more. Commission rates may vary — we&apos;ll confirm your rate when your application is approved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
