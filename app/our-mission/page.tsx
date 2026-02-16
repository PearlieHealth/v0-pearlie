"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { motion, useInView } from "framer-motion"
import { MainNav } from "@/components/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Heart, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  Clock,
  MapPin,
  Users,
  Calendar,
  Stethoscope,
  Sparkles,
  Building2,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  ChevronRight
} from "lucide-react"

// Animated counter component
function AnimatedCounter({ 
  target, 
  suffix = "", 
  prefix = "",
  duration = 2000 
}: { 
  target: number
  suffix?: string
  prefix?: string
  duration?: number
}) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return

    let startTime: number
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(progress * target))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [isInView, target, duration])

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  )
}

// Stat card component
function StatCard({ 
  value, 
  label, 
  context, 
  sourceName, 
  sourceUrl 
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
        <div className="text-3xl md:text-4xl font-bold text-[#9F7AEA] mb-2">{value}</div>
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
  tagColor = "bg-[#9F7AEA]"
}: {
  title: string
  tag: string
  includes: string[]
  promise: string
  tagColor?: string
}) {
  return (
    <Card className="bg-white border-2 border-border/50 hover:border-[#9F7AEA]/30 transition-all h-full">
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
          <p className="text-sm font-medium text-[#9F7AEA] italic">"{promise}"</p>
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
      sourceUrl: "https://www.bda.org/news-centre/latest-news-articles/13-million-unable-to-access-nhs-dentistry/"
    },
    {
      value: "5.6m",
      label: "Failed to get an NHS appointment",
      context: "Tried but couldn't secure dental care",
      sourceName: "BDA",
      sourceUrl: "https://www.bda.org/news-centre/latest-news-articles/13-million-unable-to-access-nhs-dentistry/"
    },
    {
      value: "69%",
      label: "Paid privately when NHS failed",
      context: "Of those unable to access NHS care",
      sourceName: "Ipsos",
      sourceUrl: "https://www.ipsos.com/en-uk/one-four-britons-unable-get-nhs-dental-appointment-treated-themselves"
    },
    {
      value: "26%",
      label: "Treated themselves",
      context: "Resorted to unsafe self-treatment",
      sourceName: "Ipsos",
      sourceUrl: "https://www.ipsos.com/en-uk/one-four-britons-unable-get-nhs-dental-appointment-treated-themselves"
    },
    {
      value: "1 in 10",
      label: "Adults reported dental pain",
      context: "Living with untreated dental problems",
      sourceName: "Adult Oral Health Survey",
      sourceUrl: "https://www.gov.uk/government/statistics/adult-oral-health-survey-2021"
    }
  ]

  const notIncluded = [
    "Cosmetic procedures",
    "Orthodontics",
    "Implants, crowns, or veneers",
    "Multi-visit treatment plans",
    "Complex endodontics or surgical work"
  ]

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Background gradient */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            background: "linear-gradient(180deg, #F7F9F8 0%, #FEFEFE 50%, #F9F7FC 100%)"
          }}
        />
        <div 
          className="absolute inset-0 z-0 opacity-40"
          style={{
            background: "linear-gradient(135deg, var(--iridescent-pink) 0%, var(--iridescent-lavender) 50%, var(--iridescent-teal) 100%)"
          }}
        />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Hero chips */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <Badge variant="secondary" className="bg-white/80 text-foreground">
                <Stethoscope className="w-3 h-3 mr-1" />
                Emergency relief first
              </Badge>
              <Badge variant="secondary" className="bg-white/80 text-foreground">
                <Clock className="w-3 h-3 mr-1" />
                One-visit, clear scope
              </Badge>
              <Badge variant="secondary" className="bg-white/80 text-foreground">
                <TrendingUp className="w-3 h-3 mr-1" />
                Tracked impact
              </Badge>
            </div>
            
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 text-balance">
              Dental care shouldn't depend on luck.
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto text-pretty">
              Across the UK, people are stuck without NHS appointments or can't afford private care when they're in pain. The Pearlie Care Fund unlocks real appointments at trusted partner clinics — with clear limits, full transparency, and local impact.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-[#9F7AEA] hover:bg-[#805AD5] text-white px-8 py-6 h-auto rounded-full text-lg"
                asChild
              >
                <Link href="/intake">
                  Check if you qualify
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-[#9F7AEA] text-[#9F7AEA] hover:bg-[#9F7AEA]/10 px-8 py-6 h-auto rounded-full text-lg bg-transparent"
                asChild
              >
                <Link href="/for-clinics">
                  Clinics: Become a Care Partner
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* The Scale of the Problem */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">The Problem</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                The scale of the UK dental crisis
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Millions of people across England are struggling to access basic dental care. These aren't just statistics — they're your neighbours, colleagues, and family members.
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

            {/* Charts Section */}
            <div className="mt-16 grid md:grid-cols-2 gap-8">
              {/* Chart 1: What people do */}
              <Card className="bg-[#F9F7FC] border-0">
                <CardHeader>
                  <CardTitle className="text-lg">What people do when they can't get NHS dental care</CardTitle>
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
                          className="h-full bg-[#9F7AEA] rounded-full"
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
                          className="h-full bg-[#ED64A6] rounded-full"
                          initial={{ width: 0 }}
                          whileInView={{ width: "26%" }}
                          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                          viewport={{ once: true }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    When access fails, people either pay privately or resort to unsafe self-treatment.
                  </p>
                </CardContent>
              </Card>

              {/* Chart 2: Unmet need */}
              <Card className="bg-[#F9F7FC] border-0">
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
                          className="h-full bg-[#9F7AEA] rounded-full"
                          initial={{ width: 0 }}
                          whileInView={{ width: "100%" }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          viewport={{ once: true }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Tried & failed to get appointment</span>
                        <span className="font-semibold">5.6m</span>
                      </div>
                      <div className="h-8 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-[#667EEA] rounded-full"
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
                          className="h-full bg-[#ED64A6] rounded-full"
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
          </div>
        </div>
      </section>

      {/* What the Care Fund Covers */}
      <section className="py-16 md:py-24 bg-[#F9F7FC]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4 bg-white">The Solution</Badge>
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
                  "Advice + prescriptions when clinically indicated"
                ]}
                promise="Relief and stabilisation — not a full treatment plan."
                tagColor="bg-[#9F7AEA]"
              />
              
              <CareTierCard
                tag="Optional (Capped)"
                title="Essential Treatment Appointment"
                includes={[
                  "One simple permanent filling",
                  "OR one non-surgical extraction",
                  "OR re-cement crown/bridge",
                  "OR targeted gum treatment if pain-linked",
                  "One visit only"
                ]}
                promise="One visit. One problem. Clinician-led."
                tagColor="bg-[#667EEA]"
              />
              
              <CareTierCard
                tag="Limited Availability"
                title="Preventive Access"
                includes={[
                  "Check-up",
                  "Hygiene appointment",
                  "Only when clinics allocate preventive Care Fund slots",
                  "Not available by default"
                ]}
                promise="Prevention for those who need it most."
                tagColor="bg-[#48BB78]"
              />
            </div>

            {/* What's NOT included */}
            <Card className="bg-white border-border/50 max-w-2xl mx-auto">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-muted-foreground" />
                  What's not included
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
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">How It Works</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Real care, delivered locally
              </h2>
              <p className="text-lg text-muted-foreground">
                No cash donations. Real appointments at real clinics.
              </p>
            </div>

            {/* Steps */}
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Bookings happen on Pearlie",
                  description: "Patients book appointments through our platform with trusted partner clinics.",
                  icon: Calendar
                },
                {
                  step: "2",
                  title: "A Care Fund appointment is unlocked",
                  description: "A portion of each booking goes toward funding emergency dental care.",
                  icon: Heart
                },
                {
                  step: "3",
                  title: "A patient in need is matched",
                  description: "Someone who qualifies receives care at a local Care Partner clinic.",
                  icon: Users
                }
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[#9F7AEA]/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-8 h-8 text-[#9F7AEA]" />
                  </div>
                  <div className="text-sm text-[#9F7AEA] font-semibold mb-2">Step {item.step}</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  {i < 2 && (
                    <ChevronRight className="w-6 h-6 text-gray-300 mx-auto mt-4 hidden md:block rotate-0 md:absolute md:right-0 md:top-1/2" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Live Impact Section */}
      <section className="py-16 md:py-24 bg-[#F9F7FC]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4 bg-white">Our Impact</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Measurable, transparent impact
              </h2>
            </div>

            {/* Counters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              {[
                { value: 127, label: "Appointments funded", suffix: "" },
                { value: 23, label: "Care Partner clinics", suffix: "" },
                { value: 12, label: "Cities covered", suffix: "" },
                { value: 48, label: "Avg hours to appointment", suffix: "h" }
              ].map((item, i) => (
                <Card key={i} className="bg-white border-0 shadow-sm text-center">
                  <CardContent className="py-6">
                    <div className="text-3xl md:text-4xl font-bold text-[#9F7AEA]">
                      <AnimatedCounter target={item.value} suffix={item.suffix} />
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{item.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Last updated: February 2026 · <Link href="#" className="underline hover:text-foreground">See our transparency policy</Link>
            </p>
          </div>
        </div>
      </section>

      {/* For Clinics: Become a Care Partner */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge variant="secondary" className="mb-4">For Clinics</Badge>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Become a Pearlie Care Partner
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Join a network of trusted clinics making a real difference in your community. Not charity — a commitment to accessible care with full clinical autonomy.
                </p>

                <ul className="space-y-4 mb-8">
                  {[
                    "Support local patients in genuine need",
                    "Pearlie handles all coordination and eligibility",
                    "Visible Care Partner badge on your profile",
                    "Priority placement and boosted patient trust",
                    "Full clinical decision-making control"
                  ].map((benefit, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#9F7AEA] mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  size="lg" 
                  className="bg-[#9F7AEA] hover:bg-[#805AD5] text-white px-8 rounded-full"
                  asChild
                >
                  <Link href="/for-clinics">
                    Become a Care Partner
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
              </div>

              {/* Care Partner Badge Preview */}
              <div className="bg-[#F9F7FC] rounded-2xl p-8">
                <Card className="bg-white shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">Example Dental Practice</h3>
                          <Badge className="bg-[#9F7AEA] text-white text-xs">
                            <Heart className="w-3 h-3 mr-1 fill-white" />
                            Care Partner
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">London, UK</p>
                        <p className="text-xs text-muted-foreground bg-[#F9F7FC] rounded-lg p-3 mt-3">
                          <Shield className="w-4 h-4 text-[#9F7AEA] inline mr-1" />
                          This clinic allocates limited Care Fund appointments for essential dental care for patients in need.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Patient Qualification CTA */}
      <section className="py-16 md:py-24 bg-[#9F7AEA]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Need emergency dental care?
            </h2>
            <p className="text-lg text-white/80 mb-8">
              The Pearlie Care Fund helps people who are struggling to access dental care. Check if you might qualify.
            </p>
            
            <Button 
              size="lg" 
              className="bg-white text-[#9F7AEA] hover:bg-gray-100 px-8 py-6 h-auto rounded-full text-lg"
              asChild
            >
              <Link href="/intake">
                Check if you qualify
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            
            <p className="text-sm text-white/60 mt-6">
              Eligibility is reviewed to make sure appointments reach those most in need. Availability varies by location.
            </p>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-8 bg-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p><strong>Important:</strong> The Pearlie Care Fund does not replace NHS dentistry.</p>
                <p>Appointments are limited and subject to availability. Care is clinician-led and may not include ongoing treatment.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-white border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-[#E8E4F0] p-1.5">
                <Heart className="w-4 h-4 text-foreground fill-foreground" />
              </div>
              <span className="font-semibold text-foreground">Pearlie</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Pearlie. Making dental care accessible.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
