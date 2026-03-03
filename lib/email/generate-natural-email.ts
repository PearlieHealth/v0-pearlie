/**
 * AI-powered natural patient enquiry email generator.
 *
 * Uses Groq (LLaMA 3.3 70B) to convert structured intake form data into a
 * natural-sounding patient enquiry email. Falls back to a well-crafted
 * deterministic template if AI is unavailable.
 *
 * The goal: clinics receive what looks like a real patient email, not a
 * platform notification, so they're more likely to read and respond.
 */

import { escapeHtml } from "@/lib/escape-html"
import {
  TIMING_LABELS,
  COST_APPROACH_LABELS,
  ANXIETY_LEVEL_LABELS,
  BLOCKER_LABELS,
} from "@/lib/intake-form-config"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NaturalEmailInput {
  firstName: string
  lastName: string
  email: string
  phone: string
  treatment: string
  postcode: string
  timing: string
  preferredTimes: string[]
  bookingDate?: string | null
  bookingTime?: string | null
  locationPreference: string
  anxietyLevel: string
  decisionValues: string[]
  conversionBlocker: string
  costApproach: string
  strictBudgetAmount?: number | null
  blockerLabels?: string[]
  clinicName: string
  /** Patient's own message (chat or booking request) to weave into the email body. */
  messageContent?: string | null
}

export interface NaturalEmailResult {
  subject: string
  body: string
  aiGenerated: boolean
}

// ---------------------------------------------------------------------------
// Subject line generator (deterministic — no AI needed)
// ---------------------------------------------------------------------------

const TIME_PREF_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  weekend: "Weekend",
  weekends: "Weekend",
}

export function generateNaturalSubject(data: NaturalEmailInput): string {
  const fullName = `${data.firstName} ${data.lastName}`.trim()
  const shortTreatment = data.treatment
    ? data.treatment.replace(" / ", "/")
    : "Dental"

  // Direct enquiries (no postcode, no booking date, no preferred times) = general enquiry
  const isDirect = !data.postcode && !data.bookingDate && (!data.preferredTimes || data.preferredTimes.length === 0)

  if (isDirect) {
    return `Enquiry about ${shortTreatment} – ${fullName}`
  }

  // Full intake leads: include date/time details
  const parts: string[] = []

  if (data.bookingDate) {
    try {
      const d = new Date(data.bookingDate)
      const dayName = d.toLocaleDateString("en-GB", { weekday: "long" })
      const dayNum = d.getDate()
      const month = d.toLocaleDateString("en-GB", { month: "long" })
      parts.push(`${dayName} ${dayNum} ${month}`)
    } catch {
      // Ignore date formatting errors
    }
  }

  if (data.preferredTimes?.length > 0) {
    const timeLabel = data.preferredTimes
      .map(t => TIME_PREF_LABELS[t] || t)
      .join("/")
    parts.push(timeLabel)
  }

  const detail = parts.length > 0 ? ` (${parts.join(", ")})` : ""
  return `Enquiry about ${shortTreatment} – ${fullName}${detail}`
}

// ---------------------------------------------------------------------------
// Groq AI call
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are writing an email FROM a dental patient TO a dental clinic to enquire about an appointment. The email should read as if the patient wrote it themselves — natural, casual, and straightforward.

RULES:
- Write in first person as the patient
- Keep the tone casual and matter-of-fact — like a real person writing a quick email, not a marketing pitch
- Do NOT embellish, exaggerate, or add enthusiasm that isn't in the source data (e.g. never write "I'm looking for a brighter, whiter smile" unless the patient literally said that)
- Simply state what the patient wants — treatment, timing, date — without dressing it up
- Never mention "Pearlie", "platform", "matching", "lead", or any technology/service
- Never say "I was matched with you" or "I found you on a website"
- Weave ALL the provided patient details naturally into the prose
- Include their name, treatment interest, location/postcode, timing preference, preferred appointment times, and any concerns
- If they have dental anxiety, mention it briefly and naturally (e.g. "I'm a bit nervous about dental visits")
- If they care about pricing, mention it simply (e.g. "I'd like to understand costs upfront")
- If they have specific concerns/blockers, weave them in naturally
- If a specific booking date is provided, request that date
- If the patient wrote their own message, incorporate its intent and key points naturally — do NOT quote it verbatim, but make sure the email reflects what they said
- End with "Kind regards," followed by the patient's full name and email on separate lines
- If they have a phone number, include it after the email
- Start with "Hi," — keep it simple
- Do NOT include a subject line — only the body
- Keep it concise (100-200 words)
- Do NOT use bullet points or structured lists — write flowing prose paragraphs
- Do NOT add fake details or embellish beyond what's provided`

function buildUserPrompt(data: NaturalEmailInput): string {
  const timingLabel = TIMING_LABELS[data.timing] || data.timing || "flexible"
  const costLabel = COST_APPROACH_LABELS[data.costApproach] || data.costApproach || ""
  const anxietyLabel = ANXIETY_LEVEL_LABELS[data.anxietyLevel] || data.anxietyLevel || ""

  const timeLabels: Record<string, string> = {
    morning: "Morning (before 12pm)",
    afternoon: "Afternoon (12pm–5pm)",
    weekend: "Weekends",
    weekends: "Weekends",
  }
  const preferredTimesStr = (data.preferredTimes || [])
    .map(t => timeLabels[t] || t)
    .join(", ")

  const blockerStr = (data.blockerLabels || [])
    .map(code => BLOCKER_LABELS[code] || code)
    .join("; ")

  let bookingDateStr = ""
  if (data.bookingDate) {
    try {
      const d = new Date(data.bookingDate)
      bookingDateStr = d.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    } catch {
      bookingDateStr = data.bookingDate
    }
  }

  return `Write a patient enquiry email with these details:

Patient name: ${data.firstName} ${data.lastName}
Patient email: ${data.email}
Patient phone: ${data.phone || "not provided"}
Clinic name: ${data.clinicName}
Treatment interest: ${data.treatment}
Patient postcode: ${data.postcode}
How soon they want treatment: ${timingLabel}
Preferred appointment times: ${preferredTimesStr || "no preference"}
${bookingDateStr ? `Requested date: ${bookingDateStr}` : ""}
Anxiety level: ${anxietyLabel || "comfortable"}
Cost approach: ${costLabel || "not specified"}
${data.strictBudgetAmount ? `Budget: £${data.strictBudgetAmount}` : ""}
What matters to them: ${data.decisionValues?.join(", ") || "not specified"}
Their concerns: ${blockerStr || "none"}
${data.messageContent ? `\nPatient's own message: "${data.messageContent}"` : ""}
Write the email body only (no subject line).`
}

async function callGroqForEmail(data: NaturalEmailInput): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.warn("[natural-email] GROQ_API_KEY not set")
    return null
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)

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
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(data) },
          ],
          temperature: 0.4,
          max_tokens: 600,
        }),
        signal: controller.signal,
      }
    )

    if (!response.ok) {
      const errText = await response.text().catch(() => "")
      console.error(`[natural-email] Groq ${response.status}: ${errText}`)
      return null
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content

    if (!content || content.length < 50) {
      console.warn("[natural-email] Groq returned insufficient content")
      return null
    }

    // Safety: strip any accidental Pearlie/platform references
    const banned = ["pearlie", "platform", "matching service", "was matched", "lead notification"]
    const lower = content.toLowerCase()
    for (const phrase of banned) {
      if (lower.includes(phrase)) {
        console.warn(`[natural-email] AI output contained banned phrase "${phrase}", falling back`)
        return null
      }
    }

    return content.trim()
  } catch (error: any) {
    if (error?.name === "AbortError") {
      console.warn("[natural-email] Groq call timed out")
    } else {
      console.error("[natural-email] Groq call failed:", error)
    }
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// Fallback deterministic template
// ---------------------------------------------------------------------------

export function generateFallbackEmailBody(data: NaturalEmailInput): string {
  const fullName = `${data.firstName} ${data.lastName}`.trim()

  // Treatment
  const treatmentLine = data.treatment
    ? `I'm looking into ${data.treatment} and wanted to get in touch about availability and pricing.`
    : "I'd like to book a dental consultation."

  // Location
  const locationLine = data.postcode
    ? `I'm based in ${data.postcode}, so your clinic is conveniently located for me.`
    : ""

  // Booking date + time
  let timingLine = ""
  if (data.bookingDate) {
    try {
      const d = new Date(data.bookingDate)
      const dateStr = d.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
      const timePref = (data.preferredTimes || [])
        .map(t => TIME_PREF_LABELS[t]?.toLowerCase() || t)
        .join(" or ")
      timingLine = timePref
        ? `Ideally, I'd like an appointment on ${dateStr}, preferably in the ${timePref}.`
        : `Ideally, I'd like an appointment on ${dateStr}.`
    } catch {
      timingLine = ""
    }
  } else if (data.preferredTimes?.length > 0) {
    const timePref = data.preferredTimes
      .map(t => TIME_PREF_LABELS[t]?.toLowerCase() || t)
      .join(" or ")
    timingLine = `I'd prefer an appointment in the ${timePref} if possible.`
  }

  // Urgency
  let urgencyLine = ""
  if (data.timing === "asap") {
    urgencyLine = "I'm hoping to start treatment as soon as possible."
  } else if (data.timing === "within_week" || data.timing === "1_week") {
    urgencyLine = "I'm hoping to start treatment within the next week, if suitable."
  } else if (data.timing === "few_weeks" || data.timing === "2_weeks") {
    urgencyLine = "I'm looking to start treatment within the next few weeks."
  } else if (data.timing === "exploring" || data.timing === "flexible") {
    urgencyLine = "I'm currently exploring my options and would appreciate your guidance."
  }

  // Concerns / blockers
  const concernLines: string[] = []
  const blockers = data.blockerLabels || (data.conversionBlocker ? [data.conversionBlocker] : [])

  if (blockers.includes("UNSURE_OPTION")) {
    concernLines.push(
      "I'm currently unsure which treatment option would be best for me, so I'd really value your guidance on the different options available."
    )
  }
  if (blockers.includes("NOT_WORTH_COST")) {
    concernLines.push(
      "It's important to me to understand pricing clearly before starting treatment, including why certain options may cost more than others."
    )
  }
  if (blockers.includes("NEED_MORE_TIME")) {
    concernLines.push(
      "I'd like to take my time to understand everything clearly before making a decision."
    )
  }
  if (blockers.includes("WORRIED_COMPLEX")) {
    concernLines.push(
      "I'm a bit concerned the treatment might be more involved than I expect, so I'd appreciate an honest assessment."
    )
  }
  if (blockers.includes("BAD_EXPERIENCE")) {
    concernLines.push(
      "I've had a difficult dental experience in the past, so finding the right clinic is very important to me."
    )
  }

  // Cost approach (if not covered by blockers)
  if (data.costApproach === "strict_budget" && data.strictBudgetAmount) {
    concernLines.push(
      `I have a budget of around £${data.strictBudgetAmount.toLocaleString()} that I'd need to stay within.`
    )
  } else if (data.costApproach === "understand_value" && !blockers.includes("NOT_WORTH_COST")) {
    concernLines.push(
      "I'd like to clearly understand the options available and what makes one approach worth more than another."
    )
  } else if (data.costApproach === "best_outcome") {
    concernLines.push(
      "I'm primarily looking for the best possible result and long-term outcome."
    )
  }

  // Decision values
  const valueLines: string[] = []
  for (const val of data.decisionValues || []) {
    if (val.toLowerCase().includes("flexible appointments")) {
      valueLines.push("Flexible appointment times are important to me, particularly late afternoons or weekends.")
    }
    if (val.toLowerCase().includes("calm") || val.toLowerCase().includes("reassuring")) {
      valueLines.push("A calm and reassuring environment would be ideal for me.")
    }
    if (val.toLowerCase().includes("specialist")) {
      valueLines.push("I'd value being seen by someone with specialist experience in this area.")
    }
    if (val.toLowerCase().includes("same dentist") || val.toLowerCase().includes("long-term")) {
      valueLines.push("Building a long-term relationship with my dentist is important to me.")
    }
  }

  // Anxiety
  let anxietyLine = ""
  if (data.anxietyLevel === "comfortable" || data.anxietyLevel === "not_anxious") {
    anxietyLine = "I'm comfortable with dental visits and don't have any particular anxiety concerns."
  } else if (data.anxietyLevel === "slightly_anxious") {
    anxietyLine = "I can be a little nervous at the dentist, though I generally manage fine."
  } else if (data.anxietyLevel === "quite_anxious") {
    anxietyLine = "I do tend to feel quite anxious about dental visits, so a gentle and reassuring approach would mean a lot."
  } else if (data.anxietyLevel === "very_anxious") {
    anxietyLine = "I experience significant anxiety around dental visits and may need sedation or extra support. I'd appreciate a clinic that understands this."
  }

  // Assemble
  const paragraphs: string[] = []

  paragraphs.push("Hi,")

  // Main intro
  const intro = [`My name is ${fullName} and ${treatmentLine}`]
  if (locationLine) intro.push(locationLine)
  if (timingLine) intro.push(timingLine)
  if (urgencyLine) intro.push(urgencyLine)
  paragraphs.push(intro.join(" "))

  // Concerns
  if (concernLines.length > 0) {
    paragraphs.push(concernLines.join(" "))
  }

  // Values
  if (valueLines.length > 0) {
    paragraphs.push(valueLines.join(" "))
  }

  // Anxiety
  if (anxietyLine) {
    paragraphs.push(anxietyLine)
  }

  // Patient's own message
  if (data.messageContent) {
    paragraphs.push(data.messageContent)
  }

  // Closing
  if (data.bookingDate) {
    paragraphs.push(
      "Please let me know if the requested date and time are available, or suggest the nearest alternative."
    )
  } else {
    paragraphs.push(
      "Please let me know the next steps or any availability you have."
    )
  }

  // Signature
  const sigParts = [`Kind regards,\n${fullName}`, data.email]
  if (data.phone) sigParts.push(data.phone)
  paragraphs.push(sigParts.join("\n"))

  return paragraphs.join("\n\n")
}

// ---------------------------------------------------------------------------
// Main export: generate the full natural email
// ---------------------------------------------------------------------------

export async function generateNaturalEmail(
  data: NaturalEmailInput
): Promise<NaturalEmailResult> {
  const subject = generateNaturalSubject(data)

  // Try AI first
  const aiBody = await callGroqForEmail(data)

  if (aiBody) {
    return { subject, body: aiBody, aiGenerated: true }
  }

  // Fallback to deterministic template
  const fallbackBody = generateFallbackEmailBody(data)
  return { subject, body: fallbackBody, aiGenerated: false }
}
