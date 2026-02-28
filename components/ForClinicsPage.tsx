"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Check,
  X,
  Menu,
  ChevronDown,
  Zap,
  FileText,
  Brain,
  PoundSterling,
  Clock,
  Heart,
  MapPin,
  AlertCircle,
  Star,
  Calendar,
  Stethoscope,
  TrendingUp,
  Shield,
  Lock,
  Server,
  Quote,
  Users,
} from "lucide-react"

/* ────────────────────────────────────────────
   TYPES & HELPERS
──────────────────────────────────────────── */
interface FaqItemProps { question: string; answer: string }

function MiniBar({ label, pct, highlight }: { label: string; pct: number; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: highlight ? "#1f2937" : "#6b7280", fontWeight: highlight ? 600 : 400, width: 100, flexShrink: 0, textAlign: "right" }}>{label}</span>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "#d1d5db", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: highlight ? "linear-gradient(90deg, #059669, #10b981)" : "#d1d5db", transition: "width .3s" }} />
      </div>
    </div>
  )
}

function Tag({ label, active }: { label: string; active?: boolean }) {
  return (
    <span style={{ display: "inline-block", padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: active ? 600 : 400, background: active ? "rgba(5,150,105,.08)" : "#f9fafb", color: active ? "#059669" : "#6b7280", border: `1px solid ${active ? "rgba(5,150,105,.2)" : "#d1d5db"}`, lineHeight: 1.3 }}>
      {label}
    </span>
  )
}

function VisualInsightCard({ icon, title, question, children }: { icon: React.ReactNode; title: string; question: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 16, padding: "24px 22px 20px", display: "flex", flexDirection: "column", boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(5,150,105,.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669", flexShrink: 0 }}>{icon}</div>
        <span style={{ fontWeight: 700, color: "#1f2937", fontSize: 14 }}>{title}</span>
      </div>
      <div style={{ flex: 1, marginBottom: 12 }}>{children}</div>
      <p style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.4, marginTop: "auto" }}>
        From questionnaire: <span style={{ color: "#6b7280" }}>{question}</span>
      </p>
    </div>
  )
}

function FaqItem({ question, answer }: FaqItemProps) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: "1px solid #d1d5db", padding: "22px 0" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", color: "#1f2937", fontWeight: 600, fontSize: 16, textAlign: "left", padding: 0, fontFamily: "inherit" }}>
        {question}
        <ChevronDown size={18} style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform .2s", color: "#6b7280", flexShrink: 0, marginLeft: 16 }} />
      </button>
      {open && <p style={{ color: "#6b7280", fontSize: 15, lineHeight: 1.7, marginTop: 12 }}>{answer}</p>}
    </div>
  )
}

/* ────────────────────────────────────────────
   CONSTANTS
──────────────────────────────────────────── */
const EXTRA_BOOKING_PRICE = 35
const DEFAULT_LTV = 1000
const DEFAULT_PATIENTS = 5

const PLAN_DATA = {
  starter:  { label: "Starter",  price: 99,  included: 2 },
  standard: { label: "Standard", price: 247, included: 4 },
  premium:  { label: "Premium",  price: 486, included: 8 },
} as const

/* ────────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────────── */
export default function ForClinicsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [roiPatients, setRoiPatients] = useState(DEFAULT_PATIENTS)
  const [roiLtv, setRoiLtv] = useState(DEFAULT_LTV)

  const roiResult = useCallback(() => {
    const ltv = roiLtv
    let totalCost: number
    let planLabel: string
    if (roiPatients === 0) {
      totalCost = 0
      planLabel = "No subscription"
    } else if (roiPatients === 1) {
      totalCost = 49
      planLabel = "1 patient"
    } else if (roiPatients === 2) {
      totalCost = 99
      planLabel = "Starter"
    } else if (roiPatients <= PLAN_DATA.starter.included) {
      totalCost = PLAN_DATA.starter.price
      planLabel = "Starter"
    } else if (roiPatients <= PLAN_DATA.standard.included) {
      totalCost = PLAN_DATA.standard.price + (roiPatients - PLAN_DATA.standard.included) * EXTRA_BOOKING_PRICE
      planLabel = "Standard"
    } else if (roiPatients <= PLAN_DATA.premium.included) {
      totalCost = PLAN_DATA.premium.price + (roiPatients - PLAN_DATA.premium.included) * EXTRA_BOOKING_PRICE
      planLabel = "Premium"
    } else {
      totalCost = PLAN_DATA.premium.price + (roiPatients - PLAN_DATA.premium.included) * EXTRA_BOOKING_PRICE
      planLabel = "Premium"
    }
    const revenue = roiPatients * ltv
    const net = revenue - totalCost
    const roiPct = totalCost > 0 ? Math.round(((revenue - totalCost) / totalCost) * 100) : 0
    return { totalCost, revenue, net, roiPct, planLabel }
  }, [roiPatients, roiLtv])

  /* ── Color tokens ── */
  const teal = "#059669"
  const tealLight = "#10b981"
  const navy = "#ffffff"
  const cardBg = "#ffffff"
  const cardBorder = "#d1d5db"
  const red = "#dc2626"
  const redLight = "#ef4444"

  /* ── Shared style tokens ── */
  const sec = { padding: "120px 24px" } as const
  const secAlt = { ...sec, background: "#f9fafb" } as const
  const maxW = { maxWidth: 1080, margin: "0 auto" } as const
  const heading = {
    fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
    fontWeight: 800,
    letterSpacing: "-0.025em",
    color: "#111827",
  } as const
  const greenBtn = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 16,
    border: "none",
    borderRadius: 12,
    padding: "16px 32px",
    cursor: "pointer",
    textDecoration: "none",
    transition: "opacity .15s",
    boxShadow: "0 0 20px rgba(5,150,105,.15), 0 4px 12px rgba(0,0,0,.08)",
  } as const
  const outlineBtn = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "#ffffff",
    color: "#1f2937",
    fontWeight: 600,
    fontSize: 15,
    border: "1px solid #d1d5db",
    borderRadius: 12,
    padding: "14px 28px",
    cursor: "pointer",
    textDecoration: "none",
    transition: "border-color .15s",
  } as const

  /* ── Section heading helpers ── */
  const sectionLabel = (text: string) => (
    <p style={{ color: teal, fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, textAlign: "center" }}>{text}</p>
  )
  const sectionH2 = (node: React.ReactNode) => (
    <h2 style={{ ...heading, fontSize: "clamp(28px, 4.2vw, 44px)", textAlign: "center", marginBottom: 16, lineHeight: 1.1 }}>{node}</h2>
  )
  const sectionSub = (text: string, width = 560) => (
    <p style={{ color: "#6b7280", fontSize: 17, textAlign: "center", maxWidth: width, margin: "0 auto 56px", lineHeight: 1.6 }}>{text}</p>
  )

  return (
    <div className="for-clinics" style={{ background: navy, color: "#1f2937", minHeight: "100vh", fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif", WebkitFontSmoothing: "antialiased" }}>
      {/* ── Mobile overrides ── */}
      <style>{`
        .fc-mobile-menu-btn { display: none !important; }
        .fc-mobile-dropdown { display: none !important; }
        @media (max-width: 640px) {
          .fc-nav-links { display: none !important; }
          .fc-mobile-menu-btn { display: flex !important; }
          .fc-mobile-dropdown[data-open="true"] {
            display: flex !important; flex-direction: column; position: absolute;
            top: 64px; left: 0; right: 0; background: rgba(255,255,255,.98);
            backdrop-filter: blur(16px); border-bottom: 1px solid #d1d5db;
            padding: 12px 24px 20px; gap: 0;
          }
          .fc-mobile-dropdown a { display: block; padding: 14px 0; color: #6b7280; text-decoration: none; font-size: 16px; font-weight: 500; border-bottom: 1px solid #d1d5db; }
          .fc-mobile-dropdown a:last-child { border-bottom: none; }
          .fc-hero { padding-top: 100px !important; padding-bottom: 48px !important; }
          .fc-section { padding-top: 64px !important; padding-bottom: 64px !important; padding-left: 16px !important; padding-right: 16px !important; }
          .fc-stats-bar { gap: 16px !important; padding: 20px 16px !important; }
          .fc-stats-bar > div { min-width: 0 !important; flex: 1 1 40% !important; }
          .fc-cta-btns { flex-direction: column !important; align-items: stretch !important; }
          .fc-cta-btns > a, .fc-cta-btns > button { width: 100% !important; justify-content: center !important; text-align: center !important; }
          .fc-table { min-width: 440px !important; font-size: 13px !important; }
          .fc-table th, .fc-table td { padding: 12px 10px !important; font-size: 12px !important; }
          .fc-steps-grid { grid-template-columns: 1fr !important; }
          .fc-insights-grid { grid-template-columns: 1fr !important; }
          .fc-pricing-grid { grid-template-columns: 1fr !important; }
          .fc-pricing-grid > div { padding: 32px 20px !important; }
          .fc-compare-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .fc-compare-table { min-width: 600px !important; }
          .fc-roi-output-grid { grid-template-columns: 1fr 1fr !important; }
          .fc-testimonials-grid { grid-template-columns: 1fr !important; }
          .fc-zero-risk-grid { grid-template-columns: 1fr !important; }
          .fc-roi-wrapper { padding: 24px 16px !important; }
          .fc-roi-results { grid-template-columns: 1fr !important; }
          .fc-visibility-grid { grid-template-columns: 1fr !important; }
          .fc-onboarding-grid { grid-template-columns: 1fr 1fr !important; }
          .fc-compare-strip { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* ══════════ 1. NAV ══════════ */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(255,255,255,.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid #d1d5db", boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
        <div style={{ ...maxW, display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, padding: "0 24px" }}>
          <Link href="/" style={{ textDecoration: "none" }}><span style={{ ...heading, fontSize: 22 }}>Pearlie</span></Link>
          <div className="fc-nav-links" style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {[{ href: "#how", label: "How it works" }, { href: "#insights", label: "Insights" }, { href: "#pricing", label: "Pricing" }, { href: "#faq", label: "FAQ" }].map((l) => (
              <a key={l.href} href={l.href} style={{ color: "#6b7280", textDecoration: "none", fontSize: 13, fontWeight: 500 }}>{l.label}</a>
            ))}
            <a href="#pricing" style={{ ...greenBtn, padding: "9px 20px", fontSize: 13, borderRadius: 10 }}>Get started</a>
          </div>
          <button className="fc-mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu" style={{ background: "none", border: "none", cursor: "pointer", color: "#1f2937", padding: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        <div className="fc-mobile-dropdown" data-open={mobileMenuOpen}>
          <a href="#how" onClick={() => setMobileMenuOpen(false)}>How it works</a>
          <a href="#insights" onClick={() => setMobileMenuOpen(false)}>Insights</a>
          <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
          <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
        </div>
      </nav>

      {/* ══════════ 2. HERO ══════════ */}
      <section className="fc-hero fc-section" style={{ ...sec, paddingTop: 160, paddingBottom: 100, textAlign: "center" }}>
        <div style={maxW}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(217,119,6,.06)", border: "1px solid rgba(217,119,6,.12)", borderRadius: 24, padding: "8px 20px", marginBottom: 28 }}>
            <span style={{ fontSize: 14 }}>&#9889;</span>
            <span style={{ color: "#d97706", fontSize: 13, fontWeight: 600 }}>Early-adopter pricing — limited spots in your area</span>
          </div>
          <h1 style={{ ...heading, fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1.05, letterSpacing: "-0.035em", marginBottom: 24 }}>
            Stop paying for clicks.
            <br /><span style={{ color: teal }}>Start receiving patients.</span>
          </h1>
          <p style={{ color: "#6b7280", fontSize: "clamp(17px, 2vw, 20px)", lineHeight: 1.6, maxWidth: 600, margin: "0 auto 44px" }}>
            Pearlie pre-qualifies patients — collecting their anxiety level, cost mindset, and treatment goals — then matches them to your clinic. You only see patients who are a genuine fit.
          </p>
          <div style={{ marginBottom: 64 }}>
            <a href="#pricing" style={greenBtn}>See pricing <ArrowRight size={18} /></a>
          </div>
          <div className="fc-stats-bar" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16, padding: "32px 24px", borderTop: `1px solid ${cardBorder}`, borderBottom: `1px solid ${cardBorder}` }}>
            {["No contracts", "No setup fee", "Cancel anytime"].map((item) => (
              <span key={item} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(5,150,105,.07)", border: "1px solid rgba(5,150,105,.2)", padding: "10px 22px", borderRadius: 24, color: "#047857", fontSize: 15, fontWeight: 700 }}>
                <Check size={16} /> {item}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24, marginTop: 20 }}>
            {[{ icon: <Shield size={13} />, label: "GDPR Compliant" }, { icon: <Lock size={13} />, label: "End-to-End Encrypted" }, { icon: <Server size={13} />, label: "UK Data Hosting" }].map((b) => (
              <div key={b.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#6b7280", fontSize: 11, fontWeight: 500 }}>
                <span style={{ color: "#3b82f6", display: "flex" }}>{b.icon}</span>{b.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ 3. HOW IT WORKS ══════════ */}
      <section id="how" className="fc-section" style={secAlt}>
        <div style={maxW}>
          {sectionLabel("How it works")}
          {sectionH2("Three steps. Zero wasted consultations.")}
          {sectionSub("Patients complete our intake, we match them to your clinic, and you receive a full profile — ready for a productive conversation.")}
          <div className="fc-steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {/* Step 01 */}
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "28px 24px", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `rgba(5,150,105,.1)`, display: "flex", alignItems: "center", justifyContent: "center", color: teal }}><FileText size={22} /></div>
                <span style={{ color: teal, fontWeight: 800, fontSize: 13, letterSpacing: "0.04em" }}>STEP 01</span>
              </div>
              <h3 style={{ fontWeight: 700, color: "#1f2937", fontSize: 18, marginBottom: 8 }}>Patient completes intake</h3>
              <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.55, marginBottom: 16 }}>Our questionnaire captures treatment needs, anxiety level, cost approach, concerns, values, and preferred timing.</p>
              <div style={{ background: "rgba(0,0,0,.04)", borderRadius: 12, padding: "16px 18px", flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(0,0,0,.06)", overflow: "hidden" }}>
                    <div style={{ width: "75%", height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${teal}, ${tealLight})` }} />
                  </div>
                  <span style={{ color: teal, fontSize: 11, fontWeight: 600 }}>6/8</span>
                </div>
                <p style={{ color: "#6b7280", fontSize: 11, marginBottom: 8, fontWeight: 500 }}>What matters most when choosing a clinic?</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[{ label: "Clear pricing before treatment", selected: true }, { label: "A calm, reassuring environment", selected: true }, { label: "Strong reputation and reviews", selected: false }].map((opt) => (
                    <div key={opt.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, background: opt.selected ? `rgba(5,150,105,.1)` : "rgba(0,0,0,.03)", border: `1px solid ${opt.selected ? "rgba(5,150,105,.25)" : "rgba(0,0,0,.06)"}` }}>
                      <div style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${opt.selected ? teal : "#6b7280"}`, background: opt.selected ? teal : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {opt.selected && <Check size={9} style={{ color: "#fff" }} />}
                      </div>
                      <span style={{ fontSize: 11, color: opt.selected ? "#1f2937" : "#6b7280" }}>{opt.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Step 02 */}
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "28px 24px", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `rgba(5,150,105,.1)`, display: "flex", alignItems: "center", justifyContent: "center", color: teal }}><Brain size={22} /></div>
                <span style={{ color: teal, fontWeight: 800, fontSize: 13, letterSpacing: "0.04em" }}>STEP 02</span>
              </div>
              <h3 style={{ fontWeight: 700, color: "#1f2937", fontSize: 18, marginBottom: 8 }}>Pearlie matches to your clinic</h3>
              <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.55, marginBottom: 16 }}>Our algorithm scores patients on clinical fit, treatment availability, cost alignment, and what they value most.</p>
              <div style={{ background: "rgba(0,0,0,.04)", borderRadius: 12, padding: "16px 18px", flex: 1 }}>
                <p style={{ color: "#6b7280", fontSize: 11, marginBottom: 12, fontWeight: 500 }}>Match score breakdown</p>
                {[{ label: "Treatment fit", score: 95, color: teal }, { label: "Cost alignment", score: 88, color: tealLight }, { label: "Location", score: 82, color: "#34d399" }, { label: "Clinic values match", score: 90, color: teal }].map((m) => (
                  <div key={m.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "#6b7280", fontSize: 11 }}>{m.label}</span>
                      <span style={{ color: m.color, fontSize: 11, fontWeight: 700 }}>{m.score}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "rgba(0,0,0,.06)", overflow: "hidden" }}>
                      <div style={{ width: `${m.score}%`, height: "100%", borderRadius: 3, background: m.color }} />
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${cardBorder}` }}>
                  <span style={{ color: "#1f2937", fontSize: 13, fontWeight: 600 }}>Overall match</span>
                  <span style={{ ...heading, fontSize: 22, color: teal }}>92%</span>
                </div>
              </div>
            </div>
            {/* Step 03 */}
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "28px 24px", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `rgba(5,150,105,.1)`, display: "flex", alignItems: "center", justifyContent: "center", color: teal }}><Zap size={22} /></div>
                <span style={{ color: teal, fontWeight: 800, fontSize: 13, letterSpacing: "0.04em" }}>STEP 03</span>
              </div>
              <h3 style={{ fontWeight: 700, color: "#1f2937", fontSize: 18, marginBottom: 8 }}>You receive a matched patient</h3>
              <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.55, marginBottom: 16 }}>Full profile with all 8 data points — anxiety level, blockers, budget mindset, preferred times, and more.</p>
              <div style={{ background: "rgba(0,0,0,.04)", borderRadius: 12, padding: "16px 18px", flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${teal}, ${tealLight})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 13 }}>S</div>
                  <div><p style={{ color: "#1f2937", fontSize: 13, fontWeight: 600 }}>Sarah M.</p><p style={{ color: "#6b7280", fontSize: 10 }}>Requested appointment</p></div>
                  <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: teal, background: `rgba(5,150,105,.12)`, padding: "3px 8px", borderRadius: 6 }}>92% match</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["Invisalign", "Quite anxious", "Flexible range", "Within a week", "Clear pricing", "Afternoons", "Up to 5 mi", "Cost concern"].map((l) => (
                    <span key={l} style={{ fontSize: 10, fontWeight: 500, padding: "3px 8px", borderRadius: 6, background: `rgba(5,150,105,.1)`, color: tealLight, border: `1px solid rgba(5,150,105,.2)` }}>{l}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p style={{ textAlign: "center", color: "#6b7280", fontSize: 13, marginTop: 40 }}>
            Setup takes under 5 minutes. Average time to first matched patient: <span style={{ color: teal, fontWeight: 700 }}>&lt; 72 hours</span>
          </p>
        </div>
      </section>

      {/* ══════════ 4. PATIENT INSIGHTS ══════════ */}
      <section id="insights" className="fc-section" style={sec}>
        <div style={maxW}>
          {sectionLabel("Patient intel")}
          {sectionH2("Know your patient before they walk in")}
          {sectionSub("Every matched patient includes 8 data points collected from our intake questionnaire. Here's what clinics see:")}
          <div className="fc-insights-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            <VisualInsightCard icon={<Heart size={16} />} title="Dental anxiety level" question="How do you feel about visiting the dentist?">
              <MiniBar label="Comfortable" pct={30} /><MiniBar label="A little nervous" pct={35} /><MiniBar label="Quite anxious" pct={55} highlight /><MiniBar label="Very anxious" pct={20} />
            </VisualInsightCard>
            <VisualInsightCard icon={<PoundSterling size={16} />} title="Cost approach" question="How do you think about investing in treatment?">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><Tag label="Best outcome" /><Tag label="Understand value" active /><Tag label="Flexible range" active /><Tag label="Strict budget" /></div>
              <p style={{ color: "#6b7280", fontSize: 12, marginTop: 10, lineHeight: 1.4 }}>Includes monthly payment preference and budget range when shared</p>
            </VisualInsightCard>
            <VisualInsightCard icon={<AlertCircle size={16} />} title="What's holding them back" question="Is there anything making you hesitate?">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><Tag label="Cost concern" active /><Tag label="Needs time to decide" /><Tag label="Unsure which treatment" active /><Tag label="Complexity worry" /><Tag label="Past bad experience" /><Tag label="No concerns" /></div>
              <p style={{ color: "#6b7280", fontSize: 12, marginTop: 10, lineHeight: 1.4 }}>Up to 2 selected per patient</p>
            </VisualInsightCard>
            <VisualInsightCard icon={<Star size={16} />} title="What they value in a clinic" question="What matters most when choosing a clinic?">
              {[{ label: "Clear pricing", pct: 65, top: true }, { label: "Calm environment", pct: 50, top: true }, { label: "Specialist experience", pct: 45 }, { label: "Good reviews", pct: 40 }, { label: "Flexible hours", pct: 30 }, { label: "Continuity of care", pct: 25 }].map((v) => (
                <div key={v.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: v.top ? "#1f2937" : "#6b7280", fontWeight: v.top ? 600 : 400, width: 120, flexShrink: 0, textAlign: "right" }}>{v.label}</span>
                  <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(0,0,0,.06)", overflow: "hidden" }}>
                    <div style={{ width: `${v.pct}%`, height: "100%", borderRadius: 4, background: v.top ? `linear-gradient(90deg, ${teal}, ${tealLight})` : "#d1d5db" }} />
                  </div>
                </div>
              ))}
              <p style={{ color: "#6b7280", fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>Each patient picks their top 2 priorities</p>
            </VisualInsightCard>
            <VisualInsightCard icon={<Clock size={16} />} title="How ready they are" question="When are you looking to start treatment?">
              <div style={{ display: "flex", alignItems: "stretch", gap: 0, marginBottom: 8 }}>
                {[{ label: "ASAP", color: teal }, { label: "This week", color: tealLight }, { label: "Few weeks", color: "#34d399" }, { label: "Exploring", color: "#6b7280" }].map((t, i) => (
                  <div key={t.label} style={{ flex: 1, textAlign: "center", padding: "12px 4px", background: `${t.color}15`, borderLeft: i > 0 ? "1px solid rgba(0,0,0,.04)" : undefined, borderRadius: i === 0 ? "10px 0 0 10px" : i === 3 ? "0 10px 10px 0" : undefined }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.color, margin: "0 auto 6px" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: t.color }}>{t.label}</span>
                  </div>
                ))}
              </div>
              <p style={{ color: "#6b7280", fontSize: 12, lineHeight: 1.4 }}>Emergency patients show same-day / next-day urgency</p>
            </VisualInsightCard>
            <VisualInsightCard icon={<Stethoscope size={16} />} title="Treatment interest" question="What treatment are you looking for?">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><Tag label="Invisalign" active /><Tag label="Whitening" /><Tag label="Composite Bonding" active /><Tag label="Veneers" /><Tag label="Implants" /><Tag label="Check-up & Clean" /><Tag label="Emergency" /></div>
              <p style={{ color: "#6b7280", fontSize: 12, marginTop: 10, lineHeight: 1.4 }}>Patients can select multiple treatments</p>
            </VisualInsightCard>
            <VisualInsightCard icon={<Calendar size={16} />} title="Preferred visit times" question="When would you prefer appointments?">
              <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                {[{ label: "Morning", sub: "Before 12pm", icon: "9am", active: false }, { label: "Afternoon", sub: "12 – 5pm", icon: "2pm", active: true }, { label: "Weekend", sub: "Sat / Sun", icon: "Sat", active: true }].map((slot) => (
                  <div key={slot.label} style={{ flex: 1, textAlign: "center", padding: "14px 8px 12px", borderRadius: 12, background: slot.active ? `rgba(5,150,105,.1)` : "rgba(0,0,0,.03)", border: `1px solid ${slot.active ? "rgba(5,150,105,.25)" : "rgba(0,0,0,.06)"}` }}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: slot.active ? teal : "#6b7280", marginBottom: 4, fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif" }}>{slot.icon}</p>
                    <p style={{ fontSize: 12, fontWeight: 600, color: slot.active ? "#1f2937" : "#6b7280" }}>{slot.label}</p>
                    <p style={{ fontSize: 10, color: "#6b7280" }}>{slot.sub}</p>
                  </div>
                ))}
              </div>
            </VisualInsightCard>
            <VisualInsightCard icon={<MapPin size={16} />} title="Location flexibility" question="How far are you willing to travel?">
              <div style={{ marginBottom: 8 }}>
                {[{ label: "Close to home / work", dist: "1.5 mi", idx: 0 }, { label: "Travel a bit", dist: "5 mi", idx: 1 }, { label: "Travel further for right clinic", dist: "5+ mi", idx: 2 }].map((loc) => (
                  <div key={loc.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, marginBottom: 4, background: loc.idx === 1 ? `rgba(5,150,105,.08)` : "transparent", border: loc.idx === 1 ? `1px solid rgba(5,150,105,.15)` : "1px solid transparent" }}>
                    <MapPin size={13} style={{ color: loc.idx === 1 ? teal : "#6b7280", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: loc.idx === 1 ? "#1f2937" : "#6b7280", flex: 1, fontWeight: loc.idx === 1 ? 600 : 400 }}>{loc.label}</span>
                    <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, background: "rgba(0,0,0,.05)", padding: "2px 8px", borderRadius: 6 }}>{loc.dist}</span>
                  </div>
                ))}
              </div>
            </VisualInsightCard>
          </div>
        </div>
      </section>

      {/* ══════════ 5. TRADITIONAL VS PEARLIE ══════════ */}
      <section className="fc-section" style={secAlt}>
        <div style={{ ...maxW, maxWidth: 800 }}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <span style={{ display: "inline-block", background: "rgba(239,68,68,.1)", color: redLight, fontWeight: 700, fontSize: 13, padding: "6px 16px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.04em" }}>The old way vs. the new way</span>
          </div>
          {sectionH2(<>Traditional marketing is{" "}<span style={{ color: redLight }}>costing you thousands</span></>)}
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18, overflow: "hidden", marginTop: 48 }}>
            <div style={{ overflowX: "auto" }}>
              <table className="fc-table" style={{ width: "100%", minWidth: 500, borderCollapse: "collapse", fontSize: 15 }}>
                <thead><tr>
                  <th style={{ textAlign: "left", padding: "18px 20px", color: "#6b7280", fontWeight: 600, fontSize: 13, borderBottom: `1px solid rgba(0,0,0,.08)` }}>&nbsp;</th>
                  <th style={{ textAlign: "center", padding: "18px 20px", color: redLight, fontWeight: 700, fontSize: 14, borderBottom: `1px solid rgba(0,0,0,.08)` }}>Traditional / Agency</th>
                  <th style={{ textAlign: "center", padding: "18px 20px", color: teal, fontWeight: 700, fontSize: 14, borderBottom: `2px solid ${teal}`, background: `rgba(5,150,105,.04)` }}>Pearlie</th>
                </tr></thead>
                <tbody>
                  {[
                    { feature: "Monthly cost to clinic", old: "£2,300 – £7,000+", pearlie: "£99 – £486" },
                    { feature: "Ad spend required from clinic", old: "£800 – £5,000 on top", pearlie: "£0 — we handle it all" },
                    { feature: "Setup / onboarding fee", old: "£1,000 – £5,000", pearlie: "£0 — free" },
                    { feature: "Contract", old: "12 – 36 months locked in", pearlie: "Cancel anytime" },
                    { feature: "Time to first patient", old: "3 – 6 months (SEO ramp)", pearlie: "Within 48 hours" },
                    { feature: "Patient quality", old: "Cold ad clicks", pearlie: "Pre-qualified & matched" },
                    { feature: "Patient no-show?", old: "You still pay", pearlie: "No charge" },
                    { feature: "No patients delivered?", old: "You still pay retainer", pearlie: "No extra charge" },
                    { feature: "Work required from clinic", old: "Approve ads, manage pages", pearlie: "None — fully hands-off" },
                  ].map((row) => (
                    <tr key={row.feature}>
                      <td style={{ padding: "16px 20px", color: "#1f2937", fontWeight: 500, borderBottom: `1px solid rgba(0,0,0,.04)` }}>{row.feature}</td>
                      <td style={{ textAlign: "center", padding: "16px 20px", color: redLight, fontWeight: 600, fontSize: 14, borderBottom: `1px solid rgba(0,0,0,.04)` }}>{row.old}</td>
                      <td style={{ textAlign: "center", padding: "16px 20px", color: teal, fontWeight: 600, fontSize: 14, borderBottom: `1px solid rgba(0,0,0,.04)`, background: `rgba(5,150,105,.03)` }}>{row.pearlie}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ 6. ZERO RISK ══════════ */}
      <section className="fc-section" style={sec}>
        <div style={{ ...maxW, maxWidth: 800 }}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <span style={{ display: "inline-block", background: `rgba(5,150,105,.1)`, color: teal, fontWeight: 700, fontSize: 13, padding: "6px 16px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.04em" }}>Zero risk</span>
          </div>
          {sectionH2(<>You only pay for patients<br />who actually show up</>)}
          <p style={{ color: "#6b7280", fontSize: 16, textAlign: "center", maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.65 }}>
            If a patient doesn't attend their appointment, you are not charged. If we don't send you any matched patients in a month, you don't pay extra. No-shows are always on us.
          </p>
          <div className="fc-zero-risk-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[{ q: "Patient no-show?", a: "No charge. Ever." }, { q: "No patients this month?", a: "You don't pay extra." }, { q: "Want to cancel?", a: "Anytime. No penalties." }, { q: "Unhappy with quality?", a: "We'll make it right." }].map((card) => (
              <div key={card.q} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: "24px 22px" }}>
                <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 8 }}>{card.q}</p>
                <p style={{ color: teal, fontWeight: 700, fontSize: 18, lineHeight: 1.3 }}>{card.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ 7. FREE VISIBILITY ══════════ */}
      <section className="fc-section" style={secAlt}>
        <div style={maxW}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <span style={{ display: "inline-block", background: `rgba(5,150,105,.1)`, color: teal, fontWeight: 700, fontSize: 13, padding: "6px 16px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.04em" }}>Bonus: free visibility</span>
          </div>
          {sectionH2("Patients discover your clinic — even outside Pearlie")}
          {sectionSub("Every clinic gets a public profile page that ranks on Google. Your always-on digital storefront — at no extra cost.")}
          <div className="fc-visibility-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {/* SEO */}
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "24px 22px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(59,130,246,.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60a5fa", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                </div>
                <span style={{ fontWeight: 700, color: "#1f2937", fontSize: 14 }}>SEO-optimised profile</span>
              </div>
              <div style={{ background: "rgba(0,0,0,.04)", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><div style={{ width: 14, height: 14, borderRadius: 3, background: "#4285f4" }} /><span style={{ color: "#6b7280", fontSize: 11 }}>pearlie.org &rsaquo; clinic</span></div>
                <p style={{ color: "#60a5fa", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Your Clinic Name — Pearlie</p>
                <p style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.4 }}>Invisalign, veneers &amp; cosmetic dentistry in London. View treatments, reviews &amp; book...</p>
              </div>
              <p style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.4 }}>Rank on Google for local dental searches without paying for ads</p>
            </div>
            {/* Brand exposure */}
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "24px 22px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(168,85,247,.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a78bfa", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                </div>
                <span style={{ fontWeight: 700, color: "#1f2937", fontSize: 14 }}>Passive brand exposure</span>
              </div>
              {[{ label: "Profile views", value: "1,200+", pct: 80 }, { label: "Direct website clicks", value: "340+", pct: 45 }, { label: "Phone calls from profile", value: "85+", pct: 25 }].map((stat) => (
                <div key={stat.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ color: "#6b7280", fontSize: 12 }}>{stat.label}</span><span style={{ color: "#a78bfa", fontSize: 12, fontWeight: 600 }}>{stat.value}/mo</span></div>
                  <div style={{ height: 6, borderRadius: 3, background: "rgba(0,0,0,.06)", overflow: "hidden" }}><div style={{ width: `${stat.pct}%`, height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #8b5cf6, #a78bfa)" }} /></div>
                </div>
              ))}
              <p style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.4 }}>Patients see your clinic, learn about you — and may contact you directly</p>
            </div>
            {/* Social proof */}
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "24px 22px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(217,119,6,.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706", flexShrink: 0 }}><Star size={16} /></div>
                <span style={{ fontWeight: 700, color: "#1f2937", fontSize: 14 }}>Social proof displayed</span>
              </div>
              <div style={{ background: "rgba(0,0,0,.04)", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  {[1, 2, 3, 4, 5].map((s) => (<Star key={s} size={14} fill={s <= 4 ? "#d97706" : "none"} style={{ color: s <= 4 ? "#d97706" : "#6b7280" }} />))}
                  <span style={{ color: "#d97706", fontSize: 13, fontWeight: 700, marginLeft: 4 }}>4.8</span><span style={{ color: "#6b7280", fontSize: 11 }}>(127 reviews)</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["Invisalign", "Cosmetic", "Implants", "NHS"].map((t) => (<span key={t} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "rgba(217,119,6,.1)", color: "#d97706", fontWeight: 500 }}>{t}</span>))}
                </div>
              </div>
              <p style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.4 }}>Reviews, services &amp; specialties showcased to high-intent patients</p>
            </div>
            {/* Organic growth */}
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "24px 22px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `rgba(5,150,105,.1)`, display: "flex", alignItems: "center", justifyContent: "center", color: teal, flexShrink: 0 }}><TrendingUp size={16} /></div>
                <span style={{ fontWeight: 700, color: "#1f2937", fontSize: 14 }}>Organic growth channel</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80, padding: "0 4px", marginBottom: 12 }}>
                {[18, 25, 22, 35, 40, 38, 52, 60, 55, 70, 78, 85].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: "3px 3px 0 0", background: i >= 9 ? `linear-gradient(180deg, ${teal}, rgba(5,150,105,.4))` : `rgba(5,150,105,.15)` }} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><span style={{ color: "#6b7280", fontSize: 10 }}>Month 1</span><span style={{ color: teal, fontSize: 10, fontWeight: 600 }}>Month 12</span></div>
              <p style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.4 }}>Even patients who don't book through Pearlie now know you exist</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ PRICING ═══════════ */}
      <section id="pricing" className="fc-section" style={sec}>
        <div style={maxW}>
          <p
            style={{
              color: teal,
              fontWeight: 700,
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Pricing
          </p>
          <h2 style={{ ...heading, fontSize: "clamp(28px, 4vw, 42px)", textAlign: "center", marginBottom: 16 }}>
            Simple, transparent plans
          </h2>
          <p
            style={{
              color: "#6b7280",
              fontSize: 17,
              textAlign: "center",
              maxWidth: 540,
              margin: "0 auto 48px",
              lineHeight: 1.6,
            }}
          >
            No setup fees. No contracts. No surprises. Cancel anytime.
          </p>

          {/* ── FREE TRIAL BANNER ── */}
          <div
            style={{
              background: "rgba(5,150,105,.06)",
              border: "1px solid rgba(5,150,105,.2)",
              borderRadius: 16,
              padding: "28px 32px",
              textAlign: "center",
              maxWidth: 800,
              margin: "0 auto 48px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
              <Zap size={18} style={{ color: teal }} />
              <span style={{ ...heading, fontSize: 20, color: "#111827" }}>Start free — &pound;0 upfront</span>
            </div>
            <p style={{ color: "#6b7280", fontSize: 15, lineHeight: 1.6, maxWidth: 520, margin: "0 auto 16px" }}>
              Your first matched patient is on us. Patient attends? You keep every penny — Pearlie charges &pound;0.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 20, marginBottom: 20 }}>
              {["No credit card required", "No contract", "Cancel anytime"].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Check size={14} style={{ color: teal }} />
                  <span style={{ color: "#1f2937", fontSize: 13, fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </div>
            <Link
              href="/signup"
              style={{
                ...greenBtn,
                padding: "14px 28px",
                fontSize: 15,
              }}
            >
              Get your free patient <ArrowRight size={16} />
            </Link>
          </div>

          {/* ── PRICING CARDS ── */}
          <div
            className="fc-pricing-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 24,
              maxWidth: 1080,
              margin: "0 auto",
            }}
          >
            {/* ── STARTER ── */}
            <div
              style={{
                background: "rgba(0,0,0,.03)",
                border: "1px solid rgba(0,0,0,.08)",
                borderRadius: 20,
                padding: "40px 28px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <p style={{ color: "#6b7280", fontWeight: 600, fontSize: 14, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Starter
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                <span style={{ ...heading, fontSize: 48 }}>&pound;99</span>
                <span style={{ color: "#6b7280", fontSize: 16 }}>/month</span>
              </div>
              <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>
                For single practices getting started
              </p>
              <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 6 }}>
                2 confirmed bookings included
              </p>
              <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>
                Extra confirmed bookings: &pound;35 each
              </p>

              {/* Unlimited enquiries highlight */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(5,150,105,.08)",
                  border: "1px solid rgba(5,150,105,.2)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 16, color: teal }}>&infin;</span>
                <span style={{ color: tealLight, fontSize: 14, fontWeight: 700 }}>Unlimited patient enquiries</span>
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", flex: 1 }}>
                {[
                  "AI-powered matching",
                  "Clinic dashboard",
                  "Patient messaging",
                  "Appointment reminders",
                  "Public clinic profile",
                  "Email notifications",
                  "Self-serve onboarding guide",
                  "Email support",
                  "Cancel anytime",
                ].map((item) => (
                  <li
                    key={item}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "6px 0",
                      color: "#1f2937",
                      fontSize: 14,
                    }}
                  >
                    <Check size={16} style={{ color: teal, flexShrink: 0, marginTop: 2 }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                style={{
                  ...greenBtn,
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                Start free trial <ArrowRight size={16} />
              </Link>
              <p style={{ color: "#6b7280", fontSize: 11, textAlign: "center", marginTop: 8 }}>
                Only charged when patient actually attends
              </p>
            </div>

            {/* ── STANDARD (Best value) ── */}
            <div
              style={{
                background: "rgba(5,150,105,.06)",
                border: "2px solid rgba(5,150,105,.25)",
                borderRadius: 20,
                padding: "40px 28px",
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -14,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: teal,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 12,
                  padding: "5px 16px",
                  borderRadius: 20,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Best value
              </div>
              <p style={{ color: teal, fontWeight: 600, fontSize: 14, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Standard
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                <span style={{ ...heading, fontSize: 48 }}>&pound;247</span>
                <span style={{ color: "#6b7280", fontSize: 16 }}>/month</span>
              </div>
              <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>
                For growing practices — the full platform
              </p>
              <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 6 }}>
                4 confirmed bookings included
              </p>
              <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>
                Extra confirmed bookings: &pound;35 each
              </p>

              {/* Unlimited enquiries highlight */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(5,150,105,.08)",
                  border: "1px solid rgba(5,150,105,.2)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 16, color: teal }}>&infin;</span>
                <span style={{ color: tealLight, fontSize: 14, fontWeight: 700 }}>Unlimited patient enquiries</span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(5,150,105,.06)",
                  border: "1px solid rgba(5,150,105,.12)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  marginBottom: 16,
                }}
              >
                <Check size={16} style={{ color: tealLight, flexShrink: 0 }} />
                <span style={{ color: tealLight, fontSize: 13, fontWeight: 600 }}>Everything in Starter, plus:</span>
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", flex: 1 }}>
                {[
                  "Full patient insight profiles",
                  "SEO-optimised clinic profile (Google ranking)",
                  "Boxly & CRM integration",
                  "Built-in patient chat & SMS",
                  "Advanced analytics & reporting",
                  "Automated review requests",
                  "Free 1-on-1 onboarding call",
                  "Priority email & chat support",
                  "Referral programme access",
                ].map((item) => (
                  <li
                    key={item}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "6px 0",
                      color: "#1f2937",
                      fontSize: 14,
                    }}
                  >
                    <Check size={16} style={{ color: teal, flexShrink: 0, marginTop: 2 }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Pearlie Guarantee */}
              <a
                href="#guarantee"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(217,119,6,.06)",
                  border: "1px solid rgba(217,119,6,.15)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  marginBottom: 16,
                  textDecoration: "none",
                  cursor: "pointer",
                  transition: "background .15s",
                }}
              >
                <Shield size={16} style={{ color: "#d97706", flexShrink: 0 }} />
                <span style={{ color: "#d97706", fontSize: 13, fontWeight: 700 }}>Pearlie Guarantee</span>
                <ArrowRight size={14} style={{ color: "#d97706", marginLeft: "auto", flexShrink: 0 }} />
              </a>

              <Link
                href="/signup"
                style={{
                  ...greenBtn,
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                Start free trial <ArrowRight size={16} />
              </Link>
              <p style={{ color: "#6b7280", fontSize: 11, textAlign: "center", marginTop: 8 }}>
                Only charged when patient actually attends
              </p>
            </div>

            {/* ── PREMIUM (Multi-practice) ── */}
            <div
              style={{
                background: "rgba(0,0,0,.03)",
                border: "1px solid rgba(0,0,0,.08)",
                borderRadius: 20,
                padding: "40px 28px",
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -14,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(0,0,0,.06)",
                  border: "1px solid rgba(0,0,0,.1)",
                  color: "#6b7280",
                  fontWeight: 700,
                  fontSize: 12,
                  padding: "5px 16px",
                  borderRadius: 20,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Multi-practice
              </div>
              <p style={{ color: "#6b7280", fontWeight: 600, fontSize: 14, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Premium
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                <span style={{ ...heading, fontSize: 48 }}>&pound;486</span>
                <span style={{ color: "#6b7280", fontSize: 16 }}>/month</span>
              </div>
              <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>
                For multi-location practices &amp; groups
              </p>
              <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 6 }}>
                8 confirmed bookings included (across all locations)
              </p>
              <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>
                Extra confirmed bookings: &pound;35 each
              </p>

              {/* Unlimited enquiries highlight */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(5,150,105,.08)",
                  border: "1px solid rgba(5,150,105,.2)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 16, color: teal }}>&infin;</span>
                <span style={{ color: tealLight, fontSize: 14, fontWeight: 700 }}>Unlimited patient enquiries</span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(5,150,105,.06)",
                  border: "1px solid rgba(5,150,105,.12)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  marginBottom: 16,
                }}
              >
                <Check size={16} style={{ color: tealLight, flexShrink: 0 }} />
                <span style={{ color: tealLight, fontSize: 13, fontWeight: 600 }}>Everything in Standard, plus:</span>
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", flex: 1 }}>
                {[
                  "Multi-practice dashboard",
                  "Unified reporting across sites",
                  "Dedicated account manager",
                  "Free onboarding & team training",
                  "Quarterly strategy review",
                  "Priority patient matching",
                  "Volume pricing available",
                  "Cancel anytime",
                ].map((item) => (
                  <li
                    key={item}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "6px 0",
                      color: "#1f2937",
                      fontSize: 14,
                    }}
                  >
                    <Check size={16} style={{ color: teal, flexShrink: 0, marginTop: 2 }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Pearlie Guarantee */}
              <a
                href="#guarantee"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(217,119,6,.06)",
                  border: "1px solid rgba(217,119,6,.15)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  marginBottom: 16,
                  textDecoration: "none",
                  cursor: "pointer",
                  transition: "background .15s",
                }}
              >
                <Shield size={16} style={{ color: "#d97706", flexShrink: 0 }} />
                <span style={{ color: "#d97706", fontSize: 13, fontWeight: 700 }}>Pearlie Guarantee</span>
                <ArrowRight size={14} style={{ color: "#d97706", marginLeft: "auto", flexShrink: 0 }} />
              </a>

              <a
                href="mailto:hello@pearlie.org?subject=Pearlie Premium — clinic enquiry"
                style={{
                  ...outlineBtn,
                  width: "100%",
                  justifyContent: "center",
                  borderColor: "rgba(0,0,0,.15)",
                }}
              >
                Contact sales <ArrowRight size={16} />
              </a>
            </div>
          </div>

          {/* ── REVENUE CALLOUT ── */}
          <div
            style={{
              maxWidth: 800,
              margin: "40px auto 0",
              background: "rgba(5,150,105,.06)",
              border: "1px solid rgba(5,150,105,.15)",
              borderRadius: 14,
              padding: "20px 28px",
              textAlign: "center",
            }}
          >
            <p style={{ color: "#1f2937", fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>
              &#128176; No percentage cuts, ever. &pound;2,000 implant? You keep &pound;2,000. We charge a flat &pound;35 for the confirmed booking.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURE COMPARISON TABLE ═══════════ */}
      <section className="fc-section" style={secAlt}>
        <div style={{ ...maxW, maxWidth: 960 }}>
          <h2 style={{ ...heading, fontSize: "clamp(24px, 3.5vw, 36px)", textAlign: "center", marginBottom: 48 }}>
            Compare all features
          </h2>
          <div className="fc-compare-table-wrap" style={{ borderRadius: 16, border: "1px solid rgba(0,0,0,.06)", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table className="fc-compare-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,0,0,.08)" }}>
                  <th style={{ textAlign: "left", padding: "16px 20px", color: "#6b7280", fontWeight: 600, fontSize: 13, width: "40%" }}>&nbsp;</th>
                  <th style={{ textAlign: "center", padding: "16px 16px", color: "#1f2937", fontWeight: 700, fontSize: 14 }}>
                    Starter &pound;99
                  </th>
                  <th style={{ textAlign: "center", padding: "16px 16px", color: teal, fontWeight: 700, fontSize: 14, background: "rgba(5,150,105,.04)" }}>
                    <div>Standard &pound;247</div>
                    <span style={{ display: "inline-block", background: teal, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, marginTop: 4, textTransform: "uppercase" }}>Best value</span>
                  </th>
                  <th style={{ textAlign: "center", padding: "16px 16px", color: "#1f2937", fontWeight: 700, fontSize: 14 }}>
                    Premium &pound;486
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* ── Patient Acquisition ── */}
                <tr><td colSpan={4} style={{ padding: "14px 20px", color: teal, fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(0,0,0,.04)" }}>Patient Acquisition</td></tr>
                {/* Unlimited enquiries - HIGHLIGHTED ROW */}
                <tr style={{ background: "rgba(5,150,105,.06)" }}>
                  <td style={{ padding: "14px 20px", color: "#1f2937", fontWeight: 700, fontSize: 14, borderBottom: "1px solid rgba(0,0,0,.04)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: teal, fontSize: 16 }}>&infin;</span> Unlimited patient enquiries
                    </span>
                  </td>
                  <td style={{ textAlign: "center", padding: "14px 16px", borderBottom: "1px solid rgba(0,0,0,.04)" }}><Check size={18} style={{ color: teal }} /></td>
                  <td style={{ textAlign: "center", padding: "14px 16px", borderBottom: "1px solid rgba(0,0,0,.04)", background: "rgba(5,150,105,.04)" }}><Check size={18} style={{ color: teal }} /></td>
                  <td style={{ textAlign: "center", padding: "14px 16px", borderBottom: "1px solid rgba(0,0,0,.04)" }}><Check size={18} style={{ color: teal }} /></td>
                </tr>
                {[
                  { feature: "Confirmed bookings included", starter: "2", standard: "4", premium: "8" },
                  { feature: "Extra confirmed bookings", starter: "£35", standard: "£35", premium: "£35" },
                  { feature: "AI-powered patient matching", starter: true, standard: true, premium: true },
                  { feature: "Priority matching queue", starter: false, standard: false, premium: true },
                ].map((row) => (
                  <tr key={row.feature} style={{ borderBottom: "1px solid rgba(0,0,0,.04)" }}>
                    <td style={{ padding: "12px 20px", color: "#1f2937", fontWeight: 500 }}>{row.feature}</td>
                    {[row.starter, row.standard, row.premium].map((val, i) => (
                      <td key={i} style={{ textAlign: "center", padding: "12px 16px", background: i === 1 ? "rgba(5,150,105,.04)" : undefined }}>
                        {typeof val === "boolean" ? (val ? <Check size={16} style={{ color: teal }} /> : <X size={16} style={{ color: "#d1d5db" }} />) : <span style={{ color: "#6b7280", fontWeight: 600 }}>{val}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* ── Patient Insights ── */}
                <tr><td colSpan={4} style={{ padding: "14px 20px", color: teal, fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(0,0,0,.04)" }}>Patient Insights</td></tr>
                {[
                  { feature: "Basic patient info", starter: true, standard: true, premium: true },
                  { feature: "Full insight profiles (anxiety, budget, blockers)", starter: false, standard: true, premium: true },
                  { feature: "Monthly area insights report", starter: false, standard: true, premium: true },
                ].map((row) => (
                  <tr key={row.feature} style={{ borderBottom: "1px solid rgba(0,0,0,.04)" }}>
                    <td style={{ padding: "12px 20px", color: "#1f2937", fontWeight: 500 }}>{row.feature}</td>
                    {[row.starter, row.standard, row.premium].map((val, i) => (
                      <td key={i} style={{ textAlign: "center", padding: "12px 16px", background: i === 1 ? "rgba(5,150,105,.04)" : undefined }}>
                        {val ? <Check size={16} style={{ color: teal }} /> : <X size={16} style={{ color: "#d1d5db" }} />}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* ── Clinic Profile & SEO ── */}
                <tr><td colSpan={4} style={{ padding: "14px 20px", color: teal, fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(0,0,0,.04)" }}>Clinic Profile &amp; SEO</td></tr>
                {[
                  { feature: "Public clinic profile", starter: true, standard: true, premium: true },
                  { feature: "SEO-optimised profile (Google ranking)", starter: false, standard: true, premium: true },
                  { feature: "Automated review requests", starter: false, standard: true, premium: true },
                ].map((row) => (
                  <tr key={row.feature} style={{ borderBottom: "1px solid rgba(0,0,0,.04)" }}>
                    <td style={{ padding: "12px 20px", color: "#1f2937", fontWeight: 500 }}>{row.feature}</td>
                    {[row.starter, row.standard, row.premium].map((val, i) => (
                      <td key={i} style={{ textAlign: "center", padding: "12px 16px", background: i === 1 ? "rgba(5,150,105,.04)" : undefined }}>
                        {val ? <Check size={16} style={{ color: teal }} /> : <X size={16} style={{ color: "#d1d5db" }} />}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* ── Communication ── */}
                <tr><td colSpan={4} style={{ padding: "14px 20px", color: teal, fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(0,0,0,.04)" }}>Communication</td></tr>
                {[
                  { feature: "Patient messaging", starter: true, standard: true, premium: true },
                  { feature: "Built-in chat & SMS", starter: false, standard: true, premium: true },
                  { feature: "Automated appointment reminders", starter: true, standard: true, premium: true },
                ].map((row) => (
                  <tr key={row.feature} style={{ borderBottom: "1px solid rgba(0,0,0,.04)" }}>
                    <td style={{ padding: "12px 20px", color: "#1f2937", fontWeight: 500 }}>{row.feature}</td>
                    {[row.starter, row.standard, row.premium].map((val, i) => (
                      <td key={i} style={{ textAlign: "center", padding: "12px 16px", background: i === 1 ? "rgba(5,150,105,.04)" : undefined }}>
                        {val ? <Check size={16} style={{ color: teal }} /> : <X size={16} style={{ color: "#d1d5db" }} />}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* ── Dashboard & Analytics ── */}
                <tr><td colSpan={4} style={{ padding: "14px 20px", color: teal, fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(0,0,0,.04)" }}>Dashboard &amp; Analytics</td></tr>
                {[
                  { feature: "Clinic dashboard", starter: true, standard: true, premium: true },
                  { feature: "Booking & conversion tracking", starter: true, standard: true, premium: true },
                  { feature: "Advanced analytics & reporting", starter: false, standard: true, premium: true },
                  { feature: "Multi-location dashboard", starter: false, standard: false, premium: true },
                ].map((row) => (
                  <tr key={row.feature} style={{ borderBottom: "1px solid rgba(0,0,0,.04)" }}>
                    <td style={{ padding: "12px 20px", color: "#1f2937", fontWeight: 500 }}>{row.feature}</td>
                    {[row.starter, row.standard, row.premium].map((val, i) => (
                      <td key={i} style={{ textAlign: "center", padding: "12px 16px", background: i === 1 ? "rgba(5,150,105,.04)" : undefined }}>
                        {val ? <Check size={16} style={{ color: teal }} /> : <X size={16} style={{ color: "#d1d5db" }} />}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* ── Integrations ── */}
                <tr><td colSpan={4} style={{ padding: "14px 20px", color: teal, fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(0,0,0,.04)" }}>Integrations</td></tr>
                {[
                  { feature: "Email notifications", starter: true, standard: true, premium: true },
                  { feature: "Boxly CRM integration", starter: false, standard: true, premium: true },
                  { feature: "Webhook support (any CRM)", starter: false, standard: true, premium: true },
                  { feature: "Referral programme", starter: false, standard: true, premium: true },
                ].map((row) => (
                  <tr key={row.feature} style={{ borderBottom: "1px solid rgba(0,0,0,.04)" }}>
                    <td style={{ padding: "12px 20px", color: "#1f2937", fontWeight: 500 }}>{row.feature}</td>
                    {[row.starter, row.standard, row.premium].map((val, i) => (
                      <td key={i} style={{ textAlign: "center", padding: "12px 16px", background: i === 1 ? "rgba(5,150,105,.04)" : undefined }}>
                        {val ? <Check size={16} style={{ color: teal }} /> : <X size={16} style={{ color: "#d1d5db" }} />}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* ── Support & Onboarding ── */}
                <tr><td colSpan={4} style={{ padding: "14px 20px", color: teal, fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(0,0,0,.04)" }}>Support &amp; Onboarding</td></tr>
                {[
                  { feature: "Self-serve onboarding guide", starter: true, standard: true, premium: true },
                  { feature: "Free 1-on-1 onboarding call", starter: false, standard: true, premium: true },
                  { feature: "Full team training", starter: false, standard: false, premium: true },
                  { feature: "Email support", starter: true, standard: true, premium: true },
                  { feature: "Priority email & chat support", starter: false, standard: true, premium: true },
                  { feature: "Dedicated account manager", starter: false, standard: false, premium: true },
                  { feature: "Quarterly strategy review", starter: false, standard: false, premium: true },
                  { feature: "Pearlie Guarantee", starter: false, standard: true, premium: true },
                ].map((row) => (
                  <tr key={row.feature} style={{ borderBottom: "1px solid rgba(0,0,0,.04)" }}>
                    <td style={{ padding: "12px 20px", color: row.feature === "Pearlie Guarantee" ? "#d97706" : "#1f2937", fontWeight: row.feature === "Pearlie Guarantee" ? 700 : 500 }}>
                      {row.feature === "Pearlie Guarantee" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Shield size={14} style={{ color: "#d97706" }} /> {row.feature}</span> : row.feature}
                    </td>
                    {[row.starter, row.standard, row.premium].map((val, i) => (
                      <td key={i} style={{ textAlign: "center", padding: "12px 16px", background: i === 1 ? "rgba(5,150,105,.04)" : undefined }}>
                        {val ? <Check size={16} style={{ color: teal }} /> : <X size={16} style={{ color: "#d1d5db" }} />}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* ── Practice Management ── */}
                <tr><td colSpan={4} style={{ padding: "14px 20px", color: teal, fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(0,0,0,.04)" }}>Practice Management</td></tr>
                {[
                  { feature: "Single practice", starter: true, standard: true, premium: true },
                  { feature: "Multi-practice management", starter: false, standard: false, premium: true },
                  { feature: "Team member management", starter: false, standard: false, premium: true },
                ].map((row) => (
                  <tr key={row.feature} style={{ borderBottom: "1px solid rgba(0,0,0,.04)" }}>
                    <td style={{ padding: "12px 20px", color: "#1f2937", fontWeight: 500 }}>{row.feature}</td>
                    {[row.starter, row.standard, row.premium].map((val, i) => (
                      <td key={i} style={{ textAlign: "center", padding: "12px 16px", background: i === 1 ? "rgba(5,150,105,.04)" : undefined }}>
                        {val ? <Check size={16} style={{ color: teal }} /> : <X size={16} style={{ color: "#d1d5db" }} />}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* ── Bottom CTA row ── */}
                <tr style={{ borderTop: "1px solid rgba(0,0,0,.08)" }}>
                  <td style={{ padding: "20px 20px" }}>&nbsp;</td>
                  <td style={{ textAlign: "center", padding: "20px 12px" }}>
                    <Link href="/signup" style={{ ...greenBtn, padding: "10px 20px", fontSize: 13, borderRadius: 10 }}>
                      Start free trial
                    </Link>
                  </td>
                  <td style={{ textAlign: "center", padding: "20px 12px", background: "rgba(5,150,105,.04)" }}>
                    <Link href="/signup" style={{ ...greenBtn, padding: "10px 20px", fontSize: 13, borderRadius: 10 }}>
                      Start free trial
                    </Link>
                  </td>
                  <td style={{ textAlign: "center", padding: "20px 12px" }}>
                    <a href="mailto:hello@pearlie.org?subject=Pearlie Premium — clinic enquiry" style={{ ...outlineBtn, padding: "10px 20px", fontSize: 13, borderRadius: 10, borderColor: "rgba(0,0,0,.15)" }}>
                      Contact sales
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═══════════ ROI CALCULATOR ═══════════ */}
      <section className="fc-section" style={sec}>
        <div style={{ ...maxW, maxWidth: 840 }}>
          <h2 style={{ ...heading, fontSize: "clamp(28px, 4vw, 42px)", textAlign: "center", marginBottom: 12 }}>
            Your return, calculated
          </h2>
          <p style={{ color: "#6b7280", fontSize: 17, textAlign: "center", marginBottom: 48, lineHeight: 1.6 }}>
            Adjust the sliders to match your practice.
          </p>

          <div className="fc-roi-wrapper" style={{ background: "rgba(0,0,0,.03)", border: "1px solid rgba(0,0,0,.06)", borderRadius: 20, padding: "36px 32px" }}>
            {/* Single slider: confirmed patients */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ color: "#6b7280", fontSize: 14, fontWeight: 500 }}>Confirmed patients per month</span>
                <span style={{ color: teal, fontWeight: 700, fontSize: 16 }}>{roiPatients}</span>
              </div>
              <input type="range" min={0} max={25} value={roiPatients} onChange={(e) => setRoiPatients(Number(e.target.value))} style={{ width: "100%" }} />
              <p style={{ color: "#6b7280", fontSize: 11, marginTop: 6 }}>0 = no subscription</p>
            </div>

            {/* LTV slider */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ color: "#6b7280", fontSize: 14, fontWeight: 500 }}>Patient lifetime value</span>
                <span style={{ color: teal, fontWeight: 700, fontSize: 16 }}>&pound;{roiLtv.toLocaleString()}</span>
              </div>
              <input type="range" min={300} max={3000} step={50} value={roiLtv} onChange={(e) => setRoiLtv(Number(e.target.value))} style={{ width: "100%" }} />
            </div>

            {/* Output boxes */}
            {(() => {
              const r = roiResult()
              return (
                <>
                  <div className="fc-roi-output-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
                    <div style={{ background: "rgba(0,0,0,.04)", borderRadius: 14, padding: "20px 16px", textAlign: "center" }}>
                      <p style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>You pay Pearlie</p>
                      <p style={{ ...heading, fontSize: 24, color: "#111827" }}>&pound;{r.totalCost.toLocaleString()}<span style={{ fontSize: 13, color: "#6b7280", fontWeight: 400 }}>/mo</span></p>
                    </div>
                    <div style={{ background: "rgba(5,150,105,.06)", border: "1px solid rgba(5,150,105,.15)", borderRadius: 14, padding: "20px 16px", textAlign: "center" }}>
                      <p style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Revenue you keep</p>
                      <p style={{ ...heading, fontSize: 24, color: teal }}>&pound;{r.revenue.toLocaleString()}</p>
                    </div>
                    <div style={{ background: "rgba(0,0,0,.04)", borderRadius: 14, padding: "20px 16px", textAlign: "center" }}>
                      <p style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>ROI</p>
                      <p style={{ ...heading, fontSize: 24, color: tealLight }}>{r.roiPct.toLocaleString()}%</p>
                    </div>
                    <div style={{ background: "rgba(0,0,0,.04)", borderRadius: 14, padding: "20px 16px", textAlign: "center" }}>
                      <p style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Net profit</p>
                      <p style={{ ...heading, fontSize: 24, color: "#111827" }}>&pound;{r.net.toLocaleString()}</p>
                    </div>
                  </div>
                  <p style={{ color: "#6b7280", fontSize: 14, textAlign: "center", lineHeight: 1.5 }}>
                    {roiPatients} patients &times; &pound;{roiLtv.toLocaleString()} = &pound;{r.revenue.toLocaleString()} — for &pound;{r.totalCost.toLocaleString()}/mo{roiPatients >= 3 && <span> ({r.planLabel})</span>}
                  </p>
                </>
              )
            })()}
          </div>
        </div>
      </section>

      {/* ══════════ 10. ONBOARDING ══════════ */}
      <section className="fc-section" style={sec}>
        <div style={{ ...maxW, maxWidth: 800 }}>
          {sectionLabel("Get started")}
          {sectionH2("Go live in under 24 hours")}
          {sectionSub("No complex integrations. No training required. You could be receiving your first matched patient by tomorrow.")}
          <div className="fc-steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {[
              { step: "01", title: "Sign up", desc: "Create your account and tell us about your clinic in under 5 minutes.", icon: <FileText size={20} /> },
              { step: "02", title: "Set your profile", desc: "Add treatments, team, hours, and what makes your practice unique.", icon: <Users size={20} /> },
              { step: "03", title: "We match patients", desc: "Our AI starts routing pre-qualified patients who fit your clinic.", icon: <Brain size={20} /> },
              { step: "04", title: "Receive patients", desc: "Get full patient profiles with insights — ready for a productive consult.", icon: <Zap size={20} /> },
            ].map((s) => (
              <div key={s.step} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "28px 22px", textAlign: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `rgba(5,150,105,.1)`, display: "flex", alignItems: "center", justifyContent: "center", color: teal, margin: "0 auto 14px" }}>{s.icon}</div>
                <p style={{ color: teal, fontSize: 11, fontWeight: 800, marginBottom: 6, letterSpacing: "0.06em" }}>STEP {s.step}</p>
                <h3 style={{ color: "#1f2937", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{s.title}</h3>
                <p style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.45 }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", color: "#6b7280", fontSize: 13, marginTop: 20 }}>Average time from signup to first matched patient: <span style={{ color: teal, fontWeight: 700 }}>&lt; 72 hours</span></p>
        </div>
      </section>

      {/* ══════════ 11. TESTIMONIALS ══════════ */}
      <section className="fc-section" style={secAlt}>
        <div style={maxW}>
          {sectionLabel("Trusted by clinics")}
          {sectionH2("What practice owners say")}
          <div className="fc-testimonials-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, maxWidth: 880, margin: "48px auto 0" }}>
            {[
              { name: "Daniel Saleem", practice: "London Dental Centre", quote: "Pearlie sends us patients who are genuinely ready for treatment — with full insight into their anxiety level, budget, and what they care about. It's transformed how we handle consultations." },
              { name: "Hannan Imran", practice: "Siha Dental", quote: "We stopped spending thousands on Google Ads and started getting higher-quality patients through Pearlie. The patient profiles are incredibly detailed — our conversion rate has gone up significantly." },
            ].map((t) => (
              <div key={t.name} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "36px 30px", position: "relative" }}>
                <Quote size={28} style={{ color: `rgba(5,150,105,.1)`, position: "absolute", top: 28, right: 28 }} />
                <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>{[1, 2, 3, 4, 5].map((s) => (<Star key={s} size={14} fill="#d97706" style={{ color: "#d97706" }} />))}</div>
                <p style={{ color: "#1f2937", fontSize: 15, lineHeight: 1.7, marginBottom: 28, fontStyle: "italic" }}>&ldquo;{t.quote}&rdquo;</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${teal}, ${tealLight})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15 }}>{t.name[0]}</div>
                  <div><p style={{ color: "#1f2937", fontWeight: 700, fontSize: 14 }}>{t.name}</p><p style={{ color: "#6b7280", fontSize: 12 }}>{t.practice}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ PEARLIE GUARANTEE ══════════ */}
      <section id="guarantee" className="fc-section" style={sec}>
        <div style={{ ...maxW, maxWidth: 800 }}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(217,119,6,.08)", border: "1px solid rgba(217,119,6,.15)", padding: "6px 16px", borderRadius: 20 }}>
              <Shield size={14} style={{ color: "#d97706" }} />
              <span style={{ color: "#d97706", fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em" }}>Pearlie Guarantee</span>
            </span>
          </div>
          {sectionH2(<>Your safety net —<br />built into every plan</>)}
          <p style={{ color: "#6b7280", fontSize: 17, textAlign: "center", maxWidth: 560, margin: "0 auto 48px", lineHeight: 1.6 }}>
            The Pearlie Guarantee gives patients peace of mind — if they're not happy, they get a free credit towards their next clinic. This is fully funded by Pearlie, never by your clinic. The result? Patients book with more confidence, and your clinic gets more bookings.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 40 }} className="fc-zero-risk-grid">
            {[
              { icon: <Shield size={20} />, title: "No-show protection", desc: "If a matched patient doesn't attend their appointment, you are not charged. The risk is on us, not you." },
              { icon: <Check size={20} />, title: "Quality commitment", desc: "Every patient is pre-qualified through our intake. If the match quality isn't right, we'll make it right or credit your account." },
              { icon: <Heart size={20} />, title: "Free patient credit if unhappy", desc: "If a patient isn't happy with their experience, Pearlie gives them a free credit towards their next clinic booking. This is funded entirely by us — your clinic pays nothing. Patients book with confidence knowing they're protected." },
              { icon: <TrendingUp size={20} />, title: "Higher conversion rates", desc: "Because patients know they can get a free credit if things don't work out, they're far more likely to book in the first place. Clinics with the Guarantee see up to 30% more bookings." },
            ].map((card) => (
              <div key={card.title} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "28px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(217,119,6,.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706", marginBottom: 16 }}>{card.icon}</div>
                <h3 style={{ fontWeight: 700, color: "#1f2937", fontSize: 16, marginBottom: 8 }}>{card.title}</h3>
                <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.55 }}>{card.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ background: "rgba(217,119,6,.06)", border: "1px solid rgba(217,119,6,.15)", borderRadius: 16, padding: "28px 32px", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
              <Shield size={20} style={{ color: "#d97706" }} />
              <span style={{ ...heading, fontSize: 18, color: "#1f2937" }}>Why patients prefer clinics with the Guarantee</span>
            </div>
            <p style={{ color: "#6b7280", fontSize: 15, lineHeight: 1.6, maxWidth: 560, margin: "0 auto 16px" }}>
              Patients see the Guarantee badge and know they're protected: if they're not happy, Pearlie gives them a free credit towards another clinic — no questions asked. That safety net makes patients far more willing to book.
            </p>
            <p style={{ color: "#1f2937", fontSize: 14, fontWeight: 600, margin: "0 auto 20px" }}>
              The credit is always funded by Pearlie — your clinic is never charged.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24 }}>
              {[
                { value: "30%", label: "more bookings" },
                { value: "4.8\u2605", label: "avg clinic rating" },
                { value: "92%", label: "patient satisfaction" },
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: "center", minWidth: 100 }}>
                  <div style={{ ...heading, fontSize: 24, color: "#d97706" }}>{stat.value}</div>
                  <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2, fontWeight: 500 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ 12. FAQ ══════════ */}
      <section id="faq" className="fc-section" style={sec}>
        <div style={{ ...maxW, maxWidth: 720 }}>
          {sectionH2("Frequently asked questions")}
          <div style={{ marginTop: 48 }}>
            <FaqItem question="What counts as a matched patient?" answer="A matched patient is someone who has completed our full intake questionnaire and been matched to your clinic based on treatment fit, location, cost approach, and what they value. You receive their complete profile including anxiety level, concerns, budget mindset, and preferred times." />
            <FaqItem question="What if a patient doesn't show up?" answer="No-shows happen. You won't be charged for a patient who doesn't convert or doesn't attend. You only pay for matched patients delivered to you — what happens after is on us to improve, not on you to absorb." />
            <FaqItem question="How are patients matched to my clinic?" answer="Our matching engine scores patients against your clinic profile using treatment availability, location, clinical specialisms, anxiety accommodation, cost alignment, and the patient's stated priorities (e.g. 'clear pricing' or 'calm environment'). You only receive patients who are a genuine fit." />
            <FaqItem question="Can I cancel at any time?" answer="Yes. There are no contracts and no lock-in periods. You can cancel your subscription at any time and it will end at the close of your current billing cycle." />
            <FaqItem question="What data do I get about each patient?" answer="Every matched patient includes: treatment interest, anxiety level, cost approach (and budget preferences), conversion blockers/concerns, top clinic priorities, readiness/timing, preferred visit times, and location flexibility. This is the same data our intake questionnaire collects directly from patients." />
            <FaqItem question="Do I need to change anything about my practice?" answer="No. Pearlie works alongside your existing processes. We send you pre-qualified patients — you handle the consultation and booking as you normally would, just with much better information upfront." />
            <FaqItem question="What if I don't get any patients in a month?" answer="If we don't deliver any matched patients in a billing cycle, you won't be charged for extra bookings. Your base subscription covers availability on the platform and priority matching — but we're incentivised to deliver value, not just collect fees." />
          </div>
        </div>
      </section>

      {/* ══════════ 13. FINAL CTA ══════════ */}
      <section className="fc-section" style={{ padding: "100px 24px 140px", background: `linear-gradient(180deg, rgba(5,150,105,.04) 0%, rgba(8,13,27,0) 100%)`, textAlign: "center" }}>
        <div style={maxW}>
          <h2 style={{ ...heading, fontSize: "clamp(30px, 4.5vw, 52px)", marginBottom: 16, letterSpacing: "-0.03em", lineHeight: 1.1 }}>Ready for patients who<br />actually convert?</h2>
          <p style={{ color: "#6b7280", fontSize: 18, maxWidth: 520, margin: "0 auto 44px", lineHeight: 1.6 }}>Join Pearlie and start receiving pre-qualified patients — with the insights you need to close them.</p>
          <div className="fc-cta-btns" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16 }}>
            <Link href="/signup" style={greenBtn}>Join Pearlie — Free Setup <ArrowRight size={18} /></Link>
            <a href="mailto:hello@pearlie.org?subject=Pearlie demo request" style={outlineBtn}>Book a free demo</a>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 20 }}>
            {["No contracts", "No setup fee", "Cancel anytime"].map((item) => (
              <span key={item} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(5,150,105,.07)", border: "1px solid rgba(5,150,105,.2)", padding: "6px 14px", borderRadius: 20, color: "#047857", fontSize: 13, fontWeight: 600 }}>
                <Check size={13} /> {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ 14. FOOTER ══════════ */}
      <footer style={{ borderTop: `1px solid ${cardBorder}`, padding: "32px 24px", textAlign: "center" }}>
        <p style={{ color: "#6b7280", fontSize: 13 }}>&copy; {new Date().getFullYear()} Pearlie Health Ltd. All rights reserved.</p>
      </footer>
    </div>
  )
}
