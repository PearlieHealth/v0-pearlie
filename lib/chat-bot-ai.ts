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
}

interface ConversationMessage {
  sender_type: "patient" | "clinic" | "bot"
  content: string
}

type BotTrigger = "greeting" | "suggestions" | "no_reply" | "follow_up"

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

### 7. Never invent information
- Only reference data you are given in the CLINIC CONTEXT below.
- If data is missing: "The clinic can confirm this when they review your message."
- NEVER invent availability, pricing, policies, or treatment times.
- NEVER say "You're booked" or "Confirmed". Say: "I can help you request an appointment; the clinic will confirm."

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
- Max 2 questions per message.
- Always offer a next-best-action: "Would you like me to send this to the clinic team?" / "Do you prefer weekday or weekend?"
- If patient pushes for clinical advice: "I can't advise clinically, but I can pass your question to the clinic so they can answer properly."
- Keep responses under 3 sentences. Be warm and conversational, not robotic.
- Use the patient's first name if available.`

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
    .map((m) => `[${m.sender_type}]: ${m.content}`)
    .join("\n")

  switch (trigger) {
    case "greeting":
      return `${clinicInfo}\n${leadInfo}\n\nThe patient just sent their first message. Write a warm greeting that:\n- Welcomes them by first name if available\n- Acknowledges what they're interested in (if treatment_interest is known)\n- Mentions one relevant clinic fact (e.g., opening hours, NHS acceptance, parking) if available\n- Lets them know the clinic team will respond\n- Keeps it to 2-3 sentences\n\nPatient's message:\n${history}`

    case "suggestions":
      return `${clinicInfo}\n${leadInfo}\n\nGenerate 4 short suggested questions the patient might want to ask the clinic. Make them relevant to their treatment interest if known. Format as a bullet list with "•" prefix. Keep each under 12 words. Do NOT include questions about diagnosis or medical advice.`

    case "no_reply":
      return `${clinicInfo}\n${leadInfo}\n\nThe clinic hasn't replied in 30+ minutes. Write a short reassurance message that:\n- Manages expectations (clinics typically respond within a few hours)\n- Mentions they'll be notified by email when the clinic replies\n- If opening hours are available, mention whether the clinic is currently open\n- Keeps it to 2 sentences\n- Does NOT apologise or make excuses for the clinic`

    case "follow_up":
      return `${clinicInfo}\n${leadInfo}\n\nConversation so far:\n${history}\n\nThe patient just sent a follow-up message and the clinic hasn't replied yet. Write a brief, helpful response that:\n- Acknowledges their message\n- If you can answer from the clinic context, do so briefly\n- If it's a clinical question, route to the clinic team\n- If it's about pricing and you don't have it, say the clinic can provide a quote\n- Keeps it to 2-3 sentences`
  }
}

function buildClinicSummary(clinic: ClinicContext): string {
  const parts = [`CLINIC CONTEXT:\n- Name: ${clinic.name}`]
  if (clinic.phone) parts.push(`- Phone: ${clinic.phone}`)
  if (clinic.treatments?.length)
    parts.push(`- Treatments offered: ${clinic.treatments.join(", ")}`)
  if (clinic.price_range) parts.push(`- Price range: ${clinic.price_range}`)
  if (clinic.accepts_nhs) parts.push(`- Accepts NHS patients`)
  if (clinic.parking_available) parts.push(`- Parking available`)
  if (clinic.wheelchair_accessible) parts.push(`- Wheelchair accessible`)
  if (clinic.opening_hours) {
    try {
      const hours = typeof clinic.opening_hours === "string"
        ? JSON.parse(clinic.opening_hours)
        : clinic.opening_hours
      const formatted = Object.entries(hours)
        .map(([day, time]) => `${day}: ${time}`)
        .join(", ")
      if (formatted) parts.push(`- Opening hours: ${formatted}`)
    } catch {
      // skip malformed hours
    }
  }
  if (clinic.description)
    parts.push(`- Description: ${clinic.description.substring(0, 200)}`)
  return parts.join("\n")
}

function buildLeadSummary(lead: LeadContext): string {
  const parts = ["PATIENT CONTEXT:"]
  if (lead.first_name) parts.push(`- First name: ${lead.first_name}`)
  if (lead.treatment_interest)
    parts.push(`- Treatment interest: ${lead.treatment_interest}`)
  if (lead.urgency) parts.push(`- Urgency: ${lead.urgency}`)
  if (lead.budget_range) parts.push(`- Budget preference: ${lead.budget_range}`)
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

function sanitizeResponse(text: string): string {
  let sanitized = text
  for (const phrase of BANNED_PHRASES) {
    const regex = new RegExp(phrase, "gi")
    if (regex.test(sanitized)) {
      // Replace banned phrase with safe alternative
      sanitized = sanitized.replace(regex, "…")
    }
  }
  return sanitized.trim()
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
          temperature: 0.6,
          max_tokens: 300,
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

// ─── Public API ──────────────────────────────────────────────────

export async function generateIntelligentBotResponse(
  trigger: BotTrigger,
  clinic: ClinicContext,
  lead: LeadContext,
  recentMessages: ConversationMessage[]
): Promise<string | null> {
  // 1. Pre-LLM safety checks on the latest patient message
  const lastPatientMsg = [...recentMessages]
    .reverse()
    .find((m) => m.sender_type === "patient")

  if (lastPatientMsg) {
    if (detectRedFlags(lastPatientMsg.content)) {
      return EMERGENCY_RESPONSE
    }
    if (detectComplaint(lastPatientMsg.content)) {
      return COMPLAINT_RESPONSE
    }
  }

  // 2. Build prompts
  const userPrompt = buildUserPrompt(trigger, clinic, lead, recentMessages)

  // 3. Call LLM with timeout
  const raw = await callGroq(SYSTEM_PROMPT, userPrompt)
  if (!raw) return null

  // 4. Post-generation validation
  const sanitized = sanitizeResponse(raw)
  if (sanitized.length < 10) return null

  return sanitized
}

export { type ClinicContext, type LeadContext, type ConversationMessage, type BotTrigger }
