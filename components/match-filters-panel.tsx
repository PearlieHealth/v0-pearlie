"use client"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { SlidersHorizontal, X, BadgeCheck, Info } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export interface FilterState {
  prioritiseDistance: boolean
  distanceMiles: number | null
  priceRanges: string[]
  verifiedOnly: boolean
  highRatingOnly: boolean
  acceptsNhs: boolean
  wheelchairAccessible: boolean
  parkingAvailable: boolean
}

interface MatchFiltersPanelProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  isMobile?: boolean
}

const DISTANCE_OPTIONS = [2, 5, 10, 15]
const PRICE_OPTIONS = [
  { value: "budget", label: "£" },
  { value: "mid", label: "££" },
  { value: "premium", label: "£££" },
]

export function MatchFiltersPanel({ filters, onFiltersChange, isMobile = false }: MatchFiltersPanelProps) {
  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const togglePriceRange = (range: string) => {
    const newRanges = filters.priceRanges.includes(range)
      ? filters.priceRanges.filter((r) => r !== range)
      : [...filters.priceRanges, range]
    updateFilter("priceRanges", newRanges)
  }

  const clearAllFilters = () => {
    onFiltersChange({
      prioritiseDistance: false,
      distanceMiles: null,
      priceRanges: [],
      verifiedOnly: false,
      highRatingOnly: false,
      acceptsNhs: false,
      wheelchairAccessible: false,
      parkingAvailable: false,
    })
  }

  const hasActiveFilters =
    filters.prioritiseDistance ||
    filters.distanceMiles !== null ||
    filters.priceRanges.length > 0 ||
    filters.verifiedOnly ||
    filters.highRatingOnly ||
    filters.acceptsNhs ||
    filters.wheelchairAccessible ||
    filters.parkingAvailable

  const FilterContent = () => (
    <div className="flex flex-col h-full">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-6 md:px-7 py-6 md:py-7">
        {/* Title row with clear button */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold tracking-tight">Search filters</h3>
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
        <div className="space-y-6">
          {/* Distance Section */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Distance</h4>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-prose mb-3">
              Hard filter by distance or toggle to prioritise nearby clinics
            </p>
            <div className="flex flex-wrap gap-2">
              {DISTANCE_OPTIONS.map((miles) => (
                <button
                  key={miles}
                  onClick={() => updateFilter("distanceMiles", filters.distanceMiles === miles ? null : miles)}
                  className={`
                    h-10 px-4 rounded-full text-sm font-medium transition-colors
                    border
                    ${
                      filters.distanceMiles === miles
                        ? "bg-foreground text-background border-transparent"
                        : "bg-background text-foreground border-border hover:bg-muted"
                    }
                  `}
                >
                  Within {miles} mi
                </button>
              ))}
            </div>
            {/* Prioritise toggle */}
            <div className="mt-4 pt-3 border-t border-border/60">
              <button
                onClick={() => updateFilter("prioritiseDistance", !filters.prioritiseDistance)}
                className="w-full flex items-center justify-between py-3 cursor-pointer"
              >
                <span className="text-sm text-foreground">Prioritise closer clinics</span>
                <Switch
                  checked={filters.prioritiseDistance}
                  onCheckedChange={(checked) => updateFilter("prioritiseDistance", checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              </button>
            </div>
          </div>

          {/* Budget Section */}
          <div className="pt-5 border-t border-border/50">
            <h4 className="text-sm font-semibold text-foreground mb-2">Budget</h4>
            <div className="flex gap-2">
              {PRICE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => togglePriceRange(option.value)}
                  className={`
                    flex-1 h-10 px-4 rounded-full text-sm font-medium transition-colors
                    border
                    ${
                      filters.priceRanges.includes(option.value)
                        ? "bg-foreground text-background border-transparent"
                        : "bg-background text-foreground border-border hover:bg-muted"
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Trust Section */}
          <div className="pt-5 border-t border-border/50">
            <h4 className="text-sm font-semibold text-foreground mb-2">Trust</h4>
            <div>
              <TooltipProvider>
                <button
                  onClick={() => updateFilter("verifiedOnly", !filters.verifiedOnly)}
                  className="w-full flex items-center justify-between py-3 border-b border-border/60 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <BadgeCheck className={`h-4 w-4 ${filters.verifiedOnly ? "text-green-600" : "text-muted-foreground"}`} />
                    <span className="text-sm text-foreground">Verified only</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[260px]">
                        <p className="text-sm">
                          Verified clinics are partners with confirmed availability and matching tags. 
                          Directory listings may appear under "Load more".
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
                className="w-full flex items-center justify-between py-3 cursor-pointer"
              >
                <span className="text-sm text-foreground">4.6+ rating & 50+ reviews</span>
                <Switch
                  checked={filters.highRatingOnly}
                  onCheckedChange={(checked) => updateFilter("highRatingOnly", checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              </button>
            </div>
          </div>

          {/* Practical Section */}
          <div className="pt-5 border-t border-border/50">
            <h4 className="text-sm font-semibold text-foreground mb-2">Practical</h4>
            <div>
              <button
                onClick={() => updateFilter("parkingAvailable", !filters.parkingAvailable)}
                className="w-full flex items-center justify-between py-3 border-b border-border/60 cursor-pointer"
              >
                <span className="text-sm text-foreground">Parking available</span>
                <Switch
                  checked={filters.parkingAvailable}
                  onCheckedChange={(checked) => updateFilter("parkingAvailable", checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              </button>
              <button
                onClick={() => updateFilter("wheelchairAccessible", !filters.wheelchairAccessible)}
                className="w-full flex items-center justify-between py-3 cursor-pointer"
              >
                <span className="text-sm text-foreground">Wheelchair accessible</span>
                <Switch
                  checked={filters.wheelchairAccessible}
                  onCheckedChange={(checked) => updateFilter("wheelchairAccessible", checked)}
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
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {
                  [
                    filters.prioritiseDistance,
                    filters.distanceMiles !== null,
                    filters.priceRanges.length > 0,
                    filters.verifiedOnly,
                    filters.highRatingOnly,
                    filters.acceptsNhs,
                    filters.wheelchairAccessible,
                    filters.parkingAvailable,
                  ].filter(Boolean).length
                }
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

  // Desktop sidebar
  return (
    <div className="bg-card border rounded-lg sticky top-24 overflow-hidden">
      <div className="p-6">
        <FilterContent />
      </div>
    </div>
  )
}
