/**
 * Clinic Highlight Chips Configuration
 * These are display-only badges shown on match results to differentiate clinics.
 * They are NOT used in the matching algorithm - just for visual differentiation.
 */

export interface HighlightOption {
  value: string
  label: string
  icon?: string // Optional icon name for future use
}

export interface HighlightCategory {
  id: string
  label: string
  description: string
  options: HighlightOption[]
}

export const HIGHLIGHT_CATEGORIES: HighlightCategory[] = [
  {
    id: "accessibility",
    label: "Accessibility & Convenience",
    description: "Physical access and convenience features",
    options: [
      { value: "wheelchair_access", label: "Wheelchair accessible" },
      { value: "step_free", label: "Step-free access" },
      { value: "parking_onsite", label: "On-site parking" },
      { value: "parking_nearby", label: "Parking nearby" },
      { value: "public_transport", label: "Near public transport" },
    ],
  },
  {
    id: "payment",
    label: "Payment & Finance",
    description: "Payment options and financial assistance",
    options: [
      { value: "finance_0_percent", label: "0% finance available" },
      { value: "finance_available", label: "Finance options" },
      { value: "payment_plans", label: "Payment plans" },
      { value: "nhs_available", label: "NHS patients accepted" },
      { value: "accepts_denplan", label: "Accepts Denplan" },
    ],
  },
  {
    id: "technology",
    label: "Technology & Equipment",
    description: "Modern equipment and technology",
    options: [
      { value: "digital_xrays", label: "Digital X-rays" },
      { value: "intraoral_scanner", label: "Intraoral scanner" },
      { value: "same_day_crowns", label: "Same-day crowns" },
      { value: "3d_imaging", label: "3D imaging/CBCT" },
      { value: "laser_dentistry", label: "Laser dentistry" },
    ],
  },
  {
    id: "comfort",
    label: "Comfort & Anxiety Support",
    description: "Features for nervous patients",
    options: [
      { value: "sedation_available", label: "Sedation available" },
      { value: "anxiety_friendly", label: "Anxiety-friendly" },
      { value: "relaxing_environment", label: "Relaxing environment" },
      { value: "noise_cancelling", label: "Noise-cancelling headphones" },
      { value: "tv_in_chair", label: "TV screens at chair" },
    ],
  },
  {
    id: "scheduling",
    label: "Scheduling & Availability",
    description: "Appointment flexibility",
    options: [
      { value: "evening_appointments", label: "Evening appointments" },
      { value: "weekend_appointments", label: "Weekend appointments" },
      { value: "same_day_emergency", label: "Same-day emergency" },
      { value: "online_booking", label: "Online booking" },
      { value: "short_wait_times", label: "Short wait times" },
    ],
  },
  {
    id: "specialties",
    label: "Specialties & Expertise",
    description: "Specialist services available",
    options: [
      { value: "orthodontist_onsite", label: "Orthodontist on-site" },
      { value: "implant_specialist", label: "Implant specialist" },
      { value: "cosmetic_specialist", label: "Cosmetic specialist" },
      { value: "pediatric_friendly", label: "Child-friendly" },
      { value: "hygienist_onsite", label: "Hygienist on-site" },
    ],
  },
]

// Flat list of all highlight options for easy lookup
export const ALL_HIGHLIGHT_OPTIONS: HighlightOption[] = HIGHLIGHT_CATEGORIES.flatMap(
  (cat) => cat.options
)

// Get label for a highlight value
export function getHighlightLabel(value: string): string {
  const option = ALL_HIGHLIGHT_OPTIONS.find((opt) => opt.value === value)
  return option?.label || value
}

// Get category for a highlight value
export function getHighlightCategory(value: string): string | undefined {
  for (const cat of HIGHLIGHT_CATEGORIES) {
    if (cat.options.some((opt) => opt.value === value)) {
      return cat.id
    }
  }
  return undefined
}
