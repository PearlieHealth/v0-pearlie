import type { Metadata } from "next"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "For Dental Clinics",
  description: "Join Pearlie to receive matched patients looking for your dental services. Priority placement, quality leads, and zero upfront cost.",
}
import { Card } from "@/components/ui/card"
import { ArrowRight, Heart, CheckCircle2, X, Star, TrendingUp, Users, Eye } from "lucide-react"
import Link from "next/link"
import { MainNav } from "@/components/main-nav"
import { ClinicWaitlistForm } from "@/components/clinic-waitlist-form"

export default function ForClinicsPage() {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />

      {/* HERO SECTION */}
      <section className="py-24 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            {/* Trust microline */}
            <p className="text-sm font-medium text-muted-foreground mb-8">
              Built with dentists. Designed for real consultations.
            </p>

            {/* Headline - max 10 words, strong, decisive */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground mb-6 leading-[1.1]">
              <span className="block">Better-fit patients.</span>
              <span className="block">Higher conversion.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
              Pearlie matches patients by intent, expectations, and readiness — not just location.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-base px-8 h-13 bg-primary hover:bg-[var(--primary-hover)]" asChild>
                <a href="#early-access">
                  Apply for early clinic access
                  <ArrowRight className="ml-2 w-5 h-5" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8 h-13 border-border text-foreground hover:bg-secondary bg-transparent"
                asChild
              >
                <Link href="/clinic/login">
                  Log in to Clinic Portal
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">Limited to the first 20–30 clinics</p>
          </div>
        </div>
      </section>

      {/* WHAT PEARLIE DOES - CLARITY BLOCK */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-10 text-center">
              What Pearlie actually does
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-4 p-5 rounded-lg bg-secondary/50">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-foreground">
                  Collects patient priorities, concerns, budget signals, and readiness before booking
                </span>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-lg bg-secondary/50">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-foreground">Matches patients to clinics based on clinical fit and expectations</span>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-lg bg-secondary/50">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-foreground">Shows clinics why a patient is a match — before they arrive</span>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-lg bg-secondary/50">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-foreground">Reduces dead-end consultations and price-shopping behaviour</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-4 text-center">
              Why the first clinics win
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Early adopters gain advantages that won't be available later
            </p>
            <div className="grid sm:grid-cols-2 gap-6">
              <Card className="p-6 border-border bg-white">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Star className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Founding clinic status</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Early clinics are recognised internally as founding partners, influencing platform direction and
                      long-term positioning.
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-6 border-border bg-white">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Data advantage before competitors</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Access patient intent, objections, and demand trends before these insights are widely available.
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-6 border-border bg-white">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Higher-quality enquiries from day one</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Patients arrive with clarified priorities, budgets, and expectations — not just price shoppers.
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-6 border-border bg-white">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Eye className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Shape how patients are matched to you</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Your feedback directly impacts how matching logic evolves and how your clinic is represented.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE - Most important section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-12 text-center">
              With Pearlie vs Without Pearlie
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Without Pearlie */}
              <Card className="p-8 border-border bg-white">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                    <X className="w-5 h-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-muted-foreground">Without Pearlie</h3>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-300 mt-2 flex-shrink-0"></span>
                    <span>Unclear motivations, cost-focused questions</span>
                  </li>
                  <li className="flex items-start gap-3 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-300 mt-2 flex-shrink-0"></span>
                    <span>Consultation spent managing anxiety, uncertainty, and price</span>
                  </li>
                  <li className="flex items-start gap-3 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-300 mt-2 flex-shrink-0"></span>
                    <span>High drop-off after consultation</span>
                  </li>
                  <li className="flex items-start gap-3 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-300 mt-2 flex-shrink-0"></span>
                    <span>Paid ads, directories, race-to-the-bottom pricing</span>
                  </li>
                </ul>
              </Card>

              {/* With Pearlie */}
              <Card className="p-8 border-2 border-primary bg-white">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">With Pearlie</h3>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0"></span>
                    <span>Clear treatment goals and expectations upfront</span>
                  </li>
                  <li className="flex items-start gap-3 text-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0"></span>
                    <span>Consultation focused on clinical discussion and planning</span>
                  </li>
                  <li className="flex items-start gap-3 text-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0"></span>
                    <span>Higher likelihood of treatment acceptance</span>
                  </li>
                  <li className="flex items-start gap-3 text-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0"></span>
                    <span>Patient-led matching based on values and fit</span>
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* EARLY ACCESS OFFER - Enhanced with Form */}
      <section id="early-access" className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4 text-center">Early clinic access</h2>
            <p className="text-white/70 text-center mb-12 max-w-2xl mx-auto">
              Be part of the first clinics shaping the future of patient-led dentistry
            </p>
            <div className="grid sm:grid-cols-2 gap-6 mb-12">
              <div className="flex items-start gap-4 p-5 rounded-lg bg-white/10">
                <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                <span className="text-white/90">Free for early partner clinics (founding cohort)</span>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-lg bg-white/10">
                <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                <span className="text-white/90">Limited onboarding cohort (first 20–30 clinics only)</span>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-lg bg-white/10">
                <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                <span className="text-white/90">Direct influence on feature development and roadmap</span>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-lg bg-white/10">
                <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                <span className="text-white/90">Priority positioning in patient matches as the platform grows</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clinic Waitlist Form Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <ClinicWaitlistForm />
          </div>
        </div>
      </section>

      {/* FINAL CTA - Updated */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-4">
              This is how modern clinics grow.
            </h2>
            <p className="text-lg text-muted-foreground mb-10">Not more leads. Better decisions.</p>
            <Button size="lg" className="text-base px-10 h-14 bg-primary hover:bg-[var(--primary-hover)]" asChild>
              <a href="mailto:hello@pearlie.org">
                Apply for early clinic access
                <ArrowRight className="ml-2 w-5 h-5" />
              </a>
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">Limited to the first 20–30 clinics</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="rounded-full bg-primary p-2">
                  <Heart className="w-4 h-4 text-white fill-white" />
                </div>
                <span className="text-lg font-semibold text-foreground">Pearlie</span>
              </Link>
              <div className="flex items-center gap-8 text-sm text-muted-foreground">
                <Link href="/" className="hover:text-foreground transition-colors">
                  For Patients
                </Link>
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  Privacy
                </Link>
                <a href="mailto:hello@pearlie.org" className="hover:text-foreground transition-colors">
                  hello@pearlie.org
                </a>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} Pearlie. Built for better patient decisions.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
