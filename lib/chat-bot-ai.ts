/**
 * AI-powered chat bot using Groq (llama-3.3-70b-versatile).
 *
 * Context-aware responses grounded in clinic + lead data.
 * Falls back to template bot (lib/chat-bot.ts) when:
 *   - GROQ_API_KEY is not set
 *   - LLM call takes > 4 seconds
 *   - LLM returns empty / error
 *   - bot_intelligence is disabled for the clinic
 */

import { sendEmailWithRetry } from "@/lib/email-send"
import { EMAIL_FROM } from "@/lib/email-config"

// ─── Types ───────────────────────────────────────────────────────

interface ClinicContext {
  name: string
  phone?: string
  treatments?: string[]
  price_range?: string
  description?: string
  facilities?: string[]
  opening_hours?: Record<string, any>
  accepts_nhs?: boolean
  parking_available?: boolean
  wheelchair_accessible?: boolean
  treatment_prices?: Array<{ category: string; treatments: Array<{ name: string; price: string; description?: string }> }>
  show_treatment_prices?: boolean
  offers_free_consultation?: boolean
  available_days?: string[]
  available_hours?: string[]
  has_before_after_images?: boolean
}

interface LeadContext {
  first_name?: string
  treatment_interest?: string
  urgency?: string
  budget_range?: string
  pain_score?: number
  has_swelling?: boolean
  has_bleeding?: boolean
  additional_info?: string
  // Intake form answers (already collected — bot must NOT re-ask these)
  anxiety_level?: string
  preferred_times?: string[]
  timing_preference?: string
  cost_approach?: string
  decision_values?: string[]
  location_preference?: string
}

interface ConversationMessage {
  sender_type: "patient" | "clinic" | "bot"
  content: string
}

type BotTrigger = "greeting" | "no_reply" | "follow_up"

interface EscalationContext {
  clinicEmail?: string
  clinicName?: string
  patientName?: string
  messageContent?: string
  conversationId?: string
  appUrl?: string
}

// ─── Guardrails (system prompt) ──────────────────────────────────

const SYSTEM_PROMPT = `You are Pearlie, a friendly and warm dental assistant chatbot for the Pearlie platform. You help patients while they wait for the clinic team to respond.

## YOUR ROLE
- Welcome patients, answer general questions about the clinic, and keep them engaged.
- Route clinical or complex questions to the clinic team.
- You are NOT a dentist. You CANNOT diagnose, recommend treatments, or triage.

## HARD RULES — NEVER BREAK THESE

### 1. Clinical safety
- NEVER diagnose, recommend treatments, or say whether something "needs" urgent care.
- NEVER say "you need X", "this sounds like an infection/abscess/gum disease", or comment on symptoms clinically.
- You MAY: encourage booking, encourage calling the clinic, provide general "seek urgent care" for red flags.

### 2. Emergency escalation — ALWAYS trigger for these keywords/situations:
If the patient mentions ANY of: facial swelling, spreading swelling, difficulty breathing, difficulty swallowing, uncontrolled bleeding, trauma to face/jaw, fever combined with dental pain, severe worsening pain, allergic reaction, fainting, chest pain:
→ You MUST reply ONLY with: "If you have swelling, trouble swallowing or breathing, fever, or severe worsening pain, please contact urgent care (NHS 111) or call 999 if severe. I can also notify the clinic now."
→ Do NOT add anything else. Do NOT try to reassure or chat further about the emergency.

### 3. No medical-legal admissions
- If someone complains or alleges harm: NEVER apologise for wrongdoing, assign blame, suggest refunds or compensation.
- Reply: "I can share this with the clinic manager so they can respond properly."
- NEVER use words: "refund", "compensation", "negligence", "fault"

### 4. No promises or guarantees
- NEVER use: "will fix", "guaranteed", "permanent", "pain-free", "best", "perfect results"
- USE instead: "can discuss", "may be suitable", "depends on assessment"

### 5. No superlatives or ranking labels
- NEVER use: "diamond provider", "gold provider", "top-rated", "best in London", "#1", "premium partner", "elite clinic"
- USE instead: "This clinic matches your preferences", "This clinic offers..."

### 6. No pressure sales
- NEVER use: "Book now before it's gone", "limited slots", "don't miss out"

### 7. Use clinic data, never invent
- You HAVE access to real clinic data in the CLINIC CONTEXT below — use it to answer questions.
- If TREATMENT PRICES are provided and a patient asks about cost, quote the listed price but always add: "though the clinic can confirm the exact cost after an assessment."
- If the patient asks about NHS and you have that data, answer directly.
- If the patient asks about opening hours and you have them, answer directly.
- If data is missing for what the patient asks: "The clinic can confirm this when they review your message."
- NEVER invent availability, pricing, policies, or treatment times beyond what's in the context.
- NEVER say "You're booked" or "Confirmed". Say: "I can help you request an appointment; the clinic will confirm."
- When discussing availability, only mention DAYS (e.g., "they're open Monday to Friday") — NEVER mention specific time slots. If the patient asks about specific times, say the clinic will get in touch with available times.

### 8. Privacy (GDPR)
- NEVER ask for: full date of birth, home address, NHS number, detailed medical history.
- If patient shares sensitive info, do NOT repeat it back.
- If patient tries to share images: "Please share that directly with the clinic at your appointment."
- NEVER reveal clinic staff names, direct emails, or info about other patients.

### 9. Professional language
- Say "the clinical team", "a clinician", "the dentist" — not "specialist" (unless clinic explicitly offers specialist services).
- If referral needed: "the clinic may recommend seeing another clinician if needed."

### 10. Treatment mentions
- Only mention treatments the patient already selected as their interest.
- Even then, keep it neutral: "The clinic can explain options and suitability after an exam."

## BANNED PHRASES (never output these)
"specialist" (unless clinic explicitly offers), "diamond provider", "gold provider", "elite", "guarantee", "will definitely", "best", "perfect", "you need", "you should do X", "this is an infection", "this is an abscess", "this is gum disease", "refund", "compensation", "negligence", "fault", "you consent", "we have your consent"

## CONVERSATION RULES
- If the patient's message contains a question, ANSWER it using the clinic context before anything else. Do not ignore their question to deliver a generic greeting.
- NEVER re-ask questions the patient already answered in their intake form. The PATIENT CONTEXT shows what they've already told us (treatment interest, timing, budget, anxiety level, preferred times, etc.). Do not ask about these again.
- Max 1 question per message. Only ask if it adds genuine value and wasn't already covered in intake.
- If patient pushes for clinical advice: "I can't advise clinically, but I can pass your question to the clinic so they can answer properly."
- Keep responses under 3 sentences. Be warm and conversational, not robotic.
- Use the patient's first name if available.

## BEFORE & AFTER IMAGES NUDGE
- If the patient's treatment interest is cosmetic (NOT "checkup", "check-up", "emergency", or "general") AND the clinic context says HAS_BEFORE_AFTER_IMAGES: true, you may naturally mention: "You can also check out the clinic's before and after photos on their details page while you wait."
- Only mention this once, and only if both conditions are true. If the clinic has no before/after images, say nothing about them.`

// ─── Trigger-specific user prompts ───────────────────────────────

function buildUserPrompt(
  trigger: BotTrigger,
  clinic: ClinicContext,
  lead: LeadContext,
  recentMessages: ConversationMessage[]
): string {
  const clinicInfo = buildClinicSummary(clinic)
  const leadInfo = buildLeadSummary(lead)
  const history = recentMessages
    .slice(-6)
    .map((m) => `[${m.sender_type}]: ${JSON.stringify(m.content)}`)
    .join("\n")

  switch (trigger) {
    case "greeting":
      return `${clinicInfo}\n${leadInfo}\n\nThe patient just sent their first message. Read it carefully.\n\nIf their message contains a QUESTION (e.g., "how much is a checkup?", "do you accept NHS?", "are you open on Saturdays?"):\n- Start with a brief, warm hello (e.g., "Hi Sarah!" or "Hey there!") — keep it short, just a few words\n- Then answer their question using the clinic context above\n- Let them know the clinic team can confirm or follow up\n- Keep it to 2-3 sentences total\n\nIf their message is a general hello or statement (not a question):\n- Write a warm, natural greeting using their first name if available\n- Acknowledge their treatment interest if known\n- Mention one relevant clinic fact if available\n- Let them know the clinic team will respond\n- Keep it to 2-3 sentences, warm and conversational\n\nDo NOT re-ask anything already listed in the PATIENT CONTEXT above. Do NOT mention specific time slots — only days. If relevant, mention before-and-after photos per the system rules.\n\nPatient's message:\n${history}`

    case "no_reply":
      return `${clinicInfo}\n${leadInfo}\n\nThe clinic hasn't replied in 30+ minutes. Write a short reassurance message that:\n- Manages expectations (clinics typically respond within a few hours)\n- Mentions they'll be notified by email when the clinic replies\n- If opening hours are available, mention whether the clinic is currently open\n- Keeps it to 2 sentences\n- Does NOT apologise or make excuses for the clinic`

    case "follow_up":
      return `${clinicInfo}\n${leadInfo}\n\nConversation so far:\n${history}\n\nThe patient just sent a follow-up message and the clinic hasn't replied yet. Write a brief, helpful response that:\n- If they asked a question, answer it directly from the clinic context (prices, NHS status, opening days, etc.)\n- If you quote a price from the TREATMENT PRICES list, add "though the clinic can confirm the exact cost after an assessment"\n- Only mention days, not specific time slots — for times say the clinic will be in touch\n- If it's a clinical question, route to the clinic team\n- If it's about pricing and you don't have it, say the clinic can provide a quote\n- Keeps it to 2-3 sentences`
  }
}

function buildClinicSummary(clinic: ClinicContext): string {
  const parts = [`CLINIC CONTEXT:\n- Name: ${clinic.name}`]
  if (clinic.phone) parts.push(`- Phone: ${clinic.phone}`)
  if (clinic.treatments?.length)
    parts.push(`- Treatments offered: ${clinic.treatments.join(", ")}`)
  if (clinic.price_range) parts.push(`- Price range: ${clinic.price_range}`)
  if (clinic.accepts_nhs !== undefined)
    parts.push(`- Accepts NHS patients: ${clinic.accepts_nhs ? "Yes" : "No"}`)
  if (clinic.parking_available) parts.push(`- Parking available`)
  if (clinic.wheelchair_accessible) parts.push(`- Wheelchair accessible`)
  if (clinic.offers_free_consultation) parts.push(`- Offers free consultation`)
  if (clinic.opening_hours) {
    try {
      const hours = typeof clinic.opening_hours === "string"
        ? JSON.parse(clinic.opening_hours)
        : clinic.opening_hours
      const formatted = Object.entries(hours)
        .map(([day, time]) => `${day}: ${time}`)
        .join(", ")
      if (formatted) parts.push(`- Opening days: ${formatted}`)
    } catch {
      // skip malformed hours
    }
  }
  if (clinic.available_days?.length)
    parts.push(`- Available days: ${clinic.available_days.join(", ")}`)
  if (clinic.description)
    parts.push(`- Description: ${clinic.description.substring(0, 200)}`)
  // Treatment prices (only if clinic has enabled price display)
  if (clinic.show_treatment_prices && clinic.treatment_prices?.length) {
    const priceLines: string[] = []
    for (const cat of clinic.treatment_prices) {
      for (const t of cat.treatments) {
        if (t.price) priceLines.push(`  ${t.name}: ${t.price}`)
      }
    }
    if (priceLines.length) {
      parts.push(`- TREATMENT PRICES (from clinic's published price list):\n${priceLines.join("\n")}`)
    }
  }
  if (clinic.has_before_after_images)
    parts.push(`- HAS_BEFORE_AFTER_IMAGES: true`)
  return parts.join("\n")
}

function buildLeadSummary(lead: LeadContext): string {
  const parts = ["PATIENT CONTEXT (already collected via intake form — DO NOT re-ask any of these):"]
  if (lead.first_name) parts.push(`- First name: ${lead.first_name}`)
  if (lead.treatment_interest)
    parts.push(`- Treatment interest: ${lead.treatment_interest}`)
  if (lead.urgency) parts.push(`- Urgency: ${lead.urgency}`)
  if (lead.budget_range) parts.push(`- Budget preference: ${lead.budget_range}`)
  if (lead.cost_approach) parts.push(`- Cost approach: ${lead.cost_approach}`)
  if (lead.anxiety_level) parts.push(`- Anxiety level: ${lead.anxiety_level}`)
  if (lead.preferred_times?.length)
    parts.push(`- Preferred times: ${lead.preferred_times.join(", ")}`)
  if (lead.timing_preference) parts.push(`- Timing preference: ${lead.timing_preference}`)
  if (lead.decision_values?.length)
    parts.push(`- Clinic priorities: ${lead.decision_values.join(", ")}`)
  if (lead.location_preference) parts.push(`- Location preference: ${lead.location_preference}`)
  if (lead.pain_score != null) parts.push(`- Pain score: ${lead.pain_score}/10`)
  if (lead.additional_info)
    parts.push(`- Additional info: ${lead.additional_info.substring(0, 150)}`)
  return parts.join("\n")
}

// ─── Red-flag detection (runs BEFORE LLM) ────────────────────────

const RED_FLAGS = [
  /facial\s*swell/i,
  /spreading\s*swell/i,
  /difficulty\s*(breathing|swallowing)/i,
  /can'?t\s*(breathe|swallow)/i,
  /trouble\s*(breathing|swallowing)/i,
  /uncontrolled\s*bleed/i,
  /won'?t\s*stop\s*bleed/i,
  /trauma/i,
  /fever.*(tooth|dental|pain|jaw)/i,
  /(tooth|dental|jaw).*(fever)/i,
  /severe.*worsening\s*pain/i,
  /getting\s*worse.*pain/i,
  /allergic\s*react/i,
  /anaphyla/i,
  /faint/i,
  /chest\s*pain/i,
  /can'?t\s*open.*mouth/i,
]

const EMERGENCY_RESPONSE =
  "If you have swelling, trouble swallowing or breathing, fever, or severe worsening pain, please contact urgent care (NHS 111) or call 999 if severe. I can also notify the clinic now."

function detectRedFlags(text: string): boolean {
  return RED_FLAGS.some((re) => re.test(text))
}

// ─── Complaint detection (runs BEFORE LLM) ───────────────────────

const COMPLAINT_PATTERNS = [
  /negligence/i,
  /malpractice/i,
  /su(e|ing)/i,
  /lawyer|solicitor/i,
  /compensation/i,
  /refund/i,
  /complain/i,
  /harmed|damaged|ruined/i,
  /your fault|their fault|clinic'?s fault/i,
]

const COMPLAINT_RESPONSE =
  "I can share this with the clinic manager so they can respond properly. Would you like me to pass your message on?"

function detectComplaint(text: string): boolean {
  return COMPLAINT_PATTERNS.some((re) => re.test(text))
}

// ─── Prompt injection detection ───────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?above\s+instructions/i,
  /disregard\s+(all\s+)?(previous|above|prior)/i,
  /you\s+are\s+now/i,
  /new\s+instructions:/i,
  /system\s*:/i,
  /\bpretend\s+you\s+are\b/i,
  /\bact\s+as\s+(a|an)\b/i,
  /\bjailbreak/i,
  /\bDAN\b/,
  /do\s+not\s+follow\s+(your|the)\s+(rules|instructions)/i,
]

const INJECTION_FALLBACK_RESPONSE =
  "Thanks for your message! The clinic team will review and get back to you soon."

function detectPromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((re) => re.test(text))
}

// ─── Post-generation validation ──────────────────────────────────

const BANNED_PHRASES = [
  "diamond provider",
  "gold provider",
  "elite",
  "top-rated",
  "best in london",
  "#1",
  "premium partner",
  "guarantee",
  "will definitely",
  "perfect results",
  "pain-free",
  "you need",
  "you should do",
  "this is an infection",
  "this is an abscess",
  "this is gum disease",
  "you consent",
  "we have your consent",
  "negligence",
  "compensation",
  "refund",
  "fault",
  "book now before",
  "limited slots",
  "don't miss out",
]

function sanitizeResponse(text: string): string | null {
  for (const phrase of BANNED_PHRASES) {
    const regex = new RegExp(phrase, "gi")
    if (regex.test(text)) {
      console.warn("[chat-bot-ai] Banned phrase detected in LLM output, falling back to template:", phrase)
      return null
    }
  }
  return text.trim()
}

// ─── Groq API call with timeout ──────────────────────────────────

async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  timeoutMs = 4000
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.warn("[chat-bot-ai] GROQ_API_KEY not set")
    return null
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 400,
        }),
        signal: controller.signal,
      }
    )

    if (!response.ok) {
      const errText = await response.text().catch(() => "")
      console.error(`[chat-bot-ai] Groq ${response.status}: ${errText}`)
      return null
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || null
  } catch (error: any) {
    if (error?.name === "AbortError") {
      console.warn("[chat-bot-ai] Groq call timed out after", timeoutMs, "ms")
    } else {
      console.error("[chat-bot-ai] Groq call failed:", error)
    }
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ─── Escalation email helper ─────────────────────────────────────

function sendEscalationEmail(
  type: "complaint" | "emergency",
  escalation: EscalationContext
): void {
  const { clinicEmail, clinicName, patientName, messageContent, appUrl } = escalation
  if (!clinicEmail) return

  const isEmergency = type === "emergency"
  const subject = isEmergency
    ? `[URGENT] Emergency flagged by ${patientName || "a patient"}`
    : `Complaint received from ${patientName || "a patient"}`
  const heading = isEmergency ? "Emergency Flagged" : "Patient Complaint"
  const intro = isEmergency
    ? `A patient has flagged a potential emergency in their conversation with <strong>${clinicName || "your clinic"}</strong>.`
    : `A patient has raised a complaint in their conversation with <strong>${clinicName || "your clinic"}</strong>.`
  const inboxUrl = `${appUrl || "https://pearlie.org"}/clinic/appointments`

  sendEmailWithRetry({
    from: EMAIL_FROM.NOTIFICATIONS,
    to: clinicEmail,
    subject,
    html: `
      <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${isEmergency ? "#dc2626" : "#d97706"}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">${heading}</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <p style="color: #374151; font-size: 16px;">${intro}</p>
          ${patientName ? `<p style="color: #374151;"><strong>Patient:</strong> ${patientName}</p>` : ""}
          ${messageContent ? `
          <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${isEmergency ? "#dc2626" : "#d97706"};">
            <p style="color: #4b5563; margin: 0; white-space: pre-wrap;">${messageContent.substring(0, 500)}${messageContent.length > 500 ? "..." : ""}</p>
          </div>` : ""}
          <div style="text-align: center; margin-top: 30px;">
            <a href="${inboxUrl}"
               style="background-color: #0fbcb0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View in Inbox
            </a>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>This is an automated message from Pearlie</p>
        </div>
      </div>
    `,
  }).catch((err) => {
    console.error(`[chat-bot-ai] Failed to send ${type} escalation email:`, err)
  })
}

// ─── Public API ──────────────────────────────────────────────────

export async function generateIntelligentBotResponse(
  trigger: BotTrigger,
  clinic: ClinicContext,
  lead: LeadContext,
  recentMessages: ConversationMessage[],
  escalation?: EscalationContext
): Promise<string | null> {
  // 1. Pre-LLM safety checks on the latest patient message
  const lastPatientMsg = [...recentMessages]
    .reverse()
    .find((m) => m.sender_type === "patient")

  if (lastPatientMsg) {
    if (detectRedFlags(lastPatientMsg.content)) {
      if (escalation) sendEscalationEmail("emergency", escalation)
      return EMERGENCY_RESPONSE
    }
    if (detectComplaint(lastPatientMsg.content)) {
      if (escalation) sendEscalationEmail("complaint", escalation)
      return COMPLAINT_RESPONSE
    }
    if (detectPromptInjection(lastPatientMsg.content)) {
      console.warn("[chat-bot-ai] Prompt injection detected, returning safe response")
      return INJECTION_FALLBACK_RESPONSE
    }
  }

  // 2. Build prompts
  const userPrompt = buildUserPrompt(trigger, clinic, lead, recentMessages)

  // 3. Call LLM with timeout
  const raw = await callGroq(SYSTEM_PROMPT, userPrompt)
  if (!raw) return null

  // 4. Post-generation validation
  const sanitized = sanitizeResponse(raw)
  if (!sanitized || sanitized.length < 10) return null

  return sanitized
}

export { type ClinicContext, type LeadContext, type ConversationMessage, type BotTrigger }
