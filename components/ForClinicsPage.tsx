"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Check,
  X,
  ChevronDown,
  Zap,
  Users,
  FileText,
  Brain,
  PoundSterling,
  Shield,
  Clock,
  Heart,
  MapPin,
  AlertCircle,
  Star,
  Calendar,
  Stethoscope,
  TrendingUp,
} from "lucide-react"

/* ────────────────────────────────────────────
   TYPES
──────────────────────────────────────────── */
interface InsightCardProps {
  icon: React.ReactNode
  title: string
  example: string
  detail: string
}

interface FaqItemProps {
  question: string
  answer: string
}

/* ────────────────────────────────────────────
   SMALL SUB-COMPONENTS
──────────────────────────────────────────── */
function InsightCard({ icon, title, example, detail }: InsightCardProps) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,.03)",
        border: "1px solid rgba(255,255,255,.06)",
        borderRadius: 16,
        padding: "28px 24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "rgba(16,185,129,.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#10b981",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 15 }}>{title}</span>
      </div>
      <p
        style={{
          fontStyle: "italic",
          color: "#94a3b8",
          fontSize: 14,
          lineHeight: 1.6,
          marginBottom: 10,
        }}
      >
        &ldquo;{example}&rdquo;
      </p>
      <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>{detail}</p>
    </div>
  )
}

function FaqItem({ question, answer }: FaqItemProps) {
  const [open, setOpen] = useState(false)
  return (
    <div
      style={{
        borderBottom: "1px solid rgba(255,255,255,.06)",
        padding: "20px 0",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#f1f5f9",
          fontWeight: 600,
          fontSize: 16,
          textAlign: "left",
          padding: 0,
          fontFamily: "inherit",
        }}
      >
        {question}
        <ChevronDown
          size={18}
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0)",
            transition: "transform .2s",
            color: "#64748b",
            flexShrink: 0,
            marginLeft: 16,
          }}
        />
      </button>
      {open && (
        <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.7, marginTop: 12 }}>{answer}</p>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────
   CONSTANTS
──────────────────────────────────────────── */
const EXTRA_LEAD_PRICE = 35
const DEFAULT_LTV = 1000
const DEFAULT_EXTRA = 5

/* ────────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────────── */
export default function ForClinicsPage() {
  /* ROI calculator state */
  const [extra, setExtra] = useState(DEFAULT_EXTRA)
  const [ltv, setLtv] = useState(DEFAULT_LTV)

  const stdBase = 287
  const stdFreeLeads = 3
  const premBase = 450
  const premFreeLeads = 5

  const monthlyRevenue = useCallback(
    (base: number, freeLeads: number) => {
      const totalLeads = freeLeads + extra
      const totalCost = base + extra * EXTRA_LEAD_PRICE
      const revenue = totalLeads * ltv
      const roi = revenue - totalCost
      return { totalLeads, totalCost, revenue, roi }
    },
    [extra, ltv],
  )

  const stdCalc = monthlyRevenue(stdBase, stdFreeLeads)
  const premCalc = monthlyRevenue(premBase, premFreeLeads)

  /* Shared inline style helpers */
  const sectionPad = { padding: "96px 24px" } as const
  const maxW = { maxWidth: 1120, margin: "0 auto" } as const
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
      {/* ═══════════ NAV ═══════════ */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: "rgba(3,7,18,.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,.06)",
        }}
      >
        <div
          style={{
            ...maxW,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 64,
            padding: "0 24px",
          }}
        >
          <Link href="/" style={{ textDecoration: "none" }}>
            <span
              style={{
                fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
                fontWeight: 800,
                fontSize: 22,
                color: "#f1f5f9",
                letterSpacing: "-0.02em",
              }}
            >
              Pearly
            </span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <a href="#how" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
              How it works
            </a>
            <a href="#insights" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
              Insights
            </a>
            <a href="#pricing" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
              Pricing
            </a>
            <a href="#faq" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
              FAQ
            </a>
          </div>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section style={{ ...sectionPad, paddingTop: 160, paddingBottom: 80, textAlign: "center" }}>
        <div style={maxW}>
          <p
            style={{
              color: "#10b981",
              fontWeight: 700,
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 20,
            }}
          >
            For Dental Clinics
          </p>
          <h1
            style={{
              fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(36px, 5.5vw, 64px)",
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              color: "#f8fafc",
              marginBottom: 24,
            }}
          >
            Stop paying for clicks.
            <br />
            <span style={{ color: "#10b981" }}>Start receiving patients.</span>
          </h1>
          <p
            style={{
              color: "#94a3b8",
              fontSize: "clamp(17px, 2vw, 20px)",
              lineHeight: 1.6,
              maxWidth: 640,
              margin: "0 auto 40px",
            }}
          >
            Pearly pre-qualifies patients&mdash;collecting their anxiety level, cost mindset,
            treatment goals, and what they value in a clinic&mdash;then matches them to you.
            You only see patients who are a genuine fit.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16, marginBottom: 56 }}>
            <a href="#pricing" style={greenBtn}>
              See pricing <ArrowRight size={18} />
            </a>
            <a href="#how" style={outlineBtn}>
              How it works
            </a>
          </div>

          {/* Stats bar */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 40,
              padding: "28px 32px",
              background: "rgba(255,255,255,.03)",
              border: "1px solid rgba(255,255,255,.06)",
              borderRadius: 16,
            }}
          >
            {[
              { value: "8", label: "data points per patient" },
              { value: "0", label: "setup fee" },
              { value: "£35", label: "per extra lead" },
              { value: "No lock-in", label: "cancel anytime" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center", minWidth: 120 }}>
                <div
                  style={{
                    fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
                    fontWeight: 800,
                    fontSize: 28,
                    color: "#10b981",
                  }}
                >
                  {s.value}
                </div>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section id="how" style={{ ...sectionPad, background: "rgba(255,255,255,.015)" }}>
        <div style={maxW}>
          <p
            style={{
              color: "#10b981",
              fontWeight: 700,
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            How it works
          </p>
          <h2
            style={{
              fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(28px, 4vw, 42px)",
              color: "#f8fafc",
              textAlign: "center",
              marginBottom: 56,
              letterSpacing: "-0.02em",
            }}
          >
            Three steps. Zero wasted consultations.
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            {[
              {
                step: "01",
                icon: <FileText size={22} />,
                title: "Patient completes intake",
                desc: "Our questionnaire captures treatment needs, anxiety level, cost approach, concerns, values, and preferred timing — before any clinic contact.",
              },
              {
                step: "02",
                icon: <Brain size={22} />,
                title: "Pearly matches to your clinic",
                desc: "Our algorithm matches patients based on clinical fit, treatment availability, cost alignment, and what the patient said they value most in a clinic.",
              },
              {
                step: "03",
                icon: <Zap size={22} />,
                title: "You receive a qualified lead",
                desc: "You get the patient's profile with all 8 data points — their anxiety level, blockers, budget mindset, preferred times, and more. Ready for a productive consultation.",
              },
            ].map((item) => (
              <div
                key={item.step}
                style={{
                  background: "rgba(255,255,255,.03)",
                  border: "1px solid rgba(255,255,255,.06)",
                  borderRadius: 16,
                  padding: "32px 28px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: "rgba(16,185,129,.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#10b981",
                    }}
                  >
                    {item.icon}
                  </div>
                  <span style={{ color: "#10b981", fontWeight: 800, fontSize: 14 }}>
                    STEP {item.step}
                  </span>
                </div>
                <h3
                  style={{
                    fontWeight: 700,
                    color: "#f1f5f9",
                    fontSize: 18,
                    marginBottom: 10,
                  }}
                >
                  {item.title}
                </h3>
                <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.65 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ PATIENT INSIGHTS ═══════════ */}
      <section id="insights" style={sectionPad}>
        <div style={maxW}>
          <p
            style={{
              color: "#10b981",
              fontWeight: 700,
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Patient Intel
          </p>
          <h2
            style={{
              fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(28px, 4vw, 42px)",
              color: "#f8fafc",
              textAlign: "center",
              marginBottom: 16,
              letterSpacing: "-0.02em",
            }}
          >
            Know your patient before they walk in
          </h2>
          <p
            style={{
              color: "#94a3b8",
              fontSize: 17,
              textAlign: "center",
              maxWidth: 600,
              margin: "0 auto 48px",
              lineHeight: 1.6,
            }}
          >
            Every lead comes with these data points — collected directly from the patient during our
            intake questionnaire.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 18,
            }}
          >
            <InsightCard
              icon={<Heart size={18} />}
              title="Dental anxiety level"
              example="Quite anxious — I'd appreciate a gentle approach"
              detail="4 levels from 'Comfortable with dental visits' to 'Very anxious — may need sedation or extra support'. Helps you prepare the right environment."
            />
            <InsightCard
              icon={<PoundSterling size={18} />}
              title="Cost approach"
              example="I have a rough comfort range, but I'm flexible if the plan makes sense"
              detail="Ranges from 'Best possible result regardless of cost' to 'Strict budget I need to stay within'. Includes monthly payment preferences when relevant."
            />
            <InsightCard
              icon={<AlertCircle size={18} />}
              title="What's holding them back"
              example="I'm unsure how much this might cost and whether it's the right investment"
              detail="Up to 2 conversion blockers: cost uncertainty, needing time to decide, unsure which treatment, complexity concerns, or past bad experience."
            />
            <InsightCard
              icon={<Star size={18} />}
              title="What they value in a clinic"
              example="Clear pricing before treatment"
              detail="Top 2 priorities from: specialist experience, flexible hours, clear pricing, calm environment, strong reviews, or continuity of care."
            />
            <InsightCard
              icon={<Clock size={18} />}
              title="How ready they are"
              example="Within a week"
              detail="Readiness from 'As soon as possible' to 'Just exploring for now'. Emergency patients specify same-day or next-day urgency."
            />
            <InsightCard
              icon={<Calendar size={18} />}
              title="Preferred visit times"
              example="Late afternoons or weekends"
              detail="Morning (before 12pm), afternoon (12pm–5pm), or weekends. Match leads to your available slots before reaching out."
            />
            <InsightCard
              icon={<Stethoscope size={18} />}
              title="Treatment interest"
              example="Invisalign / Clear Aligners, Composite Bonding"
              detail="Specific treatments selected from: Invisalign, whitening, bonding, veneers, implants, check-ups, or emergency dental issues."
            />
            <InsightCard
              icon={<MapPin size={18} />}
              title="Location flexibility"
              example="Willing to travel a bit — up to 5 miles"
              detail="3 levels: close to home/work (1.5 mi), willing to travel (5 mi), or happy to travel further for the right clinic."
            />
          </div>
        </div>
      </section>

      {/* ═══════════ COMPARISON TABLE ═══════════ */}
      <section style={{ ...sectionPad, background: "rgba(255,255,255,.015)" }}>
        <div style={maxW}>
          <h2
            style={{
              fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(28px, 4vw, 42px)",
              color: "#f8fafc",
              textAlign: "center",
              marginBottom: 48,
              letterSpacing: "-0.02em",
            }}
          >
            Pearly vs everything else
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: 700,
                borderCollapse: "separate",
                borderSpacing: 0,
                fontSize: 15,
              }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "16px 20px", color: "#64748b", fontWeight: 600, fontSize: 13, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                    &nbsp;
                  </th>
                  <th style={{ textAlign: "center", padding: "16px 20px", color: "#10b981", fontWeight: 700, fontSize: 14, borderBottom: "2px solid #10b981", background: "rgba(16,185,129,.06)", borderRadius: "12px 12px 0 0" }}>
                    Pearly
                  </th>
                  <th style={{ textAlign: "center", padding: "16px 20px", color: "#64748b", fontWeight: 600, fontSize: 13, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                    Google Ads
                  </th>
                  <th style={{ textAlign: "center", padding: "16px 20px", color: "#64748b", fontWeight: 600, fontSize: 13, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                    Directories
                  </th>
                  <th style={{ textAlign: "center", padding: "16px 20px", color: "#64748b", fontWeight: 600, fontSize: 13, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                    Agencies
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Pre-qualified patients", pearly: true, google: false, directories: false, agencies: false },
                  { feature: "Patient anxiety & concerns shared", pearly: true, google: false, directories: false, agencies: false },
                  { feature: "Cost mindset known upfront", pearly: true, google: false, directories: false, agencies: false },
                  { feature: "No wasted ad spend", pearly: true, google: false, directories: true, agencies: false },
                  { feature: "No contract lock-in", pearly: true, google: true, directories: false, agencies: false },
                  { feature: "Under £300/month entry", pearly: true, google: false, directories: true, agencies: false },
                  { feature: "Patient intent data included", pearly: true, google: false, directories: false, agencies: false },
                  { feature: "No-show? No charge", pearly: true, google: false, directories: false, agencies: false },
                ].map((row) => (
                  <tr key={row.feature}>
                    <td
                      style={{
                        padding: "14px 20px",
                        color: "#cbd5e1",
                        fontWeight: 500,
                        borderBottom: "1px solid rgba(255,255,255,.04)",
                      }}
                    >
                      {row.feature}
                    </td>
                    {[row.pearly, row.google, row.directories, row.agencies].map((val, i) => (
                      <td
                        key={i}
                        style={{
                          textAlign: "center",
                          padding: "14px 20px",
                          borderBottom: "1px solid rgba(255,255,255,.04)",
                          background: i === 0 ? "rgba(16,185,129,.03)" : undefined,
                        }}
                      >
                        {val ? (
                          <Check size={18} style={{ color: "#10b981", margin: "0 auto" }} />
                        ) : (
                          <X size={18} style={{ color: "#475569", margin: "0 auto" }} />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═══════════ ROI CALCULATOR ═══════════ */}
      <section style={sectionPad}>
        <div style={{ ...maxW, maxWidth: 720 }}>
          <h2
            style={{
              fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(28px, 4vw, 42px)",
              color: "#f8fafc",
              textAlign: "center",
              marginBottom: 12,
              letterSpacing: "-0.02em",
            }}
          >
            Your return, calculated
          </h2>
          <p
            style={{
              color: "#94a3b8",
              fontSize: 17,
              textAlign: "center",
              marginBottom: 48,
              lineHeight: 1.6,
            }}
          >
            Adjust the sliders to match your practice.
          </p>

          <div
            style={{
              background: "rgba(255,255,255,.03)",
              border: "1px solid rgba(255,255,255,.06)",
              borderRadius: 20,
              padding: "36px 32px",
            }}
          >
            {/* Extra leads slider */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ color: "#94a3b8", fontSize: 14, fontWeight: 500 }}>Extra leads / month</span>
                <span style={{ color: "#10b981", fontWeight: 700, fontSize: 16 }}>{extra}</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                value={extra}
                onChange={(e) => setExtra(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            {/* LTV slider */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ color: "#94a3b8", fontSize: 14, fontWeight: 500 }}>Avg patient lifetime value</span>
                <span style={{ color: "#10b981", fontWeight: 700, fontSize: 16 }}>
                  &pound;{ltv.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min={200}
                max={5000}
                step={100}
                value={ltv}
                onChange={(e) => setLtv(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            {/* Results */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              {/* Standard */}
              <div
                style={{
                  background: "rgba(255,255,255,.03)",
                  borderRadius: 14,
                  padding: "24px 20px",
                  border: "1px solid rgba(255,255,255,.06)",
                }}
              >
                <p style={{ color: "#64748b", fontSize: 13, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Standard Plan
                </p>
                <p style={{ color: "#f1f5f9", fontSize: 14, marginBottom: 4 }}>
                  {stdCalc.totalLeads} patients &times; &pound;{ltv.toLocaleString()} LTV
                </p>
                <p style={{ color: "#64748b", fontSize: 13, marginBottom: 12 }}>
                  Cost: &pound;{stdCalc.totalCost}/mo
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
                    fontWeight: 800,
                    fontSize: 28,
                    color: "#10b981",
                  }}
                >
                  &pound;{stdCalc.roi.toLocaleString()}
                </p>
                <p style={{ color: "#64748b", fontSize: 12 }}>potential monthly return</p>
              </div>

              {/* Premium */}
              <div
                style={{
                  background: "rgba(255,255,255,.03)",
                  borderRadius: 14,
                  padding: "24px 20px",
                  border: "1px solid rgba(16,185,129,.15)",
                }}
              >
                <p style={{ color: "#10b981", fontSize: 13, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Premium Plan
                </p>
                <p style={{ color: "#f1f5f9", fontSize: 14, marginBottom: 4 }}>
                  {premCalc.totalLeads} patients &times; &pound;{ltv.toLocaleString()} LTV
                </p>
                <p style={{ color: "#64748b", fontSize: 13, marginBottom: 12 }}>
                  Cost: &pound;{premCalc.totalCost}/mo
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
                    fontWeight: 800,
                    fontSize: 28,
                    color: "#10b981",
                  }}
                >
                  &pound;{premCalc.roi.toLocaleString()}
                </p>
                <p style={{ color: "#64748b", fontSize: 12 }}>potential monthly return</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ PRICING ═══════════ */}
      <section id="pricing" style={{ ...sectionPad, background: "rgba(255,255,255,.015)" }}>
        <div style={maxW}>
          <p
            style={{
              color: "#10b981",
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
          <h2
            style={{
              fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(28px, 4vw, 42px)",
              color: "#f8fafc",
              textAlign: "center",
              marginBottom: 16,
              letterSpacing: "-0.02em",
            }}
          >
            Simple, transparent plans
          </h2>
          <p
            style={{
              color: "#94a3b8",
              fontSize: 17,
              textAlign: "center",
              maxWidth: 540,
              margin: "0 auto 48px",
              lineHeight: 1.6,
            }}
          >
            No setup fees. No contracts. No surprises. Cancel anytime.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 24,
              maxWidth: 800,
              margin: "0 auto",
            }}
          >
            {/* Standard */}
            <div
              style={{
                background: "rgba(255,255,255,.03)",
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 20,
                padding: "40px 32px",
              }}
            >
              <p style={{ color: "#94a3b8", fontWeight: 600, fontSize: 14, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Standard
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                <span
                  style={{
                    fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
                    fontWeight: 800,
                    fontSize: 48,
                    color: "#f8fafc",
                  }}
                >
                  &pound;287
                </span>
                <span style={{ color: "#64748b", fontSize: 16 }}>/month</span>
              </div>
              <p style={{ color: "#64748b", fontSize: 14, marginBottom: 28 }}>
                3 matched patients included
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px" }}>
                {[
                  "3 pre-qualified patient leads",
                  "Full patient intent profile",
                  "Extra leads at £35 each",
                  "No setup fee",
                  "Cancel anytime",
                  "No-show? No charge",
                ].map((item) => (
                  <li
                    key={item}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 0",
                      color: "#cbd5e1",
                      fontSize: 15,
                    }}
                  >
                    <Check size={16} style={{ color: "#10b981", flexShrink: 0 }} />
                    {item}
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
                Get started &mdash; free setup <ArrowRight size={18} />
              </Link>
            </div>

            {/* Premium */}
            <div
              style={{
                background: "rgba(16,185,129,.06)",
                border: "2px solid rgba(16,185,129,.25)",
                borderRadius: 20,
                padding: "40px 32px",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -14,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#10b981",
                  color: "#030712",
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
              <p style={{ color: "#10b981", fontWeight: 600, fontSize: 14, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Premium
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                <span
                  style={{
                    fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
                    fontWeight: 800,
                    fontSize: 48,
                    color: "#f8fafc",
                  }}
                >
                  &pound;450
                </span>
                <span style={{ color: "#64748b", fontSize: 16 }}>/month</span>
              </div>
              <p style={{ color: "#64748b", fontSize: 14, marginBottom: 28 }}>
                5 matched patients included
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px" }}>
                {[
                  "5 pre-qualified patient leads",
                  "Full patient intent profile",
                  "Extra leads at £35 each",
                  "Priority matching",
                  "Dedicated onboarding call",
                  "No-show? No charge",
                ].map((item) => (
                  <li
                    key={item}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 0",
                      color: "#cbd5e1",
                      fontSize: 15,
                    }}
                  >
                    <Check size={16} style={{ color: "#10b981", flexShrink: 0 }} />
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="mailto:hello@pearlie.org?subject=Pearly Premium — clinic enquiry"
                style={{
                  ...greenBtn,
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                Contact sales <ArrowRight size={18} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section id="faq" style={sectionPad}>
        <div style={{ ...maxW, maxWidth: 720 }}>
          <h2
            style={{
              fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(28px, 4vw, 42px)",
              color: "#f8fafc",
              textAlign: "center",
              marginBottom: 48,
              letterSpacing: "-0.02em",
            }}
          >
            Frequently asked questions
          </h2>
          <FaqItem
            question="What counts as a 'lead'?"
            answer="A lead is a patient who has completed our full intake questionnaire and has been matched to your clinic based on treatment fit, location, cost approach, and what they value. You receive their complete profile including anxiety level, concerns, budget mindset, and preferred times."
          />
          <FaqItem
            question="What if a patient doesn't show up?"
            answer="No-shows happen. You won't be charged for a lead that doesn't convert or doesn't attend. You only pay for the matched leads delivered to you — what happens after is on us to improve, not on you to absorb."
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
            answer="Every lead includes: treatment interest, anxiety level, cost approach (and budget preferences), conversion blockers/concerns, top clinic priorities, readiness/timing, preferred visit times, and location flexibility. This is the same data our intake questionnaire collects directly from patients."
          />
          <FaqItem
            question="Do I need to change anything about my practice?"
            answer="No. Pearly works alongside your existing processes. We send you qualified patient leads — you handle the consultation and booking as you normally would, just with much better information upfront."
          />
          <FaqItem
            question="What if I don't get any leads in a month?"
            answer="If we don't deliver any matched leads in a billing cycle, you won't be charged for extra leads. Your base subscription covers availability on the platform and priority matching — but we're incentivised to deliver value, not just collect fees."
          />
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section
        style={{
          ...sectionPad,
          paddingTop: 80,
          paddingBottom: 120,
          background: "linear-gradient(180deg, rgba(16,185,129,.06) 0%, rgba(3,7,18,0) 100%)",
          textAlign: "center",
        }}
      >
        <div style={maxW}>
          <h2
            style={{
              fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(28px, 4.5vw, 48px)",
              color: "#f8fafc",
              marginBottom: 16,
              letterSpacing: "-0.03em",
            }}
          >
            Ready for patients who actually convert?
          </h2>
          <p
            style={{
              color: "#94a3b8",
              fontSize: 18,
              maxWidth: 520,
              margin: "0 auto 40px",
              lineHeight: 1.6,
            }}
          >
            Join Pearly and start receiving pre-qualified patients — with the insights you need to
            close them.
          </p>
          <Link href="/signup" style={greenBtn}>
            Join Pearly &mdash; Free Setup <ArrowRight size={18} />
          </Link>
          <p style={{ color: "#475569", fontSize: 13, marginTop: 16 }}>
            No contracts &middot; No setup fee &middot; Cancel anytime
          </p>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,.06)",
          padding: "32px 24px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#475569", fontSize: 13 }}>
          &copy; {new Date().getFullYear()} Pearly Health Ltd. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
