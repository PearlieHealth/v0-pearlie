"use client"

import { useState } from "react"
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
  AlertCircle,
  Star,
  Stethoscope,
  Shield,
  Lock,
  Server,
  Quote,
} from "lucide-react"

/* ────────────────────────────────────────────
   TYPES & HELPERS
──────────────────────────────────────────── */
interface FaqItemProps {
  question: string
  answer: string
}

function MiniBar({ label, pct, highlight }: { label: string; pct: number; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: highlight ? "#f1f5f9" : "#64748b", fontWeight: highlight ? 600 : 400, width: 100, flexShrink: 0, textAlign: "right" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: highlight ? "linear-gradient(90deg, #10b981, #34d399)" : "rgba(255,255,255,.12)", transition: "width .3s" }} />
      </div>
    </div>
  )
}

function Tag({ label, active }: { label: string; active?: boolean }) {
  return (
    <span style={{ display: "inline-block", padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: active ? 600 : 400, background: active ? "rgba(16,185,129,.15)" : "rgba(255,255,255,.04)", color: active ? "#34d399" : "#64748b", border: `1px solid ${active ? "rgba(16,185,129,.25)" : "rgba(255,255,255,.06)"}`, lineHeight: 1.3 }}>
      {label}
    </span>
  )
}

function VisualInsightCard({ icon, title, question, children }: { icon: React.ReactNode; title: string; question: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, padding: "24px 22px 20px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(16,185,129,.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981", flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 14 }}>{title}</span>
      </div>
      <div style={{ flex: 1, marginBottom: 12 }}>{children}</div>
      <p style={{ color: "#475569", fontSize: 11, lineHeight: 1.4, marginTop: "auto" }}>
        From questionnaire: <span style={{ color: "#64748b" }}>{question}</span>
      </p>
    </div>
  )
}

function FaqItem({ question, answer }: FaqItemProps) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,.06)", padding: "22px 0" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", color: "#f1f5f9", fontWeight: 600, fontSize: 16, textAlign: "left", padding: 0, fontFamily: "inherit" }}
      >
        {question}
        <ChevronDown size={18} style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform .2s", color: "#64748b", flexShrink: 0, marginLeft: 16 }} />
      </button>
      {open && <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.7, marginTop: 12 }}>{answer}</p>}
    </div>
  )
}

/* ────────────────────────────────────────────
   CONSTANTS
──────────────────────────────────────────── */
const BASIC_PRIVATE_EXTRA = 30
const BASIC_MIXED_EXTRA = 30
const GROWTH_PRIVATE_EXTRA = 25
const GROWTH_MIXED_EXTRA = 25

/* ────────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────────── */
export default function ForClinicsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [practiceType, setPracticeType] = useState<"private" | "mixed">("private")

  const plans = {
    basicPrivate:  { base: 277, consults: 4, extraPrice: BASIC_PRIVATE_EXTRA },
    basicMixed:    { base: 287, consults: 4, extraPrice: BASIC_MIXED_EXTRA },
    growthPrivate: { base: 462, consults: 8, extraPrice: GROWTH_PRIVATE_EXTRA },
    growthMixed:   { base: 492, consults: 8, extraPrice: GROWTH_MIXED_EXTRA },
  }

  const basicPlan = practiceType === "private" ? plans.basicPrivate : plans.basicMixed
  const growthPlan = practiceType === "private" ? plans.growthPrivate : plans.growthMixed

  /* ── Shared style tokens ── */
  const sec = { padding: "120px 24px" } as const
  const secAlt = { ...sec, background: "rgba(255,255,255,.02)" } as const
  const maxW = { maxWidth: 1080, margin: "0 auto" } as const
  const heading = {
    fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
    fontWeight: 800,
    letterSpacing: "-0.025em",
    color: "#f8fafc",
  } as const
  const greenBtn = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "#10b981",
    color: "#030712",
    fontWeight: 700,
    fontSize: 16,
    border: "none",
    borderRadius: 12,
    padding: "16px 32px",
    cursor: "pointer",
    textDecoration: "none",
    transition: "background .15s",
  } as const
  const outlineBtn = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "transparent",
    color: "#f1f5f9",
    fontWeight: 600,
    fontSize: 15,
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 12,
    padding: "14px 28px",
    cursor: "pointer",
    textDecoration: "none",
    transition: "border-color .15s",
  } as const

  /* ── Section heading helper ── */
  const sectionLabel = (text: string) => (
    <p style={{ color: "#10b981", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, textAlign: "center" }}>
      {text}
    </p>
  )
  const sectionH2 = (text: string) => (
    <h2 style={{ ...heading, fontSize: "clamp(28px, 4.2vw, 44px)", textAlign: "center", marginBottom: 16, lineHeight: 1.1 }}>
      {text}
    </h2>
  )
  const sectionSub = (text: string, width = 560) => (
    <p style={{ color: "#94a3b8", fontSize: 17, textAlign: "center", maxWidth: width, margin: "0 auto 56px", lineHeight: 1.6 }}>
      {text}
    </p>
  )

  return (
    <div
      className="for-clinics"
      style={{
        background: "#030712",
        color: "#e2e8f0",
        minHeight: "100vh",
        fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* ── Mobile overrides ── */}
      <style>{`
        .fc-mobile-menu-btn { display: none !important; }
        .fc-mobile-dropdown { display: none !important; }
        @media (max-width: 640px) {
          .fc-nav-links { display: none !important; }
          .fc-mobile-menu-btn { display: flex !important; }
          .fc-mobile-dropdown[data-open="true"] {
            display: flex !important; flex-direction: column; position: absolute;
            top: 64px; left: 0; right: 0; background: rgba(3,7,18,.97);
            backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,.08);
            padding: 12px 24px 20px; gap: 0;
          }
          .fc-mobile-dropdown a { display: block; padding: 14px 0; color: #94a3b8; text-decoration: none; font-size: 16px; font-weight: 500; border-bottom: 1px solid rgba(255,255,255,.06); }
          .fc-mobile-dropdown a:last-child { border-bottom: none; }
          .fc-hero { padding-top: 100px !important; padding-bottom: 48px !important; }
          .fc-section { padding-top: 64px !important; padding-bottom: 64px !important; padding-left: 16px !important; padding-right: 16px !important; }
          .fc-stats-bar { gap: 16px !important; padding: 20px 16px !important; }
          .fc-stats-bar > div { min-width: 0 !important; flex: 1 1 40% !important; }
          .fc-cta-btns { flex-direction: column !important; align-items: stretch !important; }
          .fc-cta-btns > a, .fc-cta-btns > button { width: 100% !important; justify-content: center !important; text-align: center !important; }
          .fc-steps-grid { grid-template-columns: 1fr !important; }
          .fc-insights-grid { grid-template-columns: 1fr !important; }
          .fc-pricing-grid { grid-template-columns: 1fr !important; }
          .fc-pricing-grid > div { padding: 32px 20px !important; }
          .fc-testimonials-grid { grid-template-columns: 1fr !important; }
          .fc-guarantee-grid { grid-template-columns: 1fr 1fr !important; }
          .fc-compare-strip { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* ═══════════════════════════════════════════
         1. NAV
      ═══════════════════════════════════════════ */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(3,7,18,.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <div style={{ ...maxW, display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, padding: "0 24px" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ ...heading, fontSize: 22 }}>Pearlie</span>
          </Link>
          <div className="fc-nav-links" style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {[
              { href: "#how", label: "How it works" },
              { href: "#insights", label: "Insights" },
              { href: "#pricing", label: "Pricing" },
              { href: "#faq", label: "FAQ" },
            ].map((l) => (
              <a key={l.href} href={l.href} style={{ color: "#94a3b8", textDecoration: "none", fontSize: 13, fontWeight: 500, transition: "color .15s" }}>
                {l.label}
              </a>
            ))}
            <a href="#pricing" style={{ ...greenBtn, padding: "9px 20px", fontSize: 13, borderRadius: 10 }}>
              Get started
            </a>
          </div>
          <button className="fc-mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu" style={{ background: "none", border: "none", cursor: "pointer", color: "#f1f5f9", padding: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
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

      {/* ═══════════════════════════════════════════
         2. HERO — Netflix-inspired: dramatic, focused
      ═══════════════════════════════════════════ */}
      <section className="fc-hero fc-section" style={{ ...sec, paddingTop: 160, paddingBottom: 100, textAlign: "center" }}>
        <div style={maxW}>
          {/* Urgency badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.15)", borderRadius: 24, padding: "8px 20px", marginBottom: 28 }}>
            <span style={{ fontSize: 14 }}>&#9889;</span>
            <span style={{ color: "#fbbf24", fontSize: 13, fontWeight: 600 }}>
              Early-adopter pricing &mdash; limited spots in your area
            </span>
          </div>

          <h1 style={{ ...heading, fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1.05, letterSpacing: "-0.035em", marginBottom: 24 }}>
            Stop paying for clicks.
            <br />
            <span style={{ color: "#10b981" }}>Start receiving patients.</span>
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "clamp(17px, 2vw, 20px)", lineHeight: 1.6, maxWidth: 600, margin: "0 auto 44px" }}>
            Pearlie pre-qualifies patients &mdash; collecting their anxiety level, cost mindset, and treatment goals &mdash; then matches them to your clinic. You only see patients who are a genuine fit.
          </p>

          {/* Single focused CTA */}
          <div style={{ marginBottom: 64 }}>
            <a href="#pricing" style={greenBtn}>
              See pricing <ArrowRight size={18} />
            </a>
            <p style={{ color: "#475569", fontSize: 13, marginTop: 14 }}>
              No contracts &middot; No setup fee &middot; Cancel anytime
            </p>
          </div>

          {/* Stats strip */}
          <div className="fc-stats-bar" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 48, padding: "28px 32px", borderTop: "1px solid rgba(255,255,255,.06)", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
            {[
              { value: "92%", label: "avg match score" },
              { value: "8", label: "insights per patient" },
              { value: "< 72 hrs", label: "to first patient" },
              { value: "£0", label: "setup fee" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center", minWidth: 110 }}>
                <div style={{ ...heading, fontSize: 28, color: "#f8fafc" }}>{s.value}</div>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 4, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24, marginTop: 20 }}>
            {[
              { icon: <Shield size={13} />, label: "GDPR Compliant" },
              { icon: <Lock size={13} />, label: "End-to-End Encrypted" },
              { icon: <Server size={13} />, label: "UK Data Hosting" },
            ].map((b) => (
              <div key={b.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#475569", fontSize: 11, fontWeight: 500 }}>
                <span style={{ color: "#10b981", display: "flex" }}>{b.icon}</span>
                {b.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
         3. TESTIMONIALS — social proof immediately
      ═══════════════════════════════════════════ */}
      <section className="fc-section" style={secAlt}>
        <div style={maxW}>
          <div
            className="fc-testimonials-grid"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, maxWidth: 880, margin: "0 auto" }}
          >
            {[
              {
                name: "Daniel Saleem",
                practice: "London Dental Centre",
                quote: "Pearlie sends us patients who are genuinely ready for treatment \u2014 with full insight into their anxiety level, budget, and what they care about. It\u2019s transformed how we handle consultations.",
              },
              {
                name: "Hannan Imran",
                practice: "Siha Dental",
                quote: "We stopped spending thousands on Google Ads and started getting higher-quality patients through Pearlie. The patient profiles are incredibly detailed \u2014 our conversion rate has gone up significantly.",
              },
            ].map((t) => (
              <div key={t.name} style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 20, padding: "36px 30px", position: "relative" }}>
                <Quote size={28} style={{ color: "rgba(16,185,129,.1)", position: "absolute", top: 28, right: 28 }} />
                <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={14} fill="#fbbf24" style={{ color: "#fbbf24" }} />
                  ))}
                </div>
                <p style={{ color: "#cbd5e1", fontSize: 15, lineHeight: 1.7, marginBottom: 28, fontStyle: "italic" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #10b981, #34d399)", display: "flex", alignItems: "center", justifyContent: "center", color: "#030712", fontWeight: 800, fontSize: 15 }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <p style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 14 }}>{t.name}</p>
                    <p style={{ color: "#64748b", fontSize: 12 }}>{t.practice}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
         4. HOW IT WORKS — 3 steps with visuals
      ═══════════════════════════════════════════ */}
      <section id="how" className="fc-section" style={sec}>
        <div style={maxW}>
          {sectionLabel("How it works")}
          {sectionH2("Three steps. Zero wasted consultations.")}
          {sectionSub("Patients complete our intake, we match them to your clinic, and you receive a full profile — ready for a productive conversation.")}

          <div className="fc-steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {/* Step 01 — Intake questionnaire mockup */}
            <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, padding: "28px 24px", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(16,185,129,.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                  <FileText size={22} />
                </div>
                <span style={{ color: "#10b981", fontWeight: 800, fontSize: 13, letterSpacing: "0.04em" }}>STEP 01</span>
              </div>
              <h3 style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 18, marginBottom: 8 }}>Patient completes intake</h3>
              <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.55, marginBottom: 16 }}>
                Our questionnaire captures treatment needs, anxiety level, cost approach, concerns, values, and preferred timing.
              </p>
              <div style={{ background: "rgba(255,255,255,.04)", borderRadius: 12, padding: "16px 18px", flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
                    <div style={{ width: "75%", height: "100%", borderRadius: 2, background: "linear-gradient(90deg, #10b981, #34d399)" }} />
                  </div>
                  <span style={{ color: "#10b981", fontSize: 11, fontWeight: 600 }}>6/8</span>
                </div>
                <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 8, fontWeight: 500 }}>What matters most when choosing a clinic?</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { label: "Clear pricing before treatment", selected: true },
                    { label: "A calm, reassuring environment", selected: true },
                    { label: "Strong reputation and reviews", selected: false },
                  ].map((opt) => (
                    <div key={opt.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, background: opt.selected ? "rgba(16,185,129,.1)" : "rgba(255,255,255,.03)", border: `1px solid ${opt.selected ? "rgba(16,185,129,.25)" : "rgba(255,255,255,.06)"}` }}>
                      <div style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${opt.selected ? "#10b981" : "#475569"}`, background: opt.selected ? "#10b981" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {opt.selected && <Check size={9} style={{ color: "#030712" }} />}
                      </div>
                      <span style={{ fontSize: 11, color: opt.selected ? "#f1f5f9" : "#64748b" }}>{opt.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 02 — Matching */}
            <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, padding: "28px 24px", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(16,185,129,.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                  <Brain size={22} />
                </div>
                <span style={{ color: "#10b981", fontWeight: 800, fontSize: 13, letterSpacing: "0.04em" }}>STEP 02</span>
              </div>
              <h3 style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 18, marginBottom: 8 }}>Pearlie matches to your clinic</h3>
              <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.55, marginBottom: 16 }}>
                Our algorithm scores patients on clinical fit, treatment availability, cost alignment, and what they value most.
              </p>
              <div style={{ background: "rgba(255,255,255,.04)", borderRadius: 12, padding: "16px 18px", flex: 1 }}>
                <p style={{ color: "#64748b", fontSize: 11, marginBottom: 12, fontWeight: 500 }}>Match score breakdown</p>
                {[
                  { label: "Treatment fit", score: 95, color: "#10b981" },
                  { label: "Cost alignment", score: 88, color: "#34d399" },
                  { label: "Location", score: 82, color: "#6ee7b7" },
                  { label: "Clinic values match", score: 90, color: "#10b981" },
                ].map((m) => (
                  <div key={m.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "#94a3b8", fontSize: 11 }}>{m.label}</span>
                      <span style={{ color: m.color, fontSize: 11, fontWeight: 700 }}>{m.score}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
                      <div style={{ width: `${m.score}%`, height: "100%", borderRadius: 3, background: m.color }} />
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.06)" }}>
                  <span style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600 }}>Overall match</span>
                  <span style={{ ...heading, fontSize: 22, color: "#10b981" }}>92%</span>
                </div>
              </div>
            </div>

            {/* Step 03 — Patient profile */}
            <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, padding: "28px 24px", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(16,185,129,.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                  <Zap size={22} />
                </div>
                <span style={{ color: "#10b981", fontWeight: 800, fontSize: 13, letterSpacing: "0.04em" }}>STEP 03</span>
              </div>
              <h3 style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 18, marginBottom: 8 }}>You receive a matched patient</h3>
              <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.55, marginBottom: 16 }}>
                Full profile with all 8 data points — anxiety level, blockers, budget mindset, preferred times, and more.
              </p>
              <div style={{ background: "rgba(255,255,255,.04)", borderRadius: 12, padding: "16px 18px", flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #10b981, #34d399)", display: "flex", alignItems: "center", justifyContent: "center", color: "#030712", fontWeight: 800, fontSize: 13 }}>S</div>
                  <div>
                    <p style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600 }}>Sarah M.</p>
                    <p style={{ color: "#64748b", fontSize: 10 }}>Requested appointment</p>
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,.12)", padding: "3px 8px", borderRadius: 6 }}>92% match</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["Invisalign", "Quite anxious", "Flexible range", "Within a week", "Clear pricing", "Afternoons", "Up to 5 mi", "Cost concern"].map((label) => (
                    <span key={label} style={{ fontSize: 10, fontWeight: 500, padding: "3px 8px", borderRadius: 6, background: "rgba(16,185,129,.1)", color: "#34d399", border: "1px solid rgba(16,185,129,.2)" }}>{label}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Onboarding note */}
          <p style={{ textAlign: "center", color: "#64748b", fontSize: 13, marginTop: 40 }}>
            Setup takes under 5 minutes. Average time to first matched patient: <span style={{ color: "#10b981", fontWeight: 700 }}>&lt; 72 hours</span>
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
         5. PATIENT INSIGHTS — our differentiator
      ═══════════════════════════════════════════ */}
      <section id="insights" className="fc-section" style={secAlt}>
        <div style={maxW}>
          {sectionLabel("Patient intel")}
          {sectionH2("Know your patient before they walk in")}
          {sectionSub("Every matched patient includes 8 data points collected from our intake questionnaire. Here\u2019s what clinics see:")}

          <div className="fc-insights-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            <VisualInsightCard icon={<Heart size={16} />} title="Dental anxiety level" question="How do you feel about visiting the dentist?">
              <MiniBar label="Comfortable" pct={30} />
              <MiniBar label="A little nervous" pct={35} />
              <MiniBar label="Quite anxious" pct={55} highlight />
              <MiniBar label="Very anxious" pct={20} />
            </VisualInsightCard>

            <VisualInsightCard icon={<PoundSterling size={16} />} title="Cost approach" question="How do you think about investing in treatment?">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Tag label="Best outcome" />
                <Tag label="Understand value" active />
                <Tag label="Flexible range" active />
                <Tag label="Strict budget" />
              </div>
              <p style={{ color: "#64748b", fontSize: 12, marginTop: 10, lineHeight: 1.4 }}>Includes monthly payment preference and budget range when shared</p>
            </VisualInsightCard>

            <VisualInsightCard icon={<AlertCircle size={16} />} title="What's holding them back" question="Is there anything making you hesitate?">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Tag label="Cost concern" active />
                <Tag label="Needs time to decide" />
                <Tag label="Unsure which treatment" active />
                <Tag label="Complexity worry" />
                <Tag label="Past bad experience" />
                <Tag label="No concerns" />
              </div>
              <p style={{ color: "#64748b", fontSize: 12, marginTop: 10, lineHeight: 1.4 }}>Up to 2 selected per patient</p>
            </VisualInsightCard>

            <VisualInsightCard icon={<Star size={16} />} title="What they value in a clinic" question="What matters most when choosing a clinic?">
              {[
                { label: "Clear pricing", pct: 65, top: true },
                { label: "Calm environment", pct: 50, top: true },
                { label: "Specialist experience", pct: 45 },
                { label: "Good reviews", pct: 40 },
                { label: "Flexible hours", pct: 30 },
                { label: "Continuity of care", pct: 25 },
              ].map((v) => (
                <div key={v.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: v.top ? "#f1f5f9" : "#64748b", fontWeight: v.top ? 600 : 400, width: 120, flexShrink: 0, textAlign: "right" }}>{v.label}</span>
                  <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
                    <div style={{ width: `${v.pct}%`, height: "100%", borderRadius: 4, background: v.top ? "linear-gradient(90deg, #10b981, #34d399)" : "rgba(255,255,255,.12)" }} />
                  </div>
                </div>
              ))}
              <p style={{ color: "#64748b", fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>Each patient picks their top 2 priorities</p>
            </VisualInsightCard>

            <VisualInsightCard icon={<Clock size={16} />} title="How ready they are" question="When are you looking to start treatment?">
              <div style={{ display: "flex", alignItems: "stretch", gap: 0, marginBottom: 8 }}>
                {[
                  { label: "ASAP", color: "#10b981" },
                  { label: "This week", color: "#34d399" },
                  { label: "Few weeks", color: "#6ee7b7" },
                  { label: "Exploring", color: "#475569" },
                ].map((t, i) => (
                  <div key={t.label} style={{ flex: 1, textAlign: "center", padding: "12px 4px", background: `${t.color}15`, borderLeft: i > 0 ? "1px solid rgba(255,255,255,.04)" : undefined, borderRadius: i === 0 ? "10px 0 0 10px" : i === 3 ? "0 10px 10px 0" : undefined }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.color, margin: "0 auto 6px" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: t.color }}>{t.label}</span>
                  </div>
                ))}
              </div>
              <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.4 }}>Emergency patients show same-day / next-day urgency</p>
            </VisualInsightCard>

            <VisualInsightCard icon={<Stethoscope size={16} />} title="Treatment interest" question="What treatment are you looking for?">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Tag label="Invisalign" active />
                <Tag label="Whitening" />
                <Tag label="Composite Bonding" active />
                <Tag label="Veneers" />
                <Tag label="Implants" />
                <Tag label="Check-up & Clean" />
                <Tag label="Emergency" />
              </div>
              <p style={{ color: "#64748b", fontSize: 12, marginTop: 10, lineHeight: 1.4 }}>Patients can select multiple treatments</p>
            </VisualInsightCard>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
         6. PRICING — comparison strip + plans + guarantees
      ═══════════════════════════════════════════ */}
      <section id="pricing" className="fc-section" style={sec}>
        <div style={maxW}>
          {sectionLabel("Pricing")}
          {sectionH2("Simple, transparent plans")}

          {/* Comparison strip — Pearlie vs Traditional */}
          <div className="fc-compare-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, maxWidth: 800, margin: "0 auto 56px" }}>
            {[
              { label: "Traditional marketing", value: "£2,300 – £7,000/mo", color: "#f87171" },
              { label: "Pearlie", value: "From £277/mo", color: "#10b981" },
              { label: "Time to first patient", value: "< 72 hours", color: "#10b981" },
              { label: "Contract", value: "None. Cancel anytime", color: "#10b981" },
            ].map((c) => (
              <div key={c.label} style={{ textAlign: "center", padding: "20px 12px", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14 }}>
                <p style={{ color: "#64748b", fontSize: 11, fontWeight: 500, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{c.label}</p>
                <p style={{ color: c.color, fontWeight: 700, fontSize: 15 }}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Practice type toggle */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 48 }}>
            <div style={{ display: "inline-flex", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: 4 }}>
              {(["private", "mixed"] as const).map((t) => (
                <button key={t} onClick={() => setPracticeType(t)} style={{ padding: "10px 24px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "all .2s", background: practiceType === t ? "#10b981" : "transparent", color: practiceType === t ? "#030712" : "#94a3b8" }}>
                  {t === "private" ? "Private Clinic" : "Mixed Practice"}
                </button>
              ))}
            </div>
          </div>

          {/* Plan cards */}
          <div className="fc-pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, maxWidth: 800, margin: "0 auto" }}>
            {/* Basic */}
            <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: "40px 32px" }}>
              <p style={{ color: "#94a3b8", fontWeight: 600, fontSize: 14, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Basic</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                <span style={{ ...heading, fontSize: 48 }}>&pound;{basicPlan.base}</span>
                <span style={{ color: "#64748b", fontSize: 16 }}>/month</span>
              </div>
              <p style={{ color: "#64748b", fontSize: 14, marginBottom: 28 }}>
                {practiceType === "private" ? "4 private consults included" : "4 private consults + unlimited NHS"}
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px" }}>
                {[
                  "4 private consult credits / month",
                  ...(practiceType === "mixed" ? ["Unlimited NHS enquiries"] : []),
                  "Additional consults £30 each",
                  "Deep patient insights on every referral",
                  "Full dashboard & live chat",
                  "Appointment management",
                  "Integrated with CRM",
                  "AI intake matching",
                  "Automated reminders",
                  ...(practiceType === "mixed" ? ["NHS vs private patient tagging", "AI triage routing"] : ["Self-training onboarding portal"]),
                ].map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0", color: item.toLowerCase().includes("patient insights") ? "#f1f5f9" : "#cbd5e1", fontSize: 14, fontWeight: item.toLowerCase().includes("patient insights") ? 600 : 400 }}>
                    <Check size={16} style={{ color: item.toLowerCase().includes("patient insights") ? "#34d399" : "#10b981", flexShrink: 0, marginTop: 2 }} />
                    <span>
                      {item}
                      {item.toLowerCase().includes("patient insights") && (
                        <span style={{ display: "block", color: "#64748b", fontSize: 12, fontWeight: 400, marginTop: 2 }}>
                          Anxiety level, cost mindset, treatment goals &amp; priorities
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/signup" style={{ ...greenBtn, width: "100%", justifyContent: "center" }}>
                Get started &mdash; free setup <ArrowRight size={18} />
              </Link>
            </div>

            {/* Growth */}
            <div style={{ background: "rgba(16,185,129,.04)", border: "2px solid rgba(16,185,129,.2)", borderRadius: 20, padding: "40px 32px", position: "relative" }}>
              <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#10b981", color: "#030712", fontWeight: 700, fontSize: 12, padding: "5px 16px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.04em" }}>Best value</div>
              <p style={{ color: "#10b981", fontWeight: 600, fontSize: 14, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Growth</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                <span style={{ ...heading, fontSize: 48 }}>&pound;{growthPlan.base}</span>
                <span style={{ color: "#64748b", fontSize: 16 }}>/month</span>
              </div>
              <p style={{ color: "#64748b", fontSize: 14, marginBottom: 28 }}>
                {practiceType === "private" ? "8 private consults included" : "8 private consults + unlimited NHS"}
              </p>

              {/* Everything in Basic badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.15)", borderRadius: 10, padding: "10px 14px", marginBottom: 20 }}>
                <Check size={16} style={{ color: "#34d399", flexShrink: 0 }} />
                <span style={{ color: "#34d399", fontSize: 14, fontWeight: 700 }}>Everything in Basic, plus:</span>
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px" }}>
                {[
                  "8 private consult credits / month",
                  ...(practiceType === "mixed" ? ["Unlimited NHS enquiries"] : []),
                  "Additional consults £25 each (vs £30)",
                  "Priority patient insights & scoring",
                  "Priority matching & featured placement",
                  "Advanced dashboard",
                  "Integrated with CRM + pipeline tracking",
                  "Conversion analytics & revenue forecasting",
                  "AI follow-up automation",
                  "Multi-user access",
                  ...(practiceType === "mixed" ? ["Chair-fill optimisation tools", "NHS vs private revenue breakdown", "AI conversion nudges & upsell tracking"] : []),
                  "Quarterly growth review",
                ].map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0", color: item.toLowerCase().includes("patient insights") ? "#f1f5f9" : "#cbd5e1", fontSize: 14, fontWeight: item.toLowerCase().includes("patient insights") ? 600 : 400 }}>
                    <Check size={16} style={{ color: item.toLowerCase().includes("patient insights") ? "#34d399" : "#10b981", flexShrink: 0, marginTop: 2 }} />
                    <span>
                      {item}
                      {item.toLowerCase().includes("patient insights") && (
                        <span style={{ display: "block", color: "#64748b", fontSize: 12, fontWeight: 400, marginTop: 2 }}>
                          Deep behavioural data, anxiety scores, cost alignment &amp; intent signals
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <a href="mailto:hello@pearlie.org?subject=Pearlie Growth — clinic enquiry" style={{ ...greenBtn, width: "100%", justifyContent: "center" }}>
                Contact sales <ArrowRight size={18} />
              </a>
            </div>
          </div>

          {/* Guarantee strip */}
          <div className="fc-guarantee-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, maxWidth: 800, margin: "40px auto 0" }}>
            {[
              { q: "Patient no-show?", a: "No charge" },
              { q: "No patients this month?", a: "No extra fee" },
              { q: "Want to cancel?", a: "Anytime" },
              { q: "Not happy?", a: "We\u2019ll make it right" },
            ].map((c) => (
              <div key={c.q} style={{ textAlign: "center", padding: "20px 12px", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14 }}>
                <p style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>{c.q}</p>
                <p style={{ color: "#10b981", fontWeight: 700, fontSize: 14 }}>{c.a}</p>
              </div>
            ))}
          </div>

          {/* Demo CTA */}
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 14 }}>Not ready to commit?</p>
            <a href="mailto:hello@pearlie.org?subject=Pearlie demo request" style={{ ...outlineBtn, borderColor: "rgba(16,185,129,.25)", color: "#10b981" }}>
              Book a free demo <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
         7. FAQ
      ═══════════════════════════════════════════ */}
      <section id="faq" className="fc-section" style={secAlt}>
        <div style={{ ...maxW, maxWidth: 720 }}>
          {sectionH2("Frequently asked questions")}
          <div style={{ marginTop: 48 }}>
            <FaqItem
              question="What counts as a matched patient?"
              answer="A matched patient is someone who has completed our full intake questionnaire and been matched to your clinic based on treatment fit, location, cost approach, and what they value. You receive their complete profile including anxiety level, concerns, budget mindset, and preferred times."
            />
            <FaqItem
              question="What if a patient doesn't show up?"
              answer="No-shows happen. You won't be charged for a patient who doesn't convert or doesn't attend. You only pay for matched patients delivered to you — what happens after is on us to improve, not on you to absorb."
            />
            <FaqItem
              question="How are patients matched to my clinic?"
              answer="Our matching engine scores patients against your clinic profile using treatment availability, location, clinical specialisms, anxiety accommodation, cost alignment, and the patient's stated priorities (e.g. 'clear pricing' or 'calm environment'). You only receive patients who are a genuine fit."
            />
            <FaqItem
              question="Can I cancel at any time?"
              answer="Yes. There are no contracts and no lock-in periods. You can cancel your subscription at any time and it will end at the close of your current billing cycle."
            />
            <FaqItem
              question="What data do I get about each patient?"
              answer="Every matched patient includes: treatment interest, anxiety level, cost approach (and budget preferences), conversion blockers/concerns, top clinic priorities, readiness/timing, preferred visit times, and location flexibility. This is the same data our intake questionnaire collects directly from patients."
            />
            <FaqItem
              question="Do I need to change anything about my practice?"
              answer="No. Pearlie works alongside your existing processes. We send you pre-qualified patients — you handle the consultation and booking as you normally would, just with much better information upfront."
            />
            <FaqItem
              question="What if I don't get any patients in a month?"
              answer="If we don't deliver any matched patients in a billing cycle, you won't be charged for extra consults. Your base subscription covers availability on the platform and priority matching — but we're incentivised to deliver value, not just collect fees."
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
         8. FINAL CTA
      ═══════════════════════════════════════════ */}
      <section
        className="fc-section"
        style={{
          padding: "100px 24px 140px",
          background: "linear-gradient(180deg, rgba(16,185,129,.04) 0%, rgba(3,7,18,0) 100%)",
          textAlign: "center",
        }}
      >
        <div style={maxW}>
          <h2 style={{ ...heading, fontSize: "clamp(30px, 4.5vw, 52px)", marginBottom: 16, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            Ready for patients who<br />actually convert?
          </h2>
          <p style={{ color: "#94a3b8", fontSize: 18, maxWidth: 520, margin: "0 auto 44px", lineHeight: 1.6 }}>
            Join Pearlie and start receiving pre-qualified patients — with the insights you need to close them.
          </p>
          <div className="fc-cta-btns" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16 }}>
            <Link href="/signup" style={greenBtn}>
              Join Pearlie &mdash; Free Setup <ArrowRight size={18} />
            </Link>
            <a href="mailto:hello@pearlie.org?subject=Pearlie demo request" style={outlineBtn}>
              Book a free demo
            </a>
          </div>
          <p style={{ color: "#475569", fontSize: 13, marginTop: 16 }}>
            No contracts &middot; No setup fee &middot; Cancel anytime
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
         9. FOOTER
      ═══════════════════════════════════════════ */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: "32px 24px", textAlign: "center" }}>
        <p style={{ color: "#475569", fontSize: 13 }}>
          &copy; {new Date().getFullYear()} Pearlie Health Ltd. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
