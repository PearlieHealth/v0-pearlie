"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, ChevronRight, ChevronLeft, Check } from "lucide-react"
import { TREATMENT_OPTIONS } from "@/lib/constants"
import { Q4_TAGS, Q8_TAGS, Q10_TAGS, validateClinicTags } from "@/lib/matching/tag-validation"
import { REASON_TEMPLATES } from "@/lib/matching/tag-schema"

interface OnboardingTagWizardProps {
  initialTreatments: string[]
  initialTags: string[]
  onComplete: (treatments: string[], tags: string[]) => void
  onCancel: () => void
}

const TAG_LABELS: Record<string, string> = {
  // Q4
  TAG_CLEAR_EXPLANATIONS: "Clear explanations before treatment",
  TAG_LISTENED_TO_RESPECTED: "Makes patients feel listened to & respected",
  TAG_CALM_REASSURING: "Calm, reassuring environment",
  TAG_CLEAR_PRICING_UPFRONT: "Clear pricing upfront",
  TAG_FLEXIBLE_APPOINTMENTS: "Flexible appointment times",
  TAG_SPECIALIST_LEVEL_EXPERIENCE: "Specialist-level experience",
  TAG_STRONG_REPUTATION_REVIEWS: "Strong reviews and reputation",
  // Q5
  TAG_GOOD_FOR_COST_CONCERNS: "Good at addressing cost concerns",
  TAG_FINANCE_AVAILABLE: "Finance / monthly payments available",
  TAG_DECISION_SUPPORTIVE: "Supportive of patients who need time to decide",
  TAG_OPTION_CLARITY_SUPPORT: "Helps patients understand their options",
  TAG_ANXIETY_FRIENDLY: "Experienced with anxious patients",
  TAG_COMPLEX_CASES_WELCOME: "Welcomes complex cases",
  TAG_RIGHT_FIT_FOCUSED: "Focused on finding the right fit",
  // Q8
  TAG_DISCUSS_OPTIONS_BEFORE_COST: "Discusses options before cost",
  TAG_MONTHLY_PAYMENTS_PREFERRED: "Monthly payment plans preferred",
  TAG_FLEXIBLE_BUDGET_OK: "Flexible about budget discussions",
  TAG_STRICT_BUDGET_SUPPORTIVE: "Supportive of strict budgets",
  // Q10
  TAG_OK_WITH_ANXIOUS_PATIENTS: "Experienced with anxious patients",
  TAG_SEDATION_AVAILABLE: "Sedation options available",
}

export function OnboardingTagWizard({
  initialTreatments,
  initialTags,
  onComplete,
  onCancel,
}: OnboardingTagWizardProps) {
  const [step, setStep] = useState(0)
  const [treatments, setTreatments] = useState<string[]>(initialTreatments)
  const [tags, setTags] = useState<string[]>(initialTags)

  const steps = [
    { title: "Treatments Offered", description: "What treatments does this clinic provide?" },
    { title: "Clinic Strengths (Q4)", description: "What matters most when choosing this clinic?" },
    { title: "Cost Handling (Q8)", description: "How does this clinic discuss treatment costs?" },
    { title: "Anxiety Support (Q10)", description: "How does this clinic support anxious patients?" },
  ]

  const toggleTreatment = (treatment: string) => {
    setTreatments((prev) => (prev.includes(treatment) ? prev.filter((t) => t !== treatment) : [...prev, treatment]))
  }

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const validation = validateClinicTags(tags, treatments)

  const getRecommendedTags = () => {
    const recommended: string[] = []

    // Always recommend these basics
    if (!tags.includes("TAG_CLEAR_EXPLANATIONS")) recommended.push("TAG_CLEAR_EXPLANATIONS")
    if (!tags.includes("TAG_RIGHT_FIT_FOCUSED")) recommended.push("TAG_RIGHT_FIT_FOCUSED")

    // Based on treatments
    if (treatments.includes("Invisalign") || treatments.includes("Veneers")) {
      if (!tags.includes("TAG_SPECIALIST_LEVEL_EXPERIENCE")) recommended.push("TAG_SPECIALIST_LEVEL_EXPERIENCE")
    }

    // Based on existing tags
    if (tags.includes("TAG_CALM_REASSURING") && !tags.includes("TAG_OK_WITH_ANXIOUS_PATIENTS")) {
      recommended.push("TAG_OK_WITH_ANXIOUS_PATIENTS")
    }

    return recommended.slice(0, 4)
  }

  const getMatchPreview = () => {
    const matchedPatients: string[] = []

    tags.forEach((tag) => {
      const template = REASON_TEMPLATES[tag as keyof typeof REASON_TEMPLATES]
      if (template) {
        matchedPatients.push(template)
      }
    })

    return matchedPatients.slice(0, 4)
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                    ? "bg-primary/20 text-primary border-2 border-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && <div className="w-8 h-0.5 bg-muted mx-1" />}
          </div>
        ))}
      </div>

      {/* Current Step */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{steps[step].title}</CardTitle>
          <CardDescription>{steps[step].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 0 && (
            <div className="grid grid-cols-2 gap-2">
              {TREATMENT_OPTIONS.map((treatment) => (
                <label
                  key={treatment}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    treatments.includes(treatment) ? "bg-primary/10 border-primary" : "bg-background hover:bg-muted"
                  }`}
                >
                  <Checkbox
                    checked={treatments.includes(treatment)}
                    onCheckedChange={() => toggleTreatment(treatment)}
                  />
                  <span className="text-sm">{treatment}</span>
                </label>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-2">
              {Q4_TAGS.map((tag) => (
                <label
                  key={tag}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    tags.includes(tag) ? "bg-primary/10 border-primary" : "bg-background hover:bg-muted"
                  }`}
                >
                  <Checkbox checked={tags.includes(tag)} onCheckedChange={() => toggleTag(tag)} />
                  <span className="text-sm">{TAG_LABELS[tag]}</span>
                </label>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              {Q8_TAGS.map((tag) => (
                <label
                  key={tag}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    tags.includes(tag) ? "bg-primary/10 border-primary" : "bg-background hover:bg-muted"
                  }`}
                >
                  <Checkbox checked={tags.includes(tag)} onCheckedChange={() => toggleTag(tag)} />
                  <span className="text-sm">{TAG_LABELS[tag]}</span>
                </label>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2">
              {Q10_TAGS.map((tag) => (
                <label
                  key={tag}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    tags.includes(tag) ? "bg-primary/10 border-primary" : "bg-background hover:bg-muted"
                  }`}
                >
                  <Checkbox checked={tags.includes(tag)} onCheckedChange={() => toggleTag(tag)} />
                  <span className="text-sm">{TAG_LABELS[tag]}</span>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Match Preview */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            This clinic will match patients who selected:
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getMatchPreview().length > 0 ? (
            <ul className="text-sm space-y-1">
              {getMatchPreview().map((preview, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{preview}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Add tags to see match preview</p>
          )}
        </CardContent>
      </Card>

      {/* Recommended Tags */}
      {getRecommendedTags().length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Recommended:</span>
          {getRecommendedTags().map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="cursor-pointer hover:bg-primary/10"
              onClick={() => toggleTag(tag)}
            >
              + {TAG_LABELS[tag]}
            </Badge>
          ))}
        </div>
      )}

      {/* Status */}
      <div className="flex items-center gap-2">
        <Badge
          variant={validation.status === "OK" ? "default" : validation.status === "WEAK" ? "secondary" : "destructive"}
        >
          {validation.status}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {validation.matchingTagCount} matching tags
          {validation.missingCategories.length > 0 && ` • Missing: ${validation.missingCategories.join(", ")}`}
        </span>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={step === 0 ? onCancel : () => setStep(step - 1)}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          {step === 0 ? "Cancel" : "Back"}
        </Button>

        {step < steps.length - 1 ? (
          <Button onClick={() => setStep(step + 1)}>
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={() => onComplete(treatments, tags)} disabled={!validation.canSave}>
            <Check className="w-4 h-4 mr-2" />
            Save Tags
          </Button>
        )}
      </div>
    </div>
  )
}
