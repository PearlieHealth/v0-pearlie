"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"

interface ClinicFilter {
  key: string
  label: string
  category: string
  sort_order: number
  tag_type: string
}

interface ClinicFilterChecklistProps {
  clinicId?: string
  selectedFilters: string[]
  onFiltersChange: (filters: string[]) => void
  isVerified?: boolean  // When false, shows locked state with message
}

const CATEGORY_LABELS: Record<string, string> = {
  q4_priorities: "Clinic Priorities (what patients value most)",
  q5_blockers: "Patient Concerns (main worry right now)",
  q8_cost: "Cost & Payment Approach",
  q10_anxiety: "Dental Anxiety Support",
  profile: "Profile Highlights",
  // Legacy fallbacks
  priorities: "Patient Priorities",
  cost: "Cost & Finance",
  anxiety: "Anxiety Support",
  blockers: "Blocker Support",
}

export function ClinicFilterChecklist({ clinicId, selectedFilters, onFiltersChange, isVerified = true }: ClinicFilterChecklistProps) {
  const [filters, setFilters] = useState<ClinicFilter[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await fetch("/api/admin/clinic-filters")
        if (!response.ok) throw new Error("Failed to fetch filters")
        const data = await response.json()
        setFilters(data.filters || [])
      } catch (error) {
        console.error("[v0] Error fetching clinic filters:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFilters()
  }, [])

  const handleToggle = (filterKey: string) => {
    if (selectedFilters.includes(filterKey)) {
      onFiltersChange(selectedFilters.filter((k) => k !== filterKey))
    } else {
      onFiltersChange([...selectedFilters, filterKey])
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const matchingTags = filters.filter((f) => f.tag_type === "matching")
  const displayTags = filters.filter((f) => f.tag_type === "display")

  // Group by exact database categories
  const q4Tags = matchingTags.filter((f) => f.category === "q4_priorities")
  const q5Tags = matchingTags.filter((f) => f.category === "q5_blockers")
  const q8Tags = matchingTags.filter((f) => f.category === "q8_cost")
  const q10Tags = matchingTags.filter((f) => f.category === "q10_anxiety")

  // Show locked state if clinic is not verified
  if (!isVerified) {
    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-1">Matching Tags</h4>
          <p className="text-xs text-muted-foreground mb-4">
            These tags affect how patients are matched to this clinic based on their intake form answers.
          </p>
        </div>
        <div className="p-4 bg-muted/50 border border-border rounded-lg">
          <p className="text-sm text-muted-foreground">
            Enable <strong>Verified clinic</strong> above to edit matching tags. 
            Non-verified clinics appear as directory listings and don{"'"}t participate in patient matching.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Matching Tags Section */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-1">Matching Tags</h4>
        <p className="text-xs text-muted-foreground mb-4">
          These tags affect how patients are matched to this clinic based on their intake form answers.
        </p>

        {/* Q4: What matters most */}
        {q4Tags.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              {CATEGORY_LABELS.q4_priorities}
            </p>
            <div className="space-y-2">
              {q4Tags.map((filter) => (
                <FilterCheckbox
                  key={filter.key}
                  filter={filter}
                  checked={selectedFilters.includes(filter.key)}
                  onToggle={() => handleToggle(filter.key)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Q5: Concerns / Blockers */}
        {q5Tags.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              {CATEGORY_LABELS.q5_blockers}
            </p>
            <div className="space-y-2">
              {q5Tags.map((filter) => (
                <FilterCheckbox
                  key={filter.key}
                  filter={filter}
                  checked={selectedFilters.includes(filter.key)}
                  onToggle={() => handleToggle(filter.key)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Q8: Cost Approach */}
        {q8Tags.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              {CATEGORY_LABELS.q8_cost}
            </p>
            <div className="space-y-2">
              {q8Tags.map((filter) => (
                <FilterCheckbox
                  key={filter.key}
                  filter={filter}
                  checked={selectedFilters.includes(filter.key)}
                  onToggle={() => handleToggle(filter.key)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Q10: Anxiety Level */}
        {q10Tags.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              {CATEGORY_LABELS.q10_anxiety}
            </p>
            <div className="space-y-2">
              {q10Tags.map((filter) => (
                <FilterCheckbox
                  key={filter.key}
                  filter={filter}
                  checked={selectedFilters.includes(filter.key)}
                  onToggle={() => handleToggle(filter.key)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Display Tags Section */}
      {displayTags.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold text-foreground mb-1">Profile Highlights</h4>
          <p className="text-xs text-muted-foreground mb-4">
            Nice-to-have features shown on clinic profile. These do NOT affect matching scores.
          </p>
          <div className="space-y-2">
            {displayTags.map((filter) => (
              <FilterCheckbox
                key={filter.key}
                filter={filter}
                checked={selectedFilters.includes(filter.key)}
                onToggle={() => handleToggle(filter.key)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FilterCheckbox({
  filter,
  checked,
  onToggle,
}: {
  filter: ClinicFilter
  checked: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-start space-x-3">
      <Checkbox id={filter.key} checked={checked} onCheckedChange={onToggle} className="mt-0.5" />
      <Label htmlFor={filter.key} className="text-sm text-foreground leading-relaxed cursor-pointer flex-1">
        {filter.label}
      </Label>
    </div>
  )
}
