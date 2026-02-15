import { z } from "zod"
import { SCHEMA_VERSION } from "@/lib/intake-form-config"

export const CURRENT_SCHEMA_VERSION = SCHEMA_VERSION

export const IntakeFormSchema = z.object({
  // Core fields (required)
  treatment: z.string().min(1, "Please select a treatment"),
  postcode: z.string().regex(/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i, "Please enter a valid UK postcode"),
  contact_method: z.enum(["email", "phone"]).default("email"),

  // Contact info - nullish allows null, undefined, or missing
  email: z.string().email("Please enter a valid email").nullish().default(null),
  phone: z.string().min(10, "Please enter a valid phone number").nullish().default(null),

  budget_range: z.string().nullish().default("unspecified"),
  cost_approach: z
    .enum(["options_then_cost", "payments_preferred", "rough_range_flexible", "strict_budget"])
    .nullish()
    .default(null),
  strict_budget_mode: z.enum(["discuss_with_clinic", "entered_amount"]).nullish().default(null),
  strict_budget_amount: z.number().nullish().default(null),

  timing: z.string().nullish().default("flexible"),
  location_preference: z.enum(["near_home_work", "travel_a_bit", "travel_further"]).nullish().default(null),
  anxiety_level: z.enum(["comfortable", "slightly_anxious", "quite_anxious", "very_anxious"]).nullish().default(null),
  outcome_priority_label: z.string().nullish().default(null),

  blocker: z.string().nullish().default(null),
  blocker_code: z
    .enum([
      "COST_VALUE",
      "PAYMENTS_HELP",
      "NEED_TIME",
      "UNSURE_OPTION",
      "ANXIETY_FEAR",
      "COMPLEXITY_WORRY",
      "RIGHT_CLINIC",
    ])
    .nullish()
    .default(null),

  // Decision factors (values) - max 3, empty array if missing/null
  decision_factors: z.array(z.string()).nullish().default([]),

  // Geo data - populated by server
  latitude: z.number().nullish().default(null),
  longitude: z.number().nullish().default(null),
  city: z.string().nullish().default(null),

  // Schema version for future compatibility
  schema_version: z.number().nullish().default(CURRENT_SCHEMA_VERSION),
})

export type IntakeFormData = z.infer<typeof IntakeFormSchema>

export function safeParseIntake(
  data: unknown,
): { success: true; data: IntakeFormData } | { success: false; error: z.ZodError } {
  return IntakeFormSchema.safeParse(data)
}

// Helper to apply defaults to partial form data
export function withDefaults(partial: Partial<IntakeFormData>): IntakeFormData {
  return IntakeFormSchema.parse({
    treatment: partial.treatment || "",
    postcode: partial.postcode || "",
    contact_method: partial.contact_method || "email",
    email: partial.email,
    phone: partial.phone,
    budget_range: partial.budget_range || "unspecified",
    cost_approach: partial.cost_approach,
    strict_budget_mode: partial.strict_budget_mode,
    strict_budget_amount: partial.strict_budget_amount,
    timing: partial.timing || "flexible",
    location_preference: partial.location_preference,
    anxiety_level: partial.anxiety_level,
    outcome_priority_label: partial.outcome_priority_label,
    blocker: partial.blocker,
    blocker_code: partial.blocker_code,
    decision_factors: partial.decision_factors || [],
    latitude: partial.latitude,
    longitude: partial.longitude,
    city: partial.city,
    schema_version: partial.schema_version || CURRENT_SCHEMA_VERSION,
  })
}
