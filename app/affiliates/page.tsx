import type { Metadata } from "next"
import { AffiliateHero } from "@/components/affiliates/affiliate-hero"
import { HowItWorks } from "@/components/affiliates/how-it-works"
import { WhyPearlie } from "@/components/affiliates/why-pearlie"
import { EarningsExample } from "@/components/affiliates/earnings-example"
import { AffiliateFaq } from "@/components/affiliates/affiliate-faq"
import { AffiliateSignupForm } from "@/components/affiliates/affiliate-signup-form"
import { SiteFooter } from "@/components/site-footer"

export const metadata: Metadata = {
  title: "Become a Pearlie Affiliate — Earn by Referring Patients",
  description:
    "Join the Pearlie affiliate program. Earn commission for every patient you refer who books a dental appointment. Perfect for TikTok creators, influencers, and health bloggers.",
}

export default function AffiliatePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFF8F0" }}>
      <AffiliateHero />
      <HowItWorks />
      <WhyPearlie />
      <EarningsExample />
      <AffiliateFaq />
      <div id="apply">
        <AffiliateSignupForm />
      </div>
      <SiteFooter />
    </div>
  )
}
