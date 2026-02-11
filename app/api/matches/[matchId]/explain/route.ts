import { generateText } from "ai"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    const { matchId } = await params
    const supabase = await createClient()

    // Fetch the match with clinic and lead data
    const { data: match, error: matchError } = await supabase
      .from("match_results")
      .select(`
        *,
        clinic:clinics(*),
        lead:leads(*)
      `)
      .eq("id", matchId)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 })
    }

    // If already has an explanation, return it
    if (match.ai_explanation) {
      return NextResponse.json({ explanation: match.ai_explanation })
    }

    const clinic = match.clinic
    const lead = match.lead

    // Build the prompt for AI explanation
    const prompt = `You are a helpful dental clinic matching assistant. Generate a warm, personalized 2-3 sentence explanation for why this clinic is a great match for this patient. Be specific and reassuring.

PATIENT INFORMATION:
- Treatment interest: ${lead.treatment_interest || "General dental care"}
- Budget range: ${lead.budget_range || "Not specified"}
- Decision priorities: ${lead.decision_values?.join(", ") || "Not specified"}
- Timing preference: ${lead.preferred_timing || "Flexible"}
- Main concern: ${lead.conversion_blocker || "None specified"}
- Location: ${lead.postcode || "Not specified"}

CLINIC INFORMATION:
- Name: ${clinic.name}
- Location: ${clinic.city || clinic.postcode || "Local area"}
- Specialties: ${clinic.specialties?.join(", ") || "General dentistry"}
- Description: ${clinic.description || "Professional dental practice"}

MATCH REASONS (bullet points from our algorithm):
${match.reasons?.map((r: string) => `- ${r}`).join("\n") || "- Great overall match"}

Match Score: ${match.score}/100

Write a personalized, warm explanation (2-3 sentences) addressing the patient directly (use "you/your"). Focus on how this clinic specifically addresses their needs and concerns. Do not use bullet points - write in flowing prose. Do not mention the match score.`

    // Generate explanation using Groq (via AI Gateway)
    const { text } = await generateText({
      model: "groq/llama-3.3-70b-versatile",
      prompt,
      maxOutputTokens: 200,
      temperature: 0.7,
    })

    // Save the explanation to the database
    const { error: updateError } = await supabase
      .from("match_results")
      .update({ ai_explanation: text })
      .eq("id", matchId)

    if (updateError) {
      console.error("Failed to save AI explanation:", updateError)
    }

    return NextResponse.json({ explanation: text })
  } catch (error) {
    console.error("Error generating AI explanation:", error)
    return NextResponse.json({ error: "Failed to generate explanation" }, { status: 500 })
  }
}
