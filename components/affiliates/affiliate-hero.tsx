"use client"

import Link from "next/link"
import { Heart, ArrowRight } from "lucide-react"

export function AffiliateHero() {
  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: "#FFF8F0" }}>
      {/* Nav bar */}
      <header className="relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Heart className="w-5 h-5" style={{ color: "#0D4F4F", fill: "#0D4F4F" }} />
            <span className="text-lg font-heading font-bold" style={{ color: "#0D4F4F" }}>
              Pearlie
            </span>
          </Link>
          <a
            href="#apply"
            className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
            style={{ background: "linear-gradient(135deg, #FF5C72 0%, #00D4FF 100%)" }}
          >
            Apply Now
          </a>
        </div>
      </header>

      {/* Decorative gradient blobs */}
      <div
        className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
        style={{ background: "linear-gradient(135deg, #FF5C72, #00D4FF)" }}
      />
      <div
        className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-10 blur-3xl"
        style={{ background: "linear-gradient(135deg, #00D4FF, #00D68F)" }}
      />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <div
            className="inline-block mb-6 px-4 py-1.5 rounded-full text-sm font-medium"
            style={{ backgroundColor: "rgba(255, 92, 114, 0.1)", color: "#FF5C72" }}
          >
            Pearlie Affiliate Programme
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold leading-tight mb-6"
            style={{ color: "#0D4F4F" }}
          >
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #FF5C72 0%, #00D4FF 100%)" }}
            >
              Earn
            </span>{" "}
            by helping patients find the right dentist
          </h1>

          <p
            className="text-lg sm:text-xl leading-relaxed mb-10 max-w-2xl mx-auto"
            style={{ color: "#1A1A2E" }}
          >
            Share your unique referral link with your audience. When someone books a dental appointment through Pearlie, you
            get paid. It&apos;s that simple.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#apply"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-white font-bold text-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
              style={{ background: "linear-gradient(135deg, #FF5C72 0%, #00D4FF 100%)" }}
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-lg border-2 transition-all duration-200 hover:text-white"
              style={{
                borderColor: "#0D4F4F",
                color: "#0D4F4F",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#0D4F4F"
                e.currentTarget.style.color = "#FFFFFF"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent"
                e.currentTarget.style.color = "#0D4F4F"
              }}
            >
              Learn More
            </a>
          </div>

          {/* Trust badges */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-6 sm:gap-8">
            {[
              "Commission per booking",
              "30-day cookie window",
              "Real-time dashboard",
              "Monthly payouts",
            ].map((badge) => (
              <div
                key={badge}
                className="flex items-center gap-2 text-sm font-medium"
                style={{ color: "#0D4F4F" }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: "linear-gradient(135deg, #FF5C72, #00D4FF)" }}
                />
                {badge}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
