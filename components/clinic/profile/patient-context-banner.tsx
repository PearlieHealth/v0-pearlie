"use client"

import { CheckCircle2, MapPin } from "lucide-react"

interface PatientContextBannerProps {
  treatmentInterest?: string
  distanceMiles?: number
}

export function PatientContextBanner({ treatmentInterest, distanceMiles }: PatientContextBannerProps) {
  const treatments = treatmentInterest
    ? treatmentInterest.split(",").map((s) => s.trim()).filter(Boolean)
    : []

  if (treatments.length === 0 && !distanceMiles) return null

  return (
    <div className="flex flex-wrap items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
      {treatments.map((treatment, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-medium"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {treatment}
        </span>
      ))}
      {distanceMiles !== undefined && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-medium">
          <MapPin className="h-3.5 w-3.5" />
          {distanceMiles.toFixed(1)} miles away
        </span>
      )}
    </div>
  )
}
