"use client"

import { motion } from "framer-motion"
import { MainNav } from "@/components/main-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Mail,
  ArrowRight,
} from "lucide-react"
import { SiteFooter } from "@/components/site-footer"
import { TrustBadgeStrip } from "@/components/trust-badge-strip"
import Link from "next/link"
import { Button } from "@/components/ui/button"

// Fade-in animation wrapper
function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </motion.div>
  )
}

// Stat card — dark variant for hero
function StatCard({
  value,
  label,
  context,
  sourceName,
  sourceUrl,
}: {
  value: string
  label: string
  context: string
  sourceName: string
  sourceUrl: string
}) {
  return (
    <div className="bg-white/[0.07] backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/[0.10] transition-colors">
      <div className="text-3xl md:text-4xl font-bold text-[#0fbcb0] mb-2">{value}</div>
      <div className="text-base font-semibold text-white mb-1">{label}</div>
      <p className="text-sm text-white/60 mb-3">{context}</p>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-white/40 hover:text-white/70 inline-flex items-center gap-1 transition-colors"
      >
        Source: {sourceName}
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  )
}

// Care tier card
function CareTierCard({
  title,
  tag,
  includes,
  promise,
  accentColor = "#0fbcb0",
}: {
  title: string
  tag: string
  includes: string[]
  promise: string
  accentColor?: string
}) {
  return (
    <Card className="bg-white border-0 shadow-[0_4px_24px_rgba(0,0,0,0.06)] rounded-2xl h-full overflow-hidden">
      <div className="h-1" style={{ backgroundColor: accentColor }} />
      <CardHeader className="pb-4 pt-6">
        <span
          className="text-xs font-semibold uppercase tracking-wider mb-2 block"
          style={{ color: accentColor }}
        >
          {tag}
        </span>
        <CardTitle className="text-xl text-[#004443]">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2.5">
          {includes.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-[#555]">
              <CheckCircle2
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                style={{ color: accentColor }}
              />
              {item}
            </li>
          ))}
        </ul>
        <div className="pt-4 border-t border-[#f0ede8]">
          <p className="text-sm font-medium text-[#004443]/70 italic">&ldquo;{promise}&rdquo;</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function OurMissionPage() {
  const stats = [
    {
      value: "13m",
      label: "Adults with unmet dental need",
      context: "In England alone, millions can't access NHS dental care",
      sourceName: "BDA",
      sourceUrl: "https://www.bda.org/news-centre/latest-news-articles/13-million-unable-to-access-nhs-dentistry/",
    },
    {
      value: "5.6m",
      label: "Failed to get an NHS appointment",
      context: "Tried but couldn't secure dental care",
      sourceName: "BDA",
      sourceUrl: "https://www.bda.org/news-centre/latest-news-articles/13-million-unable-to-access-nhs-dentistry/",
    },
    {
      value: "69%",
      label: "Paid privately when NHS failed",
      context: "Of those unable to access NHS care",
      sourceName: "Ipsos",
      sourceUrl: "https://www.ipsos.com/en-uk/one-four-britons-unable-get-nhs-dental-appointment-treated-themselves",
    },
    {
      value: "26%",
      label: "Treated themselves",
      context: "Resorted to unsafe self-treatment",
      sourceName: "Ipsos",
      sourceUrl: "https://www.ipsos.com/en-uk/one-four-britons-unable-get-nhs-dental-appointment-treated-themselves",
    },
    {
      value: "1 in 10",
      label: "Adults reported dental pain",
      context: "Living with untreated dental problems",
      sourceName: "Adult Oral Health Survey",
      sourceUrl: "https://www.gov.uk/government/statistics/adult-oral-health-survey-2021",
    },
  ]

  const notIncluded = [
    "Cosmetic procedures",
    "Orthodontics",
    "Implants, crowns, or veneers",
    "Multi-visit treatment plans",
    "Complex endodontics or surgical work",
  ]

  return (
    <div className="min-h-screen bg-background">
      <MainNav />

      {/* ───────────────────────────────────────────────────────────────
          Section 1 — The Problem (dark teal hero with stat cards)
      ─────────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 md:pt-32 md:pb-28 overflow-hidden bg-[#004443]">
        {/* Subtle decorative glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#0fbcb0]/[0.06] blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-6xl mx-auto">
            <FadeIn>
              <div className="text-center mb-14">
                <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#0fbcb0] mb-5">
                  The Problem
                </span>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold tracking-[-0.03em] text-white mb-5 text-balance leading-tight">
                  Over 13 million adults in England have unmet dental needs.
                </h1>
                <p className="text-lg text-white/60 max-w-2xl mx-auto">
                  These aren&apos;t just statistics — they represent real people forced to choose between high private costs,
                  unsafe self-treatment, or going without care entirely.
                </p>
              </div>
            </FadeIn>

            {/* Stat Cards */}
            <FadeIn delay={0.15}>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
                {stats.slice(0, 3).map((stat, i) => (
                  <StatCard key={i} {...stat} />
                ))}
              </div>
            </FadeIn>
            <FadeIn delay={0.25}>
              <div className="grid md:grid-cols-2 gap-5 max-w-[calc(66.666%+0.625rem)] lg:max-w-[calc(66.666%-0.208rem)] mx-auto">
                {stats.slice(3).map((stat, i) => (
                  <StatCard key={i} {...stat} />
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <TrustBadgeStrip />

      {/* ───────────────────────────────────────────────────────────────
          Section 2 — What Happens When Access Fails (graph cards)
      ─────────────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-[#f7f4f0] to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <FadeIn>
              <div className="text-center mb-12">
                <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#3c8481] mb-4">
                  When Access Fails
                </span>
                <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-[-0.03em] text-[#004443]">
                  What people are forced to do
                </h2>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Chart 1: What people do */}
                <Card className="bg-white border-0 shadow-[0_4px_24px_rgba(0,0,0,0.06)] rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg text-[#004443]">
                      What people do when they can&apos;t get NHS dental care
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-5">
                      <div>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-[#555]">Paid privately</span>
                          <span className="font-semibold text-[#004443]">69%</span>
                        </div>
                        <div className="h-8 bg-[#004443]/[0.06] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-[#0fbcb0] rounded-full"
                            initial={{ width: 0 }}
                            whileInView={{ width: "69%" }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            viewport={{ once: true }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-[#555]">Treated themselves</span>
                          <span className="font-semibold text-[#004443]">26%</span>
                        </div>
                        <div className="h-8 bg-[#004443]/[0.06] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-[#dbc03a] rounded-full"
                            initial={{ width: 0 }}
                            whileInView={{ width: "26%" }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                            viewport={{ once: true }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Chart 2: Unmet need */}
                <Card className="bg-white border-0 shadow-[0_4px_24px_rgba(0,0,0,0.06)] rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg text-[#004443]">
                      Unmet dental need in England
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-5">
                      <div>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-[#555]">Adults with unmet need</span>
                          <span className="font-semibold text-[#004443]">13m (28%)</span>
                        </div>
                        <div className="h-8 bg-[#004443]/[0.06] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-[#0fbcb0] rounded-full"
                            initial={{ width: 0 }}
                            whileInView={{ width: "100%" }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            viewport={{ once: true }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-[#555]">Tried &amp; failed to get appointment</span>
                          <span className="font-semibold text-[#004443]">5.6m</span>
                        </div>
                        <div className="h-8 bg-[#004443]/[0.06] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-[#3c8481] rounded-full"
                            initial={{ width: 0 }}
                            whileInView={{ width: "43%" }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                            viewport={{ once: true }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-[#555]">Gave up trying</span>
                          <span className="font-semibold text-[#004443]">5.4m</span>
                        </div>
                        <div className="h-8 bg-[#004443]/[0.06] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-[#dbc03a] rounded-full"
                            initial={{ width: 0 }}
                            whileInView={{ width: "41%" }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
                            viewport={{ once: true }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </FadeIn>

            <p className="text-xs text-center text-[#999] mt-6">
              Data sources: BDA, Ipsos, GOV.UK Adult Oral Health Survey |{" "}
              <a href="https://www.dentalhealth.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#666]">Oral Health Foundation</a>
            </p>

            {/* Framing paragraph */}
            <FadeIn delay={0.1}>
              <p className="text-base text-[#555] text-center max-w-3xl mx-auto mt-10 leading-relaxed">
                When access fails, patients are forced to choose between high private costs or unsafe self-treatment. The Pearlie Care Fund was created to respond to this gap responsibly — not emotionally, but structurally.
              </p>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
          Section 3 — What the Pearlie Care Fund Covers
      ─────────────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-[#fafaf8]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <FadeIn>
              <div className="text-center mb-12">
                <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#0fbcb0] mb-4">
                  The Response
                </span>
                <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-[-0.03em] text-[#004443] mb-4">
                  What the Pearlie Care Fund covers
                </h2>
                <p className="text-lg text-[#666] max-w-2xl mx-auto">
                  Clear, bounded care with transparent expectations. We prioritise emergency relief — not comprehensive treatment.
                </p>
              </div>
            </FadeIn>

            {/* Care Tier Cards */}
            <FadeIn delay={0.1}>
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <CareTierCard
                  tag="Primary"
                  title="Emergency Relief Appointment"
                  includes={[
                    "Emergency assessment",
                    "X-rays if clinically necessary",
                    "Pain relief measures",
                    "Temporary filling or dressing if appropriate",
                    "Smoothing sharp edges",
                    "Advice + prescriptions when clinically indicated",
                  ]}
                  promise="Relief and stabilisation — not a full treatment plan."
                  accentColor="#0fbcb0"
                />

                <CareTierCard
                  tag="Optional (Capped)"
                  title="Essential Treatment Appointment"
                  includes={[
                    "One simple permanent filling",
                    "OR one non-surgical extraction",
                    "OR re-cement crown/bridge",
                    "OR targeted gum treatment if pain-linked",
                    "One visit only",
                  ]}
                  promise="One visit. One problem. Clinician-led."
                  accentColor="#3c8481"
                />

                <CareTierCard
                  tag="Limited Availability"
                  title="Preventive Access"
                  includes={[
                    "Check-up",
                    "Hygiene appointment",
                    "Only when clinics allocate preventive Care Fund slots",
                    "Not available by default",
                  ]}
                  promise="Prevention for those who need it most."
                  accentColor="#48BB78"
                />
              </div>
            </FadeIn>

            {/* What's NOT included */}
            <FadeIn delay={0.15}>
              <div className="max-w-2xl mx-auto mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-[#999]" />
                  <span className="text-sm font-semibold text-[#004443]">What&apos;s not included</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {notIncluded.map((item, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-sm text-[#888] border border-[#e8e5e0]"
                    >
                      <XCircle className="w-3 h-3 text-[#ccc]" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </FadeIn>

            {/* Safeguarding note */}
            <p className="text-sm text-[#888] text-center max-w-2xl mx-auto">
              The Care Fund is designed for emergency stabilisation and essential treatment only. It does not replace NHS services or provide comprehensive treatment plans.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
          Section 4 — Currently in Development
      ─────────────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-[#edf7f6] to-[#f0f9f8]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-8 md:p-12 text-center">
                <Badge className="bg-[#004443] text-white text-xs uppercase tracking-wider mb-6">
                  Currently in Development
                </Badge>

                <h2 className="text-2xl md:text-3xl font-bold text-[#004443] mb-6">
                  The Pearlie Care Fund
                </h2>

                <p className="text-[#666] mb-8 leading-relaxed">
                  We are building this initiative in partnership with clinics and community organisations to ensure:
                </p>

                <ul className="space-y-3 text-left max-w-sm mx-auto mb-8">
                  {[
                    "Clear eligibility criteria",
                    "Ethical allocation",
                    "Transparent funding structure",
                    "Defined clinic participation standards",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-[#333]">
                      <CheckCircle2 className="w-5 h-5 text-[#0fbcb0] mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="border-t border-[#f0ede8] pt-6">
                  <p className="text-sm text-[#888] font-medium">
                    This programme will launch once these safeguards are in place.
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
          Patient CTA
      ─────────────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-[#faf3e6]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.03em] text-[#004443] mb-4">
              Looking for a trusted dental clinic?
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              While we work on expanding access, Pearlie is already matching patients
              with verified, GDC-registered clinics across London.
            </p>
            <Button
              size="lg"
              className="bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full px-8 h-12 text-base border-0"
              asChild
            >
              <Link href="/intake">Find my clinic</Link>
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Free, independent, takes under 60 seconds
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
          Section 5 — Soft CTA (dark teal close)
      ─────────────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-[#004443] relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[#0fbcb0]/[0.05] blur-[100px] pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <FadeIn>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-[-0.03em] text-white mb-6">
                Help us make this a reality
              </h2>

              <p className="text-lg text-white/60 mb-8">
                If you are:
              </p>

              <ul className="space-y-2.5 text-left max-w-xs mx-auto mb-8">
                {[
                  "A dental clinic",
                  "A community organisation",
                  "A charity",
                  "A potential funding partner",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0fbcb0] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="text-base text-white/50 mb-10 max-w-lg mx-auto">
                And would like to contribute to the development of the Pearlie Care Fund, we would welcome a conversation.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="mailto:hello@pearlie.org"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white px-6 py-3 rounded-full font-medium transition-all hover:border-white/30"
                >
                  <Mail className="w-4 h-4" />
                  Contact us
                  <ArrowRight className="w-4 h-4 ml-1" />
                </a>
                <a
                  href="/about"
                  className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white px-6 py-3 rounded-full font-medium transition-all hover:border-white/20"
                >
                  About Pearlie
                </a>
                <a
                  href="/faq"
                  className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white px-6 py-3 rounded-full font-medium transition-all hover:border-white/20"
                >
                  FAQ
                </a>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
