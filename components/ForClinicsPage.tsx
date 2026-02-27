"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Check,
  X,
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
} from "lucide-react"

/* ────────────────────────────────────────────
   TYPES
──────────────────────────────────────────── */
interface FaqItemProps {
  question: string
  answer: string
}

/* ────────────────────────────────────────────
   VISUAL INSIGHT CARDS — bar / tag / scale
──────────────────────────────────────────── */

/** Horizontal bar with label + filled portion */
function MiniBar({ label, pct, highlight }: { label: string; pct: number; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <span
        style={{
          fontSize: 12,
          color: highlight ? "#f1f5f9" : "#64748b",
          fontWeight: highlight ? 600 : 400,
          width: 100,
          flexShrink: 0,
          textAlign: "right",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 8,
          borderRadius: 4,
          background: "rgba(255,255,255,.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 4,
            background: highlight
              ? "linear-gradient(90deg, #10b981, #34d399)"
              : "rgba(255,255,255,.12)",
            transition: "width .3s",
          }}
        />
      </div>
    </div>
  )
}

/** Coloured tag chip */
function Tag({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 12px",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        background: active ? "rgba(16,185,129,.15)" : "rgba(255,255,255,.04)",
        color: active ? "#34d399" : "#64748b",
        border: `1px solid ${active ? "rgba(16,185,129,.25)" : "rgba(255,255,255,.06)"}`,
        lineHeight: 1.3,
      }}
    >
      {label}
    </span>
  )
}

/** Insight card wrapper — icon, title, visual content, source note */
function VisualInsightCard({
  icon,
  title,
  question,
  children,
}: {
  icon: React.ReactNode
  title: string
  question: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,.03)",
        border: "1px solid rgba(255,255,255,.06)",
        borderRadius: 16,
        padding: "24px 22px 20px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div
          style={{
            width: 34,
            height: 34,
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
        <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 14 }}>{title}</span>
      </div>
      <div style={{ flex: 1, marginBottom: 12 }}>{children}</div>
      <p style={{ color: "#475569", fontSize: 11, lineHeight: 1.4, marginTop: "auto" }}>
        From questionnaire: <span style={{ color: "#64748b" }}>{question}</span>
      </p>
    </div>
  )
}

/* ────────────────────────────────────────────
   FAQ ITEM
──────────────────────────────────────────── */
function FaqItem({ question, answer }: FaqItemProps) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,.06)", padding: "20px 0" }}>
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
const STD_EXTRA_PRICE = 35
const PREM_EXTRA_PRICE = 28
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

  const calc = useCallback(
    (base: number, freeLeads: number, extraPrice: number) => {
      const totalLeads = freeLeads + extra
      const extraCost = extra * extraPrice
      const totalCost = base + extraCost
      const revenue = totalLeads * ltv
      const net = revenue - totalCost
      const roiX = totalCost > 0 ? revenue / totalCost : 0
      return { totalLeads, extraCost, totalCost, revenue, net, roiX }
    },
    [extra, ltv],
  )

  const stdCalc = calc(stdBase, stdFreeLeads, STD_EXTRA_PRICE)
  const premCalc = calc(premBase, premFreeLeads, PREM_EXTRA_PRICE)

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
  const heading = {
    fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "#f8fafc",
  } as const

  /* ROI result card helper */
  function RoiCard({
    label,
    labelColor,
    c,
    baseCost,
    extraPrice,
    highlight,
  }: {
    label: string
    labelColor: string
    c: ReturnType<typeof calc>
    baseCost: number
    extraPrice: number
    highlight?: boolean
  }) {
    return (
      <div
        style={{
          background: highlight ? "rgba(16,185,129,.04)" : "rgba(255,255,255,.03)",
          borderRadius: 16,
          padding: "28px 24px",
          border: highlight
            ? "1px solid rgba(16,185,129,.18)"
            : "1px solid rgba(255,255,255,.06)",
        }}
      >
        <p
          style={{
            color: labelColor,
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 16,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </p>

        {/* Cost breakdown */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#64748b", fontSize: 13 }}>Base subscription</span>
            <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 500 }}>
              &pound;{baseCost}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#64748b", fontSize: 13 }}>
              {extra} extra leads &times; &pound;{extraPrice}
            </span>
            <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 500 }}>
              &pound;{c.extraCost}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingTop: 8,
              borderTop: "1px solid rgba(255,255,255,.06)",
            }}
          >
            <span style={{ color: "#f1f5f9", fontSize: 14, fontWeight: 600 }}>Total cost</span>
            <span style={{ color: "#f1f5f9", fontSize: 14, fontWeight: 700 }}>
              &pound;{c.totalCost.toLocaleString()}/mo
            </span>
          </div>
        </div>

        {/* Revenue */}
        <div
          style={{
            background: "rgba(255,255,255,.03)",
            borderRadius: 12,
            padding: "16px 18px",
            marginBottom: 16,
          }}
        >
          <p style={{ color: "#64748b", fontSize: 12, marginBottom: 6 }}>
            {c.totalLeads} patients &times; &pound;{ltv.toLocaleString()} avg LTV
          </p>
          <p style={{ color: "#f1f5f9", fontSize: 18, fontWeight: 700 }}>
            &pound;{c.revenue.toLocaleString()} revenue
          </p>
        </div>

        {/* ROI hero numbers */}
        <div style={{ display: "flex", gap: 20, alignItems: "flex-end" }}>
          <div>
            <p style={{ color: "#64748b", fontSize: 11, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Net return
            </p>
            <p
              style={{
                ...heading,
                fontSize: 28,
                color: "#10b981",
              }}
            >
              &pound;{c.net.toLocaleString()}
            </p>
          </div>
          <div>
            <p style={{ color: "#64748b", fontSize: 11, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              ROI
            </p>
            <p
              style={{
                ...heading,
                fontSize: 28,
                color: "#34d399",
              }}
            >
              {c.roiX.toFixed(1)}x
            </p>
          </div>
        </div>
      </div>
    )
  }

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
            <span style={{ ...heading, fontSize: 22 }}>Pearlie</span>
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
              ...heading,
              fontSize: "clamp(36px, 5.5vw, 64px)",
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
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
            Pearlie pre-qualifies patients&mdash;collecting their anxiety level, cost mindset,
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
              { value: "£0", label: "setup fee" },
              { value: "From £28", label: "per extra lead" },
              { value: "No lock-in", label: "cancel anytime" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center", minWidth: 120 }}>
                <div style={{ ...heading, fontSize: 28, color: "#10b981" }}>{s.value}</div>
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
          <h2 style={{ ...heading, fontSize: "clamp(28px, 4vw, 42px)", textAlign: "center", marginBottom: 56 }}>
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
                title: "Pearlie matches to your clinic",
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
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
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
                <h3 style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 18, marginBottom: 10 }}>
                  {item.title}
                </h3>
                <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.65 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ ZERO RISK ═══════════ */}
      <section style={sectionPad}>
        <div style={{ ...maxW, maxWidth: 800 }}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <span
              style={{
                display: "inline-block",
                background: "rgba(16,185,129,.12)",
                color: "#10b981",
                fontWeight: 700,
                fontSize: 13,
                padding: "6px 16px",
                borderRadius: 20,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Zero risk
            </span>
          </div>
          <h2 style={{ ...heading, fontSize: "clamp(28px, 4vw, 42px)", textAlign: "center", marginBottom: 16 }}>
            You only pay for patients
            <br />
            who actually show up
          </h2>
          <p
            style={{
              color: "#94a3b8",
              fontSize: 16,
              textAlign: "center",
              maxWidth: 600,
              margin: "0 auto 40px",
              lineHeight: 1.65,
            }}
          >
            If a patient doesn&rsquo;t attend their appointment, you are not charged.
            If we don&rsquo;t send you any leads in a month, you don&rsquo;t pay the per-lead fee.
            Your subscription covers platform access and your guaranteed leads &mdash; but
            no-shows are always on us.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            {[
              { q: "Patient no-show?", a: "No charge. Ever." },
              { q: "No leads this month?", a: "You don't pay extra." },
              { q: "Want to cancel?", a: "Anytime. No penalties." },
              { q: "Unhappy with quality?", a: "We'll make it right." },
            ].map((card) => (
              <div
                key={card.q}
                style={{
                  background: "rgba(255,255,255,.03)",
                  border: "1px solid rgba(255,255,255,.06)",
                  borderRadius: 14,
                  padding: "24px 22px",
                }}
              >
                <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 8 }}>{card.q}</p>
                <p style={{ color: "#10b981", fontWeight: 700, fontSize: 18, lineHeight: 1.3 }}>
                  {card.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ PATIENT INSIGHTS — VISUAL ═══════════ */}
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
          <h2 style={{ ...heading, fontSize: "clamp(28px, 4vw, 42px)", textAlign: "center", marginBottom: 8 }}>
            Know your patient before they walk in
          </h2>
          <p
            style={{
              color: "#94a3b8",
              fontSize: 16,
              textAlign: "center",
              maxWidth: 560,
              margin: "0 auto 16px",
              lineHeight: 1.5,
            }}
          >
            Every lead includes 8 data points collected from our intake questionnaire.
            Here&rsquo;s what clinics see:
          </p>
          {/* Source badge */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(16,185,129,.08)",
                border: "1px solid rgba(16,185,129,.2)",
                borderRadius: 20,
                padding: "6px 16px",
                fontSize: 12,
                fontWeight: 600,
                color: "#34d399",
              }}
            >
              <FileText size={13} />
              All data from real patient questionnaire responses
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            {/* 1. Anxiety Level — bar chart */}
            <VisualInsightCard
              icon={<Heart size={16} />}
              title="Dental anxiety level"
              question="How do you feel about visiting the dentist?"
            >
              <MiniBar label="Comfortable" pct={30} />
              <MiniBar label="A little nervous" pct={35} />
              <MiniBar label="Quite anxious" pct={55} highlight />
              <MiniBar label="Very anxious" pct={20} />
            </VisualInsightCard>

            {/* 2. Cost approach — tags */}
            <VisualInsightCard
              icon={<PoundSterling size={16} />}
              title="Cost approach"
              question="How do you think about investing in treatment?"
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Tag label="Best outcome" />
                <Tag label="Understand value" active />
                <Tag label="Flexible range" active />
                <Tag label="Strict budget" />
              </div>
              <p style={{ color: "#64748b", fontSize: 12, marginTop: 10, lineHeight: 1.4 }}>
                Includes monthly payment preference and budget range when shared
              </p>
            </VisualInsightCard>

            {/* 3. Conversion blockers — tags */}
            <VisualInsightCard
              icon={<AlertCircle size={16} />}
              title="What's holding them back"
              question="Is there anything making you hesitate?"
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Tag label="Cost concern" active />
                <Tag label="Needs time to decide" />
                <Tag label="Unsure which treatment" active />
                <Tag label="Complexity worry" />
                <Tag label="Past bad experience" />
                <Tag label="No concerns" />
              </div>
              <p style={{ color: "#64748b", fontSize: 12, marginTop: 10, lineHeight: 1.4 }}>
                Up to 2 selected per patient
              </p>
            </VisualInsightCard>

            {/* 4. Clinic priorities — ranked visual */}
            <VisualInsightCard
              icon={<Star size={16} />}
              title="What they value in a clinic"
              question="What matters most when choosing a clinic?"
            >
              {[
                { label: "Clear pricing", pct: 65, top: true },
                { label: "Calm environment", pct: 50, top: true },
                { label: "Specialist experience", pct: 45 },
                { label: "Good reviews", pct: 40 },
                { label: "Flexible hours", pct: 30 },
                { label: "Continuity of care", pct: 25 },
              ].map((v) => (
                <div
                  key={v.label}
                  style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: v.top ? "#f1f5f9" : "#64748b",
                      fontWeight: v.top ? 600 : 400,
                      width: 120,
                      flexShrink: 0,
                      textAlign: "right",
                    }}
                  >
                    {v.label}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      borderRadius: 4,
                      background: "rgba(255,255,255,.06)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${v.pct}%`,
                        height: "100%",
                        borderRadius: 4,
                        background: v.top
                          ? "linear-gradient(90deg, #10b981, #34d399)"
                          : "rgba(255,255,255,.12)",
                      }}
                    />
                  </div>
                </div>
              ))}
              <p style={{ color: "#64748b", fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>
                Each patient picks their top 2 priorities
              </p>
            </VisualInsightCard>

            {/* 5. Readiness — timeline scale */}
            <VisualInsightCard
              icon={<Clock size={16} />}
              title="How ready they are"
              question="When are you looking to start treatment?"
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  gap: 0,
                  marginBottom: 8,
                }}
              >
                {[
                  { label: "ASAP", color: "#10b981" },
                  { label: "This week", color: "#34d399" },
                  { label: "Few weeks", color: "#6ee7b7" },
                  { label: "Exploring", color: "#475569" },
                ].map((t, i) => (
                  <div
                    key={t.label}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: "12px 4px",
                      background: `${t.color}15`,
                      borderLeft: i > 0 ? "1px solid rgba(255,255,255,.04)" : undefined,
                      borderRadius:
                        i === 0
                          ? "10px 0 0 10px"
                          : i === 3
                            ? "0 10px 10px 0"
                            : undefined,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: t.color,
                        margin: "0 auto 6px",
                      }}
                    />
                    <span style={{ fontSize: 11, fontWeight: 600, color: t.color }}>{t.label}</span>
                  </div>
                ))}
              </div>
              <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.4 }}>
                Emergency patients show same-day / next-day urgency
              </p>
            </VisualInsightCard>

            {/* 6. Preferred visit times — time blocks */}
            <VisualInsightCard
              icon={<Calendar size={16} />}
              title="Preferred visit times"
              question="When would you prefer appointments?"
            >
              <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                {[
                  { label: "Morning", sub: "Before 12pm", icon: "9am", active: false },
                  { label: "Afternoon", sub: "12 – 5pm", icon: "2pm", active: true },
                  { label: "Weekend", sub: "Sat / Sun", icon: "Sat", active: true },
                ].map((slot) => (
                  <div
                    key={slot.label}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: "14px 8px 12px",
                      borderRadius: 12,
                      background: slot.active ? "rgba(16,185,129,.1)" : "rgba(255,255,255,.03)",
                      border: `1px solid ${slot.active ? "rgba(16,185,129,.25)" : "rgba(255,255,255,.06)"}`,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: slot.active ? "#10b981" : "#475569",
                        marginBottom: 4,
                        fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
                      }}
                    >
                      {slot.icon}
                    </p>
                    <p style={{ fontSize: 12, fontWeight: 600, color: slot.active ? "#f1f5f9" : "#64748b" }}>
                      {slot.label}
                    </p>
                    <p style={{ fontSize: 10, color: "#475569" }}>{slot.sub}</p>
                  </div>
                ))}
              </div>
            </VisualInsightCard>

            {/* 7. Treatment interest — tag cloud */}
            <VisualInsightCard
              icon={<Stethoscope size={16} />}
              title="Treatment interest"
              question="What treatment are you looking for?"
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Tag label="Invisalign" active />
                <Tag label="Whitening" />
                <Tag label="Composite Bonding" active />
                <Tag label="Veneers" />
                <Tag label="Implants" />
                <Tag label="Check-up & Clean" />
                <Tag label="Emergency" />
              </div>
              <p style={{ color: "#64748b", fontSize: 12, marginTop: 10, lineHeight: 1.4 }}>
                Patients can select multiple treatments
              </p>
            </VisualInsightCard>

            {/* 8. Location flexibility — distance scale */}
            <VisualInsightCard
              icon={<MapPin size={16} />}
              title="Location flexibility"
              question="How far are you willing to travel?"
            >
              <div style={{ marginBottom: 8 }}>
                {[
                  { label: "Close to home / work", dist: "1.5 mi", pct: 33 },
                  { label: "Travel a bit", dist: "5 mi", pct: 66 },
                  { label: "Travel further for right clinic", dist: "5+ mi", pct: 100 },
                ].map((loc, i) => (
                  <div
                    key={loc.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      borderRadius: 10,
                      marginBottom: 4,
                      background: i === 1 ? "rgba(16,185,129,.08)" : "transparent",
                      border: i === 1 ? "1px solid rgba(16,185,129,.15)" : "1px solid transparent",
                    }}
                  >
                    <MapPin size={13} style={{ color: i === 1 ? "#10b981" : "#475569", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: i === 1 ? "#f1f5f9" : "#94a3b8", flex: 1, fontWeight: i === 1 ? 600 : 400 }}>
                      {loc.label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "#64748b",
                        fontWeight: 500,
                        background: "rgba(255,255,255,.05)",
                        padding: "2px 8px",
                        borderRadius: 6,
                      }}
                    >
                      {loc.dist}
                    </span>
                  </div>
                ))}
              </div>
            </VisualInsightCard>
          </div>
        </div>
      </section>

      {/* ═══════════ FREE VISIBILITY ═══════════ */}
      <section style={{ ...sectionPad, background: "rgba(255,255,255,.015)" }}>
        <div style={maxW}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <span
              style={{
                display: "inline-block",
                background: "rgba(16,185,129,.12)",
                color: "#10b981",
                fontWeight: 700,
                fontSize: 13,
                padding: "6px 16px",
                borderRadius: 20,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Bonus: free visibility
            </span>
          </div>
          <h2 style={{ ...heading, fontSize: "clamp(28px, 4vw, 42px)", textAlign: "center", marginBottom: 8 }}>
            Patients discover your clinic &mdash; even outside Pearlie
          </h2>
          <p
            style={{
              color: "#94a3b8",
              fontSize: 16,
              textAlign: "center",
              maxWidth: 560,
              margin: "0 auto 16px",
              lineHeight: 1.5,
            }}
          >
            Every clinic gets a public profile page that ranks on Google.
            Your always-on digital storefront &mdash; at no extra cost.
          </p>
          {/* Source badge */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(16,185,129,.08)",
                border: "1px solid rgba(16,185,129,.2)",
                borderRadius: 20,
                padding: "6px 16px",
                fontSize: 12,
                fontWeight: 600,
                color: "#34d399",
              }}
            >
              <TrendingUp size={13} />
              Free patient acquisition you&rsquo;d never get otherwise
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {/* SEO Profile */}
            <div
              style={{
                background: "rgba(255,255,255,.03)",
                border: "1px solid rgba(255,255,255,.06)",
                borderRadius: 16,
                padding: "24px 22px 20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "rgba(59,130,246,.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#60a5fa",
                    flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </div>
                <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 14 }}>SEO-optimised profile</span>
              </div>
              {/* Mini Google search mockup */}
              <div
                style={{
                  background: "rgba(255,255,255,.04)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: "#4285f4" }} />
                  <span style={{ color: "#64748b", fontSize: 11 }}>pearlie.org &rsaquo; clinic</span>
                </div>
                <p style={{ color: "#60a5fa", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  Your Clinic Name &mdash; Pearlie
                </p>
                <p style={{ color: "#64748b", fontSize: 11, lineHeight: 1.4 }}>
                  Invisalign, veneers &amp; cosmetic dentistry in London. View
                  treatments, reviews &amp; book...
                </p>
              </div>
              <p style={{ color: "#475569", fontSize: 11, lineHeight: 1.4 }}>
                Rank on Google for local dental searches without paying for ads
              </p>
            </div>

            {/* Brand Exposure */}
            <div
              style={{
                background: "rgba(255,255,255,.03)",
                border: "1px solid rgba(255,255,255,.06)",
                borderRadius: 16,
                padding: "24px 22px 20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "rgba(168,85,247,.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#a78bfa",
                    flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 14 }}>Passive brand exposure</span>
              </div>
              {/* Impressions visual */}
              <div style={{ marginBottom: 12 }}>
                {[
                  { label: "Profile views", value: "1,200+", pct: 80 },
                  { label: "Direct website clicks", value: "340+", pct: 45 },
                  { label: "Phone calls from profile", value: "85+", pct: 25 },
                ].map((stat) => (
                  <div key={stat.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "#94a3b8", fontSize: 12 }}>{stat.label}</span>
                      <span style={{ color: "#a78bfa", fontSize: 12, fontWeight: 600 }}>{stat.value}/mo</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
                      <div style={{ width: `${stat.pct}%`, height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #8b5cf6, #a78bfa)" }} />
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ color: "#475569", fontSize: 11, lineHeight: 1.4 }}>
                Patients see your clinic, learn about you &mdash; and may contact you directly
              </p>
            </div>

            {/* Social Proof */}
            <div
              style={{
                background: "rgba(255,255,255,.03)",
                border: "1px solid rgba(255,255,255,.06)",
                borderRadius: 16,
                padding: "24px 22px 20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "rgba(251,191,36,.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fbbf24",
                    flexShrink: 0,
                  }}
                >
                  <Star size={16} />
                </div>
                <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 14 }}>Social proof displayed</span>
              </div>
              {/* Review stars mockup */}
              <div
                style={{
                  background: "rgba(255,255,255,.04)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={14} fill={s <= 4 ? "#fbbf24" : "none"} style={{ color: s <= 4 ? "#fbbf24" : "#475569" }} />
                  ))}
                  <span style={{ color: "#fbbf24", fontSize: 13, fontWeight: 700, marginLeft: 4 }}>4.8</span>
                  <span style={{ color: "#64748b", fontSize: 11 }}>(127 reviews)</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["Invisalign", "Cosmetic", "Implants", "NHS"].map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: 11,
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: "rgba(251,191,36,.1)",
                        color: "#fbbf24",
                        fontWeight: 500,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <p style={{ color: "#475569", fontSize: 11, lineHeight: 1.4 }}>
                Reviews, services &amp; specialties showcased to high-intent patients
              </p>
            </div>

            {/* Organic Growth */}
            <div
              style={{
                background: "rgba(255,255,255,.03)",
                border: "1px solid rgba(255,255,255,.06)",
                borderRadius: 16,
                padding: "24px 22px 20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "rgba(16,185,129,.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#10b981",
                    flexShrink: 0,
                  }}
                >
                  <TrendingUp size={16} />
                </div>
                <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 14 }}>Organic growth channel</span>
              </div>
              {/* Growth chart mockup */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80, padding: "0 4px", marginBottom: 12 }}>
                {[18, 25, 22, 35, 40, 38, 52, 60, 55, 70, 78, 85].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${h}%`,
                      borderRadius: "3px 3px 0 0",
                      background:
                        i >= 9
                          ? "linear-gradient(180deg, #10b981, rgba(16,185,129,.4))"
                          : "rgba(16,185,129,.15)",
                      transition: "height .3s",
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ color: "#475569", fontSize: 10 }}>Month 1</span>
                <span style={{ color: "#10b981", fontSize: 10, fontWeight: 600 }}>Month 12</span>
              </div>
              <p style={{ color: "#475569", fontSize: 11, lineHeight: 1.4 }}>
                Even patients who don&rsquo;t book through Pearlie now know you exist
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ TRADITIONAL VS PEARLIE ═══════════ */}
      <section style={sectionPad}>
        <div style={{ ...maxW, maxWidth: 800 }}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <span
              style={{
                display: "inline-block",
                background: "rgba(239,68,68,.12)",
                color: "#f87171",
                fontWeight: 700,
                fontSize: 13,
                padding: "6px 16px",
                borderRadius: 20,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              The old way vs. the new way
            </span>
          </div>
          <h2 style={{ ...heading, fontSize: "clamp(28px, 4vw, 42px)", textAlign: "center", marginBottom: 48 }}>
            Traditional marketing is{" "}
            <span style={{ color: "#f87171" }}>costing you thousands</span>
          </h2>
          <div
            style={{
              background: "rgba(255,255,255,.03)",
              border: "1px solid rgba(255,255,255,.06)",
              borderRadius: 18,
              overflow: "hidden",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 500, borderCollapse: "collapse", fontSize: 15 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "18px 20px", color: "#64748b", fontWeight: 600, fontSize: 13, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                      &nbsp;
                    </th>
                    <th style={{ textAlign: "center", padding: "18px 20px", color: "#f87171", fontWeight: 700, fontSize: 14, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                      Traditional / Agency
                    </th>
                    <th style={{ textAlign: "center", padding: "18px 20px", color: "#10b981", fontWeight: 700, fontSize: 14, borderBottom: "2px solid #10b981", background: "rgba(16,185,129,.04)" }}>
                      Pearlie
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: "Monthly cost to clinic", old: "£2,300 – £7,000+", pearlie: "£287 – £670" },
                    { feature: "Ad spend required from clinic", old: "£800 – £5,000 on top", pearlie: "£0 — we handle it all" },
                    { feature: "Setup / onboarding fee", old: "£1,000 – £5,000", pearlie: "£0 — free" },
                    { feature: "Contract", old: "12 – 36 months locked in", pearlie: "Cancel anytime" },
                    { feature: "Time to first patient", old: "3 – 6 months (SEO ramp)", pearlie: "Within 48 hours" },
                    { feature: "Lead quality", old: "Cold ad clicks", pearlie: "Pre-qualified & matched" },
                    { feature: "Patient no-show?", old: "You still pay", pearlie: "No charge" },
                    { feature: "No leads delivered?", old: "You still pay retainer", pearlie: "No extra charge" },
                    { feature: "Work required from clinic", old: "Approve ads, manage pages", pearlie: "None — fully hands-off" },
                  ].map((row) => (
                    <tr key={row.feature}>
                      <td style={{ padding: "16px 20px", color: "#cbd5e1", fontWeight: 500, borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                        {row.feature}
                      </td>
                      <td style={{ textAlign: "center", padding: "16px 20px", color: "#f87171", fontWeight: 600, fontSize: 14, borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                        {row.old}
                      </td>
                      <td style={{ textAlign: "center", padding: "16px 20px", color: "#10b981", fontWeight: 600, fontSize: 14, borderBottom: "1px solid rgba(255,255,255,.04)", background: "rgba(16,185,129,.03)" }}>
                        {row.pearlie}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ ROI CALCULATOR ═══════════ */}
      <section style={sectionPad}>
        <div style={{ ...maxW, maxWidth: 840 }}>
          <h2 style={{ ...heading, fontSize: "clamp(28px, 4vw, 42px)", textAlign: "center", marginBottom: 12 }}>
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

            {/* Results — two plans side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <RoiCard
                label="Standard Plan"
                labelColor="#94a3b8"
                c={stdCalc}
                baseCost={stdBase}
                extraPrice={STD_EXTRA_PRICE}
              />
              <RoiCard
                label="Premium Plan"
                labelColor="#10b981"
                c={premCalc}
                baseCost={premBase}
                extraPrice={PREM_EXTRA_PRICE}
                highlight
              />
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
          <h2 style={{ ...heading, fontSize: "clamp(28px, 4vw, 42px)", textAlign: "center", marginBottom: 16 }}>
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
                <span style={{ ...heading, fontSize: 48 }}>&pound;287</span>
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
                <span style={{ ...heading, fontSize: 48 }}>&pound;450</span>
                <span style={{ color: "#64748b", fontSize: 16 }}>/month</span>
              </div>
              <p style={{ color: "#64748b", fontSize: 14, marginBottom: 28 }}>
                5 matched patients included
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px" }}>
                {[
                  "5 pre-qualified patient leads",
                  "Full patient intent profile",
                  "Extra leads at £28 each",
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
                href="mailto:hello@pearlie.org?subject=Pearlie Premium — clinic enquiry"
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
          <h2 style={{ ...heading, fontSize: "clamp(28px, 4vw, 42px)", textAlign: "center", marginBottom: 48 }}>
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
            answer="No. Pearlie works alongside your existing processes. We send you qualified patient leads — you handle the consultation and booking as you normally would, just with much better information upfront."
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
          <h2 style={{ ...heading, fontSize: "clamp(28px, 4.5vw, 48px)", marginBottom: 16, letterSpacing: "-0.03em" }}>
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
            Join Pearlie and start receiving pre-qualified patients — with the insights you need to
            close them.
          </p>
          <Link href="/signup" style={greenBtn}>
            Join Pearlie &mdash; Free Setup <ArrowRight size={18} />
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
          &copy; {new Date().getFullYear()} Pearlie Health Ltd. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
