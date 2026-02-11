/**
 * AI-powered reason generation using Groq
 * Extracted from algorithm.ts to be used by the unified matching system
 */

export interface AIReasonsResult {
  headline: string
  reasons: string[]
  proof: string
  source: "ai" | "fallback_template"
}

interface LeadContext {
  id: string
  treatment: string
  priorities: string[]
  anxietyLevel?: string
  costApproach?: string
}

interface ClinicContext {
  id: string
  name: string
  filterKeys: string[]
  matchedTags: string[]
}

/**
 * Call Groq API to generate personalized match reasons
 */
async function callGroqAPI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.warn("[ai-reasons] GROQ_API_KEY not set, using fallback")
    throw new Error("GROQ_API_KEY not configured")
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
      temperature: 0.7,
      max_tokens: 400,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Groq API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ""
}

/**
 * Generate AI reasons for a single clinic
 */
async function generateAIReasons(
  lead: LeadContext,
  clinic: ClinicContext,
): Promise<AIReasonsResult> {
  const systemPrompt = `You write patient-facing match reasons for dental clinic recommendations. Professional but warm tone.

OUTPUT: JSON only with keys: headline, reasons (array of 3), proof

TONE RULES:
- UK English, professional yet approachable
- Confident and reassuring - patients are making an important health decision
- Specific and grounded in clinic capabilities
- Can use positive language: experienced, trusted, dedicated, quality care, patient-focused
- Avoid generic fluff - each sentence should convey real information
- EACH REASON MUST BE UNIQUE - do not repeat phrases used for other clinics

GOOD EXAMPLES:
- "Known for taking time to explain treatment options clearly before you commit."
- "Flexible payment plans available, including 0% finance options."
- "Experienced with anxious patients - a calm, supportive environment throughout."
- "Strong track record with this treatment type and consistently positive reviews."

FORMAT:
- headline: Concise benefit statement (max 50 chars). E.g. "Trusted care with flexible payment"
- reasons: 3 distinct sentences (8-18 words each), grounded in the clinic's actual tags
- proof: One credibility line (e.g. "Verified partner with 4.8★ rating")

CRITICAL: Only mention services/features the clinic actually has based on provided tags.`

  // Internal context (not shown to patient)
  const internalContext = {
    treatment: lead.treatment,
    priorities: lead.priorities,
    anxietyLevel: lead.anxietyLevel,
    costApproach: lead.costApproach,
  }

  const userPrompt = `Clinic: ${clinic.name}
Clinic tags: ${clinic.filterKeys.join(", ")}
Matched tags: ${clinic.matchedTags.join(", ")}

Internal patient context (use to prioritize, NOT to mention):
${JSON.stringify(internalContext)}

Generate JSON with headline, reasons (3 bullets), and proof for this match.`

  try {
    const aiResponse = await callGroqAPI(systemPrompt, userPrompt)
    
    // Parse JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn("[ai-reasons] Could not parse JSON from AI response for", clinic.name)
      return buildFallbackReasons(lead, clinic)
    }

    const parsed = JSON.parse(jsonMatch[0])
    
    if (
      parsed.headline &&
      Array.isArray(parsed.reasons) &&
      parsed.reasons.length === 3 &&
      parsed.proof
    ) {
      console.log("[ai-reasons] AI generated reasons for", clinic.name, ":", parsed.headline)
      return {
        headline: parsed.headline,
        reasons: parsed.reasons,
        proof: parsed.proof,
        source: "ai",
      }
    }

    console.warn("[ai-reasons] Invalid AI response structure for", clinic.name)
    return buildFallbackReasons(lead, clinic)
  } catch (error) {
    console.error("[ai-reasons] Error generating AI reasons for", clinic.name, error)
    return buildFallbackReasons(lead, clinic)
  }
}

/**
 * Build fallback reasons when AI is unavailable
 */
function buildFallbackReasons(lead: LeadContext, clinic: ClinicContext): AIReasonsResult {
  const reasons: string[] = []
  const treatment = lead.treatment || "dental treatment"

  // Reason 1: Treatment match
  if (clinic.matchedTags.some(t => t.toLowerCase().includes("treatment") || t.toLowerCase().includes("experienced"))) {
    reasons.push(`Strong track record with ${treatment} patients and proven expertise in this area.`)
  } else {
    reasons.push(`Experienced team equipped to deliver quality ${treatment} outcomes.`)
  }

  // Reason 2: Based on priorities or general quality
  if (clinic.filterKeys.some(k => k.includes("PRICING") || k.includes("pricing") || k.includes("FINANCE"))) {
    reasons.push("Flexible payment options available, including finance plans to spread the cost.")
  } else if (clinic.filterKeys.some(k => k.includes("CALM") || k.includes("calm") || k.includes("ANXIOUS"))) {
    reasons.push("Known for a calm, supportive environment that helps nervous patients feel at ease.")
  } else if (clinic.filterKeys.some(k => k.includes("LISTEN") || k.includes("listen"))) {
    reasons.push("Patient-focused approach where your concerns are heard and respected.")
  } else {
    reasons.push("Clear communication and a no-pressure approach to treatment decisions.")
  }

  // Reason 3: Communication/explanations
  if (clinic.filterKeys.some(k => k.includes("EXPLANATION") || k.includes("explanation"))) {
    reasons.push("Takes time to explain all options clearly so you can make informed decisions.")
  } else {
    reasons.push("Transparent process with clear expectations at every stage of your care.")
  }

  return {
    headline: `Quality ${treatment} care`,
    reasons,
    proof: "Verified partner in our network",
    source: "fallback_template",
  }
}

/**
 * Generate AI reasons for multiple clinics sequentially to avoid repetition
 */
export async function generateAIReasonsForClinics(
  lead: LeadContext,
  clinics: ClinicContext[],
): Promise<Map<string, AIReasonsResult>> {
  const results = new Map<string, AIReasonsResult>()
  const previousReasons: string[] = [] // Track all generated reasons to avoid repetition
  
  console.log("[ai-reasons] Starting AI generation for", clinics.length, "clinics")
  
  // Process sequentially so we can pass context about previous reasons
  for (const clinic of clinics) {
    console.log("[ai-reasons] Generating for clinic:", clinic.name, "- avoiding", previousReasons.length, "previous phrases")
    const result = await generateAIReasonsWithContext(lead, clinic, previousReasons)
    results.set(clinic.id, result)
    console.log("[ai-reasons] Result source:", result.source, "- headline:", result.headline)
    
    // Add these reasons to the list to avoid in future generations
    previousReasons.push(...result.reasons)
  }
  
  return results
}

/**
 * Generate AI reasons with context about what was already used
 */
async function generateAIReasonsWithContext(
  lead: LeadContext,
  clinic: ClinicContext,
  previousReasons: string[],
): Promise<AIReasonsResult> {
  // Generate variation seed from lead_id + clinic_id for controlled micro-variation
  const seedString = `${lead.id}-${clinic.id}`
  const variationSeed = seedString.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 100

  const clinicIndex = previousReasons.length / 3 + 1 // Which clinic number this is
  
  const avoidSection = previousReasons.length > 0 
    ? `\n\n**CRITICAL - DO NOT REPEAT THESE PHRASES** (used for other clinics):\n${previousReasons.map(r => `- "${r}"`).join("\n")}\n\nYou MUST write completely different sentences. Use different vocabulary, different sentence structures, different angles.`
    : ""

  // Assign different writing angles based on clinic position
  const angleInstructions = [
    "Focus on PATIENT EXPERIENCE - how they'll feel during visits",
    "Focus on PRACTICAL BENEFITS - convenience, cost, time savings", 
    "Focus on EXPERTISE & OUTCOMES - quality, track record, results",
    "Focus on TRUST & COMMUNICATION - transparency, honesty, being heard",
    "Focus on ACCESSIBILITY - ease of booking, flexibility, availability"
  ]
  const angle = angleInstructions[(Math.floor(clinicIndex) - 1) % angleInstructions.length]

  const systemPrompt = `You write patient-facing match reasons for dental clinic recommendations. Professional but warm tone.

OUTPUT: JSON only with keys: headline, reasons (array of 3), proof

THIS IS CLINIC #${Math.floor(clinicIndex)} - Your writing angle: ${angle}

TONE RULES:
- UK English, professional yet approachable
- Confident and reassuring
- Specific and grounded in clinic capabilities
- Can use positive language: experienced, trusted, quality care

FORMAT:
- headline: Concise benefit (max 50 chars)
- reasons: 3 sentences (8-18 words each), each highlighting different aspects
- proof: One credibility line

VARIATION SEED ${variationSeed}:
- 0-33: Start sentences with patient benefit ("Helps you...", "Ensures you...")
- 34-66: Start with clinic strength ("Known for...", "Offers...")  
- 67-99: Start with outcome ("For better...", "So you can...")

CRITICAL: Only mention services the clinic actually has based on provided tags.${avoidSection}`

  // Internal context (not shown to patient)
  const internalContext = {
    treatment: lead.treatment,
    priorities: lead.priorities,
    anxietyLevel: lead.anxietyLevel,
    costApproach: lead.costApproach,
  }

  const userPrompt = `Clinic: ${clinic.name}
Clinic tags: ${clinic.filterKeys.join(", ")}
Matched tags: ${clinic.matchedTags.join(", ")}

Internal patient context (use to prioritize, NOT to mention):
${JSON.stringify(internalContext)}

Generate JSON with headline, reasons (3 bullets), and proof for this match.`

  try {
    const aiResponse = await callGroqAPI(systemPrompt, userPrompt)
    
    // Parse JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn("[ai-reasons] Could not parse JSON from AI response for", clinic.name)
      return buildFallbackReasons(lead, clinic)
    }

    const parsed = JSON.parse(jsonMatch[0])
    
    if (
      parsed.headline &&
      Array.isArray(parsed.reasons) &&
      parsed.reasons.length === 3 &&
      parsed.proof
    ) {
      console.log("[ai-reasons] AI generated reasons for", clinic.name, ":", parsed.headline)
      return {
        headline: parsed.headline,
        reasons: parsed.reasons,
        proof: parsed.proof,
        source: "ai",
      }
    }

    console.warn("[ai-reasons] Invalid AI response structure for", clinic.name)
    return buildFallbackReasons(lead, clinic)
  } catch (error) {
    console.error("[ai-reasons] Error generating AI reasons for", clinic.name, error)
    return buildFallbackReasons(lead, clinic)
  }
}
