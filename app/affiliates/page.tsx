"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  Heart,
  ArrowRight,
  Link2,
  BarChart3,
  Banknote,
  Clock,
  Shield,
  Users,
  Zap,
  Globe,
  ChevronDown,
  Check,
  Sparkles,
  LayoutDashboard,
} from "lucide-react"

// ─── Affiliate signup form ───
function AffiliateSignupForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    tiktok_handle: "",
    instagram_handle: "",
    youtube_handle: "",
    motivation: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/affiliates/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Something went wrong")
        return
      }
      setSubmitted(true)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-16"
      >
        <div className="w-16 h-16 rounded-full bg-[#00F5A0]/20 flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-[#00F5A0]" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">Application submitted!</h3>
        <p className="text-[#8B8BA3] max-w-md mx-auto">
          Thanks for applying! We&apos;ll review your application and get back to you within 48 hours.
        </p>
      </motion.div>
    )
  }

  const inputClass =
    "w-full bg-[#1C1C2E] border border-white/[0.08] rounded-[14px] px-4 py-3.5 text-white placeholder:text-[#6B6B80] focus:outline-none focus:border-[#FE2C55]/40 focus:ring-1 focus:ring-[#FE2C55]/20 transition-all"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[#8B8BA3] mb-1.5">Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Your full name"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm text-[#8B8BA3] mb-1.5">Email *</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm text-[#8B8BA3] mb-1.5">Phone (optional)</label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+44 7..."
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-[#8B8BA3] mb-1.5">TikTok</label>
          <input
            type="text"
            value={form.tiktok_handle}
            onChange={(e) => setForm({ ...form, tiktok_handle: e.target.value })}
            placeholder="@handle"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm text-[#8B8BA3] mb-1.5">Instagram</label>
          <input
            type="text"
            value={form.instagram_handle}
            onChange={(e) => setForm({ ...form, instagram_handle: e.target.value })}
            placeholder="@handle"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm text-[#8B8BA3] mb-1.5">YouTube</label>
          <input
            type="text"
            value={form.youtube_handle}
            onChange={(e) => setForm({ ...form, youtube_handle: e.target.value })}
            placeholder="Channel name"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm text-[#8B8BA3] mb-1.5">
          Why do you want to promote Pearlie? (optional)
        </label>
        <textarea
          value={form.motivation}
          onChange={(e) => setForm({ ...form, motivation: e.target.value })}
          placeholder="Tell us a bit about your audience and how you'd promote Pearlie..."
          rows={3}
          className={inputClass + " resize-none"}
        />
      </div>
      {error && <p className="text-[#FE2C55] text-sm">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-4 rounded-[14px] font-bold text-white text-base transition-all duration-300 disabled:opacity-50"
        style={{
          background: "linear-gradient(135deg, #FE2C55 0%, #25F4EE 100%)",
          boxShadow: "0 0 20px rgba(254,44,85,0.3)",
        }}
      >
        {submitting ? "Submitting..." : "Apply Now"}
      </button>
    </form>
  )
}

// ─── Earnings calculator ───
function EarningsCalculator() {
  const [patients, setPatients] = useState(20)
  const commissionPerBooking = 25
  const earnings = patients * commissionPerBooking

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-[20px] backdrop-blur-[20px] p-8 max-w-lg mx-auto">
      {/* Gradient accent line */}
      <div
        className="h-[3px] rounded-full mb-6 -mt-8 mx-[-32px] mt-[-32px] rounded-t-[20px]"
        style={{ background: "linear-gradient(135deg, #00F5A0 0%, #00D9F5 100%)", margin: "-32px -32px 24px -32px", borderRadius: "20px 20px 0 0" }}
      />
      <label className="block text-[#8B8BA3] text-sm mb-3">
        Patients you send per month
      </label>
      <input
        type="range"
        min={1}
        max={100}
        value={patients}
        onChange={(e) => setPatients(parseInt(e.target.value))}
        className="w-full mb-2 accent-[#FE2C55]"
      />
      <div className="flex justify-between text-sm text-[#6B6B80] mb-6">
        <span>1</span>
        <span className="text-white font-bold">{patients}</span>
        <span>100</span>
      </div>
      <div className="text-center">
        <p className="text-[#8B8BA3] text-sm mb-1">
          At £{commissionPerBooking} per booking
        </p>
        <p
          className="text-5xl font-extrabold"
          style={{ color: "#00F5A0" }}
        >
          £{earnings.toLocaleString()}
        </p>
        <p className="text-[#8B8BA3] text-sm mt-1">per month</p>
      </div>
    </div>
  )
}

// ─── FAQ accordion ───
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className={`border-b border-white/[0.06] transition-all ${open ? "border-b-[#FE2C55]/20" : ""}`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-white font-medium pr-4">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-[#8B8BA3] transition-transform duration-300 flex-shrink-0 ${
            open ? "rotate-180 text-[#FE2C55]" : ""
          }`}
        />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <p className="text-[#8B8BA3] pb-5 leading-relaxed">{answer}</p>
      </motion.div>
    </div>
  )
}

const faqs = [
  {
    question: "How much do I earn per referral?",
    answer:
      "You earn a fixed commission for every confirmed booking that comes from your referral link. Commission rates are set when your application is approved — typically £25 per confirmed booking.",
  },
  {
    question: "When do I get paid?",
    answer:
      "Payouts are processed monthly. Once a booking is confirmed by the clinic and verified, your earnings are locked in. Payments are sent via bank transfer by the 15th of the following month.",
  },
  {
    question: "How do I track my referrals?",
    answer:
      "You get access to a real-time affiliate dashboard where you can see clicks, conversions, earnings, and payout history. You can also build custom links with UTM parameters to track specific campaigns.",
  },
  {
    question: "How long does the cookie last?",
    answer:
      "We use a 30-day cookie window. If someone clicks your link today and books within 30 days, you get the commission — even if they don't book immediately.",
  },
  {
    question: "Is there a cost to join?",
    answer:
      "No. The programme is completely free. There are no upfront costs, no monthly fees, and no commitments.",
  },
  {
    question: "Who can become an affiliate?",
    answer:
      "Content creators, influencers, dental professionals, health & wellness bloggers, and anyone with an audience interested in dental care. We review every application to ensure quality.",
  },
]

// ─── Main page ───
export default function AffiliatesPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0F]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="rounded-full bg-[#0D9B8A] p-1.5">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#0D9B8A]">Pearlie</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/affiliate/dashboard"
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-[14px] text-sm font-semibold text-white bg-white/[0.05] border border-white/10 backdrop-blur-[10px] hover:bg-white/[0.1] hover:border-white/20 transition-all duration-300"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Demo Dashboard
            </Link>
            <a
              href="#apply"
              className="px-5 py-2 rounded-[14px] text-sm font-bold text-white transition-all duration-300 hover:scale-[1.03]"
              style={{
                background: "linear-gradient(135deg, #FE2C55 0%, #25F4EE 100%)",
                boxShadow: "0 0 20px rgba(254,44,85,0.3)",
              }}
            >
              Apply Now
            </a>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(254,44,85,0.15) 0%, rgba(37,244,238,0.05) 50%, transparent 70%)",
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-sm mb-8"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#25F4EE]" />
              <span className="text-sm text-[#8B8BA3]">Pearlie Affiliate Programme</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-[clamp(2.2rem,7vw,4.5rem)] font-extrabold leading-[0.95] tracking-[-0.02em] mb-6"
            >
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #FE2C55 0%, #25F4EE 100%)" }}
              >
                Earn
              </span>{" "}
              by helping patients find the right dentist
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-[#8B8BA3] max-w-xl mx-auto mb-10"
            >
              Share your unique link, refer patients to Pearlie, and get paid for every confirmed booking. No upfront cost.
            </motion.p>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <a
                href="#apply"
                className="px-8 py-4 rounded-[14px] font-bold text-white text-base transition-all duration-300 hover:scale-[1.03]"
                style={{
                  background: "linear-gradient(135deg, #FE2C55 0%, #25F4EE 100%)",
                  boxShadow: "0 0 20px rgba(254,44,85,0.3)",
                }}
              >
                Get Started <ArrowRight className="inline w-4 h-4 ml-1" />
              </a>
              <a
                href="#how-it-works"
                className="px-8 py-4 rounded-[14px] font-semibold text-white text-base bg-white/[0.05] border border-white/10 backdrop-blur-[10px] hover:bg-white/[0.1] hover:border-white/20 transition-all duration-300"
              >
                Learn More
              </a>
              <Link
                href="/affiliate/dashboard"
                className="flex items-center gap-2 px-8 py-4 rounded-[14px] font-semibold text-[#25F4EE] text-base hover:text-white transition-all duration-300"
              >
                <LayoutDashboard className="w-4 h-4" />
                Preview Dashboard
              </Link>
            </motion.div>

            {/* Feature pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap justify-center gap-3 mt-12"
            >
              {[
                { icon: Banknote, text: "Commission per booking" },
                { icon: Clock, text: "30-day cookie" },
                { icon: BarChart3, text: "Real-time dashboard" },
                { icon: Banknote, text: "Monthly payouts" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-sm text-[#8B8BA3]"
                >
                  <item.icon className="w-3.5 h-3.5 text-[#25F4EE]" />
                  {item.text}
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-20 md:py-28 bg-[#141420]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-[2.75rem] font-bold text-center mb-16 tracking-[-0.02em]">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "01",
                title: "Apply",
                desc: "Fill out a quick form. We review and approve applications within 48 hours.",
                icon: Users,
              },
              {
                step: "02",
                title: "Share",
                desc: "Get your unique referral link. Share it on TikTok, Instagram, YouTube, your blog — anywhere.",
                icon: Link2,
              },
              {
                step: "03",
                title: "Earn",
                desc: "When someone books through your link and the clinic confirms, you get paid. Simple.",
                icon: Banknote,
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-[20px] backdrop-blur-[20px] p-7 relative group hover:border-white/[0.12] transition-all duration-300"
              >
                <span
                  className="text-5xl font-extrabold bg-clip-text text-transparent mb-4 block"
                  style={{ backgroundImage: "linear-gradient(135deg, #FE2C55 0%, #25F4EE 100%)" }}
                >
                  {item.step}
                </span>
                <item.icon className="w-6 h-6 text-[#25F4EE] mb-3" />
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-[#8B8BA3] text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Earnings Calculator ─── */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-[-0.02em] mb-4">
              See your potential{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #00F5A0 0%, #00D9F5 100%)" }}
              >
                earnings
              </span>
            </h2>
            <p className="text-[#8B8BA3] text-lg max-w-md mx-auto">
              Drag the slider to see how much you could earn each month.
            </p>
          </div>
          <EarningsCalculator />
        </div>
      </section>

      {/* ─── Why Pearlie ─── */}
      <section className="py-20 md:py-28 bg-[#141420]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-[2.75rem] font-bold text-center mb-16 tracking-[-0.02em]">
            Why Pearlie?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Banknote,
                title: "No upfront cost",
                desc: "Free to join, no commitments. You only earn — never pay.",
              },
              {
                icon: Clock,
                title: "30-day cookie window",
                desc: "Your referral is tracked for 30 days. If they book within that window, you get credited.",
              },
              {
                icon: BarChart3,
                title: "Real-time tracking",
                desc: "See every click, conversion, and earning in your live dashboard.",
              },
              {
                icon: Shield,
                title: "Dedicated support",
                desc: "Our team is here to help you succeed — from setup to optimization.",
              },
              {
                icon: Banknote,
                title: "Monthly payouts",
                desc: "Reliable monthly payments via bank transfer. No minimum threshold.",
              },
              {
                icon: Globe,
                title: "Works on any platform",
                desc: "TikTok, Instagram, YouTube, blogs, newsletters — share anywhere.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-[20px] backdrop-blur-[20px] p-7 hover:border-white/[0.12] transition-all duration-300"
              >
                <item.icon className="w-6 h-6 text-[#25F4EE] mb-4" />
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-[#8B8BA3] text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-[2.75rem] font-bold text-center mb-12 tracking-[-0.02em]">
            Frequently asked questions
          </h2>
          <div>
            {faqs.map((faq, i) => (
              <FAQItem key={i} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Apply Form ─── */}
      <section id="apply" className="py-20 md:py-28 bg-[#141420] relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 100%, rgba(254,44,85,0.1) 0%, rgba(37,244,238,0.03) 50%, transparent 70%)",
          }}
        />
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-[-0.02em] mb-4">
              Ready to start{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #00F5A0 0%, #00D9F5 100%)" }}
              >
                earning
              </span>
              ?
            </h2>
            <p className="text-[#8B8BA3]">Free to join. No commitments.</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-[20px] backdrop-blur-[20px] p-8">
            <AffiliateSignupForm />
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-20 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(254,44,85,0.12) 0%, rgba(37,244,238,0.04) 50%, transparent 70%)",
          }}
        />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <p className="text-[#8B8BA3] text-sm mb-8">
            Pearlie Affiliate Programme — Helping creators earn while helping patients find the right dentist.
          </p>
          <div className="flex items-center justify-center gap-2 text-[#6B6B80] text-sm">
            <Heart className="w-4 h-4 text-[#0D9B8A] fill-[#0D9B8A]" />
            <span>&copy; {new Date().getFullYear()} Pearlie. All rights reserved.</span>
          </div>
        </div>
      </section>
    </div>
  )
}
