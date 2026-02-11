"use client"

import { Info } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface TestInfoTooltipProps {
  title: string
  whatItDoes: string
  whatItChecks: string[]
  ifItFails: string[]
}

export function TestInfoTooltip({ title, whatItDoes, whatItChecks, ifItFails }: TestInfoTooltipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label={`Info about ${title}`}
        >
          <Info className="h-4 w-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm" side="bottom" align="start">
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground">{title}</h4>

          <div>
            <p className="text-muted-foreground">{whatItDoes}</p>
          </div>

          <div>
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">What it checks</p>
            <ul className="space-y-1">
              {whatItChecks.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs">
                  <span className="text-muted-foreground">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">If it fails</p>
            <ul className="space-y-1">
              {ifItFails.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs">
                  <span className="text-muted-foreground">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Test row tooltip - shorter explanations for individual test results
interface TestRowTooltipProps {
  explanation: string
}

export function TestRowTooltip({ explanation }: TestRowTooltipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-muted/50 focus:outline-none"
          aria-label="More info"
        >
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 text-xs" side="right" align="start">
        <p>{explanation}</p>
      </PopoverContent>
    </Popover>
  )
}

// Friendly error message mapping
export const FRIENDLY_ERROR_MESSAGES: Record<string, string> = {
  WHY_MATCHED_GENERIC_BUG:
    "All matched clinics are showing the same 'Why matched' reasons. This usually means: (1) reasons are empty/null, or (2) clinics share identical tags. Fix: add stronger, different tags per clinic and ensure reasons-engine never returns null.",
  "Cannot read properties of undefined":
    "A dashboard card received missing data. Fix: add default empty arrays/zero values before looping.",
  forEach: "A dashboard card received missing data. Fix: add default empty arrays/zero values before looping.",
  filter: "A dashboard card received missing data. Fix: add default empty arrays/zero values before looping.",
  toLocaleString:
    "A number value was undefined when trying to format it. Fix: add default value of 0 in the component.",
}

export function getFriendlyErrorMessage(error: string): string | null {
  for (const [key, message] of Object.entries(FRIENDLY_ERROR_MESSAGES)) {
    if (error.includes(key)) {
      return message
    }
  }
  return null
}

// Test info content definitions
export const TEST_INFO = {
  liveFlow: {
    title: "Live Patient Journey Test",
    whatItDoes: "Simulates a real patient submitting the form and verifies the site can produce clinic matches safely.",
    whatItChecks: [
      "A test lead can be created and saved correctly (raw_answers + form_version).",
      "Matching returns at least 2 clinics.",
      "Each clinic shows exactly 3 'Why matched' reasons.",
      "Reasons never mention distance or postcode (those are shown elsewhere).",
      "Reason tags are valid and not empty.",
    ],
    ifItFails: [
      "Check Clinic Tag Coverage (Match Readiness) — clinics may be missing required tags.",
      "Check the latest code change to matching/reasons-engine.",
      "Re-run after fixing tags or errors.",
    ],
  },
  selfTest: {
    title: "System Health Checks",
    whatItDoes: "Quick internal checks to confirm the database + matching engine are working.",
    whatItChecks: [
      "Database write/read works (creates and deletes a test lead).",
      "Minimal lead submission doesn't crash the server.",
      "Per-clinic tags are isolated (one clinic's tags don't affect others).",
      "Form version tracking is present on new leads.",
      "Reasons are unique and personalised (not identical across clinics).",
    ],
    ifItFails: [
      "Open the failing item to see the exact error.",
      "Most common fix: clinics need better tag coverage or the reasons engine is returning null.",
    ],
  },
  analyticsCheck: {
    title: "Analytics Sanity Check",
    whatItDoes: "Verifies dashboard numbers can't show impossible metrics.",
    whatItChecks: [
      "Percentages are clamped 0–100% and don't divide by zero.",
      "Numerator can't exceed denominator (e.g., clicks can't exceed leads unless defined).",
      "Cards render even when there is no data (no runtime errors).",
    ],
    ifItFails: ["A card is receiving undefined/empty arrays — add defensive defaults in that component."],
  },
}

// Test row explanations
export const TEST_ROW_EXPLANATIONS: Record<string, string> = {
  // Live Flow Test rows
  "Lead Created": "Verifies a test patient form submission is saved to the database with all required fields.",
  "Data Contract": "Ensures raw_answers JSON and form_version are present for future-proofing.",
  "Clinics Matched": "Confirms at least 2 clinics are returned so patients have meaningful choices.",
  "Reasons Generated": "Checks each clinic has exactly 3 personalised 'Why matched' reasons.",
  "No Distance Words": "Ensures reasons focus on clinic qualities, not proximity (distance shown separately).",
  "Valid Tag Keys": "Confirms all reason tags are from the canonical tag schema.",
  Cleanup: "Removes the test lead from the database to keep data clean.",

  // Self-Test rows
  "Full Lead Insert": "Tests complete lead creation with all fields populated.",
  "Minimal Lead Insert": "Tests lead creation with only required fields to catch validation bugs.",
  "Matching Pipeline": "Runs the full matching algorithm to ensure it returns valid results.",
  "Per-Clinic Filter Isolation": "Ensures one clinic's tags don't accidentally affect another clinic.",
  "Data Integrity": "Validates database constraints and foreign key relationships.",
  "Form Version Tracking": "Confirms new leads include the form version for analytics.",
  "Reasons Differentiation": "Checks that different clinics get different 'Why matched' reasons.",

  // Analytics Check rows
  "Form Completion Rate": "Percentage of visitors who complete the intake form.",
  "Clinic Click Rate": "Percentage of matched leads who click on a clinic profile.",
  "Booking Rate": "Percentage of clinic viewers who click to book.",
  "Duplicate Events": "Checks for accidental duplicate analytics events.",
  "Leads Without Matches": "Identifies leads that failed to get clinic matches.",
  "Match Results With Reasons": "Ensures all match results have 'Why matched' reasons attached.",
}
