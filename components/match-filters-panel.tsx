"use client"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { SlidersHorizontal, X, BadgeCheck, Info } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export interface FilterState {
  distanceMiles: number | null    // 1.5, 5, or null (5+ / no limit)
  prioritiseDistance: boolean
  financeAvailable: boolean
  freeConsultation: boolean
  sedationAvailable: boolean
  verifiedOnly: boolean
  highRatingOnly: boolean
}

interface MatchFiltersPanelProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  isMobile?: boolean
}

const DISTANCE_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: 1.5, label: "1.5 mi" },
  { value: 5, label: "5 mi" },
  { value: null, label: "5+ mi" },
]

export function MatchFiltersPanel({ filters, onFiltersChange, isMobile = false }: MatchFiltersPanelProps) {
  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearAllFilters = () => {
    onFiltersChange({
      distanceMiles: null,
      prioritiseDistance: false,
      financeAvailable: false,
      freeConsultation: false,
      sedationAvailable: false,
      verifiedOnly: false,
      highRatingOnly: false,
    })
  }

  const hasActiveFilters =
    filters.prioritiseDistance ||
    filters.distanceMiles !== null ||
    filters.financeAvailable ||
    filters.freeConsultation ||
    filters.sedationAvailable ||
    filters.verifiedOnly ||
    filters.highRatingOnly

  const activeFilterCount = [
    filters.prioritiseDistance,
    filters.distanceMiles !== null,
    filters.financeAvailable,
    filters.freeConsultation,
    filters.sedationAvailable,
    filters.verifiedOnly,
    filters.highRatingOnly,
  ].filter(Boolean).length

  const handleDistanceClick = (option: { value: number | null; label: string }) => {
    if (option.value === null) {
      // "5+ mi" clears any active distance filter
      updateFilter("distanceMiles", null)
    } else {
      // Toggle: click same value to deselect
      updateFilter("distanceMiles", filters.distanceMiles === option.value ? null : option.value)
    }
  }

  const isDistanceSelected = (option: { value: number | null }) => {
    if (option.value === null) {
      // 5+ is never "actively selected" in the filter state — it's the clear action
      return false
    }
    return filters.distanceMiles === option.value
  }

  const FilterContent = () => (
    <div className="flex flex-col h-full">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-0 py-4 md:py-0">
        {/* Title row with clear button */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold tracking-tight text-[#004443]">Filters</h3>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-sm font-normal h-auto p-0 hover:bg-transparent hover:underline"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Sections with consistent vertical rhythm */}
        <div className="space-y-4">
          {/* Location Section */}
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-2">Location</h4>
            <div className="flex flex-wrap gap-1.5">
              {DISTANCE_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  onClick={() => handleDistanceClick(option)}
                  className={`
                    h-8 px-3 rounded-full text-xs font-medium transition-colors
                    border
                    ${
                      isDistanceSelected(option)
                        ? "bg-[#004443] text-white border-transparent"
                        : "bg-white text-[#004443] border-[#004443]/20 hover:bg-[#004443]/5"
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {/* Prioritise toggle */}
            <div className="mt-2 pt-2 border-t border-border/60">
              <div
                role="button"
                tabIndex={0}
                onClick={() => updateFilter("prioritiseDistance", !filters.prioritiseDistance)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") updateFilter("prioritiseDistance", !filters.prioritiseDistance) }}
                className="w-full flex items-center justify-between py-2 cursor-pointer"
              >
                <span className="text-xs text-foreground">Prioritise closer</span>
                <Switch
                  checked={filters.prioritiseDistance}
                  onCheckedChange={(checked) => updateFilter("prioritiseDistance", checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="pt-3 border-t border-border/50">
            <h4 className="text-xs font-semibold text-foreground mb-1">Payment</h4>
            <div>
              <button
                onClick={() => updateFilter("financeAvailable", !filters.financeAvailable)}
                className="w-full flex items-center justify-between py-2 border-b border-border/60 cursor-pointer"
              >
                <span className="text-xs text-foreground">Finance / payment plans</span>
                <Switch
                  checked={filters.financeAvailable}
                  onCheckedChange={(checked) => updateFilter("financeAvailable", checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              </button>
              <button
                onClick={() => updateFilter("freeConsultation", !filters.freeConsultation)}
                className="w-full flex items-center justify-between py-2 cursor-pointer"
              >
                <span className="text-xs text-foreground">Free consultation</span>
                <Switch
                  checked={filters.freeConsultation}
                  onCheckedChange={(checked) => updateFilter("freeConsultation", checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              </button>
            </div>
          </div>

          {/* Comfort Section */}
          <div className="pt-3 border-t border-border/50">
            <h4 className="text-xs font-semibold text-foreground mb-1">Comfort</h4>
            <div>
              <button
                onClick={() => updateFilter("sedationAvailable", !filters.sedationAvailable)}
                className="w-full flex items-center justify-between py-2 cursor-pointer"
              >
                <span className="text-xs text-foreground">Sedation available</span>
                <Switch
                  checked={filters.sedationAvailable}
                  onCheckedChange={(checked) => updateFilter("sedationAvailable", checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              </button>
            </div>
          </div>

          {/* Trust Section */}
          <div className="pt-3 border-t border-border/50">
            <h4 className="text-xs font-semibold text-foreground mb-1">Trust</h4>
            <div>
              <TooltipProvider>
                <button
                  onClick={() => updateFilter("verifiedOnly", !filters.verifiedOnly)}
                  className="w-full flex items-center justify-between py-2 border-b border-border/60 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <BadgeCheck className={`h-4 w-4 ${filters.verifiedOnly ? "text-green-600" : "text-muted-foreground"}`} />
                    <span className="text-xs text-foreground">Verified only</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[260px]">
                        <p className="text-sm">
                          Verified clinics are partners with confirmed availability and matching tags.
                          Directory listings may appear under &ldquo;Load more&rdquo;.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={filters.verifiedOnly}
                    onCheckedChange={(checked) => updateFilter("verifiedOnly", checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </button>
              </TooltipProvider>
              <button
                onClick={() => updateFilter("highRatingOnly", !filters.highRatingOnly)}
                className="w-full flex items-center justify-between py-2 cursor-pointer"
              >
                <span className="text-xs text-foreground">Highly rated</span>
                <Switch
                  checked={filters.highRatingOnly}
                  onCheckedChange={(checked) => updateFilter("highRatingOnly", checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky footer for mobile sheet only */}
      {isMobile && (
        <div className="border-t border-border p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <SheetClose asChild>
            <Button className="w-full h-11">Done</Button>
          </SheetClose>
        </div>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 bg-white border-[#004443]/20 text-[#004443] hover:bg-[#004443]/5 shadow-sm">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-full max-w-[420px] p-0 flex flex-col">
          {/* Close button in top-right */}
          <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
          <FilterContent />
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop sidebar — compact card
  return (
    <div className="bg-white border border-border/50 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4">
        <FilterContent />
      </div>
    </div>
  )
}
