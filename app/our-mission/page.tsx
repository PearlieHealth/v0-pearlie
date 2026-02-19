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
} from "lucide-react"
import { SiteFooter } from "@/components/site-footer"

// Stat card component
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
    <Card className="bg-white border-border/50 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="text-3xl md:text-4xl font-bold text-[#0fbcb0] mb-2">{value}</div>
        <div className="text-lg font-semibold text-foreground mb-1">{label}</div>
        <p className="text-sm text-muted-foreground mb-3">{context}</p>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          Source: {sourceName}
          <ExternalLink className="w-3 h-3" />
        </a>
      </CardContent>
    </Card>
  )
}

// Care tier card component
function CareTierCard({
  title,
  tag,
  includes,
  promise,
  tagColor = "bg-[#0fbcb0]",
}: {
  title: string
  tag: string
  includes: string[]
  promise: string
  tagColor?: string
}) {
  return (
    <Card className="bg-white border-2 border-border/50 hover:border-[#0fbcb0]/30 transition-all h-full">
      <CardHeader className="pb-4">
        <Badge className={`${tagColor} text-white w-fit mb-2`}>{tag}</Badge>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {includes.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <div className="pt-4 border-t border-border/50">
          <p className="text-sm font-medium text-[#0fbcb0] italic">&ldquo;{promise}&rdquo;</p>
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

      {/* Section 1 — The Problem */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">The Problem</Badge>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                Millions across England are struggling to access basic dental care.
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                These aren&apos;t just statistics — they&apos;re your neighbours, colleagues, and family members.
              </p>
            </div>

            {/* Stat Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {stats.slice(0, 3).map((stat, i) => (
                <StatCard key={i} {...stat} />
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {stats.slice(3).map((stat, i) => (
                <StatCard key={i} {...stat} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 — What Happens When Access Fails */}
      <section className="py-16 md:py-24 bg-[#F8F1E7]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Chart 1: What people do */}
              <Card className="bg-white border-0">
                <CardHeader>
                  <CardTitle className="text-lg">What people do when they can&apos;t get NHS dental care</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Paid privately</span>
                        <span className="font-semibold">69%</span>
                      </div>
                      <div className="h-8 bg-gray-200 rounded-full overflow-hidden">
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
                      <div className="flex justify-between text-sm mb-1">
                        <span>Treated themselves</span>
                        <span className="font-semibold">26%</span>
                      </div>
                      <div className="h-8 bg-gray-200 rounded-full overflow-hidden">
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
              <Card className="bg-white border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Unmet dental need in England</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Adults with unmet need</span>
                        <span className="font-semibold">13m (28%)</span>
                      </div>
                      <div className="h-8 bg-gray-200 rounded-full overflow-hidden">
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
                      <div className="flex justify-between text-sm mb-1">
                        <span>Tried &amp; failed to get appointment</span>
                        <span className="font-semibold">5.6m</span>
                      </div>
                      <div className="h-8 bg-gray-200 rounded-full overflow-hidden">
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
                      <div className="flex justify-between text-sm mb-1">
                        <span>Gave up trying</span>
                        <span className="font-semibold">5.4m</span>
                      </div>
                      <div className="h-8 bg-gray-200 rounded-full overflow-hidden">
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

            <p className="text-xs text-center text-muted-foreground mt-6">
              Data sources: BDA, Ipsos, GOV.UK Adult Oral Health Survey
            </p>

            {/* Framing paragraph */}
            <p className="text-base text-muted-foreground text-center max-w-3xl mx-auto mt-10">
              When access fails, patients are forced to choose between high private costs or unsafe self-treatment. The Pearlie Care Fund was created to respond to this gap responsibly — not emotionally, but structurally.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3 — What the Pearlie Care Fund Covers */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">The Response</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                What the Pearlie Care Fund covers
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Clear, bounded care with transparent expectations. We prioritise emergency relief — not comprehensive treatment.
              </p>
            </div>

            {/* Care Tier Cards */}
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
                tagColor="bg-[#0fbcb0]"
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
                tagColor="bg-[#3c8481]"
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
                tagColor="bg-[#48BB78]"
              />
            </div>

            {/* What's NOT included */}
            <Card className="bg-white border-border/50 max-w-2xl mx-auto mb-8">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-muted-foreground" />
                  What&apos;s not included
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {notIncluded.map((item, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="bg-gray-50 text-muted-foreground border-gray-200"
                    >
                      <XCircle className="w-3 h-3 mr-1 text-gray-400" />
                      {item}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Safeguarding note */}
            <p className="text-sm text-muted-foreground text-center max-w-2xl mx-auto">
              The Care Fund is designed for emergency stabilisation and essential treatment only. It does not replace NHS services or provide comprehensive treatment plans.
            </p>
          </div>
        </div>
      </section>

      {/* Section 4 — Currently in Development */}
      <section className="py-16 md:py-24 bg-[#F8F1E7]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              The Pearlie Care Fund
            </h2>
            <Badge className="bg-[#0fbcb0] text-white mb-8">Currently in Development</Badge>

            <p className="text-lg text-muted-foreground mb-8">
              We are building this initiative in partnership with clinics and community organisations to ensure:
            </p>

            <ul className="space-y-3 text-left max-w-md mx-auto mb-8">
              {[
                "Clear eligibility criteria",
                "Ethical allocation",
                "Transparent funding structure",
                "Defined clinic participation standards",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-foreground">
                  <CheckCircle2 className="w-5 h-5 text-[#0fbcb0] mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <p className="text-base text-muted-foreground font-medium">
              This programme will launch once these safeguards are in place.
            </p>
          </div>
        </div>
      </section>

      {/* Section 5 — Soft CTA */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Help us make this a reality
            </h2>

            <p className="text-lg text-muted-foreground mb-6">
              If you are:
            </p>

            <ul className="space-y-2 text-left max-w-sm mx-auto mb-8">
              {[
                "A dental clinic",
                "A community organisation",
                "A charity",
                "A potential funding partner",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0fbcb0] flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <p className="text-base text-muted-foreground mb-8">
              And would like to contribute to the development of the Pearlie Care Fund, we would welcome a conversation.
            </p>

            <a
              href="mailto:hello@pearlie.co.uk"
              className="inline-flex items-center gap-2 text-[#0fbcb0] hover:text-[#0da399] font-medium text-lg transition-colors"
            >
              <Mail className="w-5 h-5" />
              Contact us
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
