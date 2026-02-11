export const TREATMENT_OPTIONS = [
  "General Dentistry",
  "Cosmetic Bonding",
  "Teeth Whitening",
  "Dental Implants",
  "Invisalign",
  "Veneers",
  "Hygiene & Scale Polish",
  "Root Canal",
  "Orthodontics",
  "Emergency Treatment",
  "Crowns & Bridges",
  "Emergency Care",
  "Cosmetic Dentistry",
  "Periodontics",
  "Oral Surgery",
]

// Days of the week for clinic availability
export const DAYS_OF_WEEK = [
  { key: "mon", label: "Mon", fullLabel: "Monday" },
  { key: "tue", label: "Tue", fullLabel: "Tuesday" },
  { key: "wed", label: "Wed", fullLabel: "Wednesday" },
  { key: "thu", label: "Thu", fullLabel: "Thursday" },
  { key: "fri", label: "Fri", fullLabel: "Friday" },
  { key: "sat", label: "Sat", fullLabel: "Saturday" },
  { key: "sun", label: "Sun", fullLabel: "Sunday" },
] as const

export type DayKey = typeof DAYS_OF_WEEK[number]["key"]

// Hourly time slots (9:00 - 17:00)
export const HOURLY_SLOTS = [
  { key: "09:00", label: "9:00 am", hour: 9 },
  { key: "10:00", label: "10:00 am", hour: 10 },
  { key: "11:00", label: "11:00 am", hour: 11 },
  { key: "12:00", label: "12:00 pm", hour: 12 },
  { key: "13:00", label: "1:00 pm", hour: 13 },
  { key: "14:00", label: "2:00 pm", hour: 14 },
  { key: "15:00", label: "3:00 pm", hour: 15 },
  { key: "16:00", label: "4:00 pm", hour: 16 },
  { key: "17:00", label: "5:00 pm", hour: 17 },
] as const

export type HourlySlotKey = typeof HOURLY_SLOTS[number]["key"]

// Time slot options for patient intake form (Morning vs Afternoon preference)
export const TIME_SLOT_OPTIONS = [
  { key: "morning", label: "Morning", time: "9am - 12pm", hours: [9, 10, 11, 12] },
  { key: "afternoon", label: "Afternoon", time: "1pm - 5pm", hours: [13, 14, 15, 16, 17] },
] as const

export type TimeSlotKey = typeof TIME_SLOT_OPTIONS[number]["key"]

// Urgency options for appointment booking
export const URGENCY_OPTIONS = [
  { key: "asap", label: "As soon as possible" },
  { key: "1_week", label: "Within a week" },
  { key: "2_weeks", label: "More than a week" },
  { key: "flexible", label: "Just exploring for now" },
] as const

export type UrgencyKey = typeof URGENCY_OPTIONS[number]["key"]
