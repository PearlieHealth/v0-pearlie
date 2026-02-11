"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface ClinicTag {
  key: string
  label: string
  category: string
  description?: string
}

interface TagSelectorProps {
  selectedTags: string[]
  onChange: (tags: string[]) => void
  maxTags?: number
}

const CATEGORY_LABELS = {
  care: "Care & Approach",
  pricing: "Pricing & Payment",
  capability: "Specialties & Technology",
  convenience: "Location & Hours",
}

export function TagSelector({ selectedTags, onChange, maxTags = 6 }: TagSelectorProps) {
  const [availableTags, setAvailableTags] = useState<ClinicTag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/tags")
      .then((res) => res.json())
      .then((tags) => {
        setAvailableTags(tags)
        setLoading(false)
      })
      .catch((error) => {
        console.error("Failed to fetch tags:", error)
        setLoading(false)
      })
  }, [])

  const handleToggle = (tagKey: string) => {
    const isSelected = selectedTags.includes(tagKey)

    if (isSelected) {
      onChange(selectedTags.filter((key) => key !== tagKey))
    } else {
      if (selectedTags.length >= maxTags) {
        return
      }
      onChange([...selectedTags, tagKey])
    }
  }

  // Group tags by category
  const tagsByCategory = availableTags.reduce(
    (acc, tag) => {
      if (!acc[tag.category]) {
        acc[tag.category] = []
      }
      acc[tag.category].push(tag)
      return acc
    },
    {} as Record<string, ClinicTag[]>,
  )

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading tags...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Clinic Tags</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Select up to {maxTags} tags that best describe this clinic
          </p>
        </div>
        <Badge variant={selectedTags.length >= maxTags ? "destructive" : "secondary"}>
          {selectedTags.length}/{maxTags}
        </Badge>
      </div>

      {selectedTags.length >= maxTags && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Maximum of {maxTags} tags reached. Unselect a tag to add a different one.</AlertDescription>
        </Alert>
      )}

      {Object.entries(tagsByCategory).map(([category, tags]) => (
        <div key={category} className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {tags.map((tag) => {
              const isSelected = selectedTags.includes(tag.key)
              const isDisabled = !isSelected && selectedTags.length >= maxTags

              return (
                <div
                  key={tag.key}
                  className={`flex items-start space-x-2 p-3 rounded-lg border transition-colors ${
                    isSelected
                      ? "bg-primary/5 border-primary"
                      : isDisabled
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-muted/50 cursor-pointer"
                  }`}
                  onClick={() => !isDisabled && handleToggle(tag.key)}
                >
                  <Checkbox
                    id={tag.key}
                    checked={isSelected}
                    disabled={isDisabled}
                    onCheckedChange={() => handleToggle(tag.key)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-0.5">
                    <Label
                      htmlFor={tag.key}
                      className={`text-sm font-medium ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {tag.label}
                    </Label>
                    {tag.description && <p className="text-xs text-muted-foreground">{tag.description}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {availableTags.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-8">
          No tags available. Contact an administrator to add tags.
        </div>
      )}
    </div>
  )
}
