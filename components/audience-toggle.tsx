"use client"

import { cn } from "@/lib/utils"

interface AudienceToggleProps {
  activeView: "patients" | "clinics"
  onToggle: (view: "patients" | "clinics") => void
}

export function AudienceToggle({ activeView, onToggle }: AudienceToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full bg-secondary/50 border border-border">
      <button
        onClick={() => onToggle("patients")}
        className={cn(
          "px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-500 ease-[cubic-bezier(0.66,0,0.1,1)] whitespace-nowrap",
          activeView === "patients"
            ? "bg-primary text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        For Patients
      </button>
      <button
        onClick={() => onToggle("clinics")}
        className={cn(
          "px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-500 ease-[cubic-bezier(0.66,0,0.1,1)] whitespace-nowrap",
          activeView === "clinics"
            ? "bg-primary text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        For Clinics
      </button>
    </div>
  )
}
