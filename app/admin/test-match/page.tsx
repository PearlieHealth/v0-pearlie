"use client"

import { useState } from "react"
import { AdminNav } from "@/components/admin/admin-nav"
import {
  Play,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  MapPin,
  CheckCircle2,
  XCircle,
  Loader2,
  FlaskConical,
  Bug,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import {
  TREATMENT_OPTIONS,
  EMERGENCY_TREATMENT,
  DECISION_VALUE_OPTIONS,
  BLOCKER_OPTIONS,
  COST_APPROACH_OPTIONS,
  LOCATION_PREFERENCE_OPTIONS,
  TIMING_OPTIONS,
  ANXIETY_LEVEL_OPTIONS,
  PREFERRED_TIME_OPTIONS,
  URGENCY_OPTIONS,
} from "@/lib/intake-form-config"

interface TestLeadInput {
  treatments: string[]
  postcode: string
  latitude?: number
  longitude?: number
  isEmergency?: boolean
  urgency?: string
  locationPreference: string
  decisionValues: string[]
  anxietyLevel: string
  costApproach: string
  strictBudgetMode?: string
  strictBudgetAmount?: number
  timingPreference: string
  preferred_times: string[]
  conversionBlockerCodes: string[]
}

interface RankedClinicResult {
  clinicId: string
  clinicName: string
  postcode: string
  verified?: boolean
  rating?: number
  reviewCount?: number
  priceRange?: string | null
  filterKeys?: string[]
  score: number
  percent: number
  tier: string
  isPinned: boolean
  isDirectoryListing?: boolean
  explanationVersion?: string
  reasons: Array<{ text: string; category: string; tagKey?: string; rawText?: string }>
  debug: {
    distanceMiles?: number
    treatmentMatch: boolean
    priorityTagsMatched: string[]
    anxietyMatched: boolean
    budgetMatched: boolean
    rawScore: number
    percent: number
    categories: Array<{
      category: string
      points: number
      maxPoints: number
      weight: number
      facts?: Record<string, any>
    }>
    reasonsDebug?: {
      primaryReasonKey: string
      reasonKeys: string[]
      matchedTagsByCategory: {
        treatment: string[]
        priorities: string[]
        blockers: string[]
        cost: string[]
        anxiety: string[]
      }
      fallbacksUsed: number
    }
  }
}

interface MatchResult {
  success: boolean
  rankedClinics: RankedClinicResult[]
  meta: {
    totalClinicsEvaluated: number
    verifiedCount?: number
    directoryCount?: number
    contractVersion: string
    timestamp: string
    inputProfile: TestLeadInput
  }
}

// Use centralized config from intake-form-config.ts
// TREATMENT_OPTIONS, DECISION_VALUE_OPTIONS, BLOCKER_OPTIONS, etc. are imported above

const PRESETS: Record<string, { name: string; description?: string; data: TestLeadInput }> = {
  "invisalign-central": {
    name: "1. Invisalign – Central London",
    description: "Invisalign, wants clear pricing, flexible hours",
    data: {
      treatments: ["Invisalign / Clear Aligners"],
      postcode: "SE5 8RS",
      latitude: 51.4741,
      longitude: -0.0877,
      locationPreference: "travel_a_bit",
      decisionValues: ["Clear pricing before treatment", "Flexible appointments (late afternoons or weekends)"],
      anxietyLevel: "slightly_anxious",
      costApproach: "upfront_pricing",
      timingPreference: "few_weeks",
      preferred_times: ["afternoon", "weekend"],
      conversionBlockerCodes: ["NOT_WORTH_COST"],
    },
  },
  "implants-anxious": {
    name: "2. Implants – Anxious Patient",
    description: "Implants, very anxious, needs calm reassurance",
    data: {
      treatments: ["Dental Implants"],
      postcode: "SE1 7PB",
      latitude: 51.5045,
      longitude: -0.0865,
      locationPreference: "near_home_work",
      decisionValues: ["A calm, reassuring environment", "Specialist-level experience"],
      anxietyLevel: "very_anxious",
      costApproach: "finance_preferred",
      timingPreference: "few_weeks",
      preferred_times: ["morning"],
      conversionBlockerCodes: ["WORRIED_COMPLEX"],
    },
  },
  "veneers-quality": {
    name: "3. Veneers – Quality Focused",
    description: "Veneers, wants specialist, reviews matter",
    data: {
      treatments: ["Veneers"],
      postcode: "W1G 6AB",
      latitude: 51.5191,
      longitude: -0.1478,
      locationPreference: "travel_further",
      decisionValues: ["Specialist-level experience", "Strong reputation and reviews"],
      anxietyLevel: "comfortable",
      costApproach: "options_first",
      timingPreference: "exploring",
      preferred_times: ["afternoon"],
      conversionBlockerCodes: ["NO_CONCERN"],
    },
  },
  "whitening-budget": {
    name: "4. Whitening – Budget Conscious",
    description: "Whitening, strict budget, needs finance",
    data: {
      treatments: ["Teeth Whitening"],
      postcode: "EC1A 1BB",
      latitude: 51.5188,
      longitude: -0.0969,
      locationPreference: "travel_a_bit",
      decisionValues: ["Clear pricing before treatment"],
      anxietyLevel: "comfortable",
      costApproach: "strict_budget",
      strictBudgetAmount: 400,
      timingPreference: "within_week",
      preferred_times: ["morning", "afternoon"],
      conversionBlockerCodes: ["NOT_WORTH_COST"],
    },
  },
  "emergency-pain": {
    name: "5. Emergency – Tooth Pain",
    description: "Emergency, needs urgent care, quite anxious",
    data: {
      treatments: ["Emergency dental issue (pain, swelling, broken tooth)"],
      postcode: "SE15 5DQ",
      latitude: 51.4697,
      longitude: -0.0569,
      isEmergency: true,
      urgency: "today",
      locationPreference: "near_home_work",
      decisionValues: [],
      anxietyLevel: "quite_anxious",
      costApproach: "",
      timingPreference: "asap",
      preferred_times: ["morning", "afternoon"],
      conversionBlockerCodes: [],
    },
  },
  "checkup-local": {
    name: "6. Check-up – Local Only",
    description: "General check-up, wants nearby weekend clinic",
    data: {
      treatments: ["General Check-up & Clean"],
      postcode: "SE15 5DQ",
      latitude: 51.4697,
      longitude: -0.0569,
      locationPreference: "near_home_work",
      decisionValues: ["Flexible appointments (late afternoons or weekends)", "Seeing the same dentist and building long-term trust"],
      anxietyLevel: "slightly_anxious",
      costApproach: "options_first",
      timingPreference: "asap",
      preferred_times: ["weekend"],
      conversionBlockerCodes: ["NEED_MORE_TIME"],
    },
  },
}

// Config arrays are used directly in UI (no transformation needed):
// - TREATMENT_OPTIONS: array of strings
// - DECISION_VALUE_OPTIONS: array of strings
// - BLOCKER_OPTIONS: array of {code, label}
// - LOCATION/TIMING/COST/ANXIETY_OPTIONS: array of {value, label}

export default function TestMatchPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<MatchResult | null>(null)
  const [expandedClinics, setExpandedClinics] = useState<Set<string>>(new Set())
  const [visibleCount, setVisibleCount] = useState(3)
  const [showDebug, setShowDebug] = useState(true)

  const [formData, setFormData] = useState<TestLeadInput>({
    treatments: [],
    postcode: "",
    latitude: undefined,
    longitude: undefined,
    isEmergency: false,
    urgency: undefined,
    locationPreference: "near_home_work",
    decisionValues: [],
    anxietyLevel: "comfortable",
    costApproach: "options_first",
    timingPreference: "few_weeks",
    preferred_times: [],
    conversionBlockerCodes: [],
  })

  const [pinnedClinicId, setPinnedClinicId] = useState<string>("")

  const loadPreset = (presetKey: keyof typeof PRESETS) => {
    const preset = PRESETS[presetKey]
    setFormData(preset.data)
    toast({
      title: "Preset loaded",
      description: preset.name,
    })
  }

  const resetForm = () => {
    setFormData({
      treatments: [],
      postcode: "",
      latitude: undefined,
      longitude: undefined,
      isEmergency: false,
      urgency: undefined,
      locationPreference: "near_home_work",
      decisionValues: [],
      anxietyLevel: "comfortable",
      costApproach: "options_first",
      timingPreference: "few_weeks",
      preferred_times: [],
      conversionBlockerCodes: [],
    })
    setResults(null)
    setPinnedClinicId("")
    setExpandedClinics(new Set())
    setVisibleCount(3)
  }

  const toggleDecisionValue = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      decisionValues: prev.decisionValues.includes(value)
        ? prev.decisionValues.filter((v) => v !== value)
        : prev.decisionValues.length < 2
          ? [...prev.decisionValues, value]
          : prev.decisionValues,
    }))
  }

  const selectBlocker = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      conversionBlockerCodes: prev.conversionBlockerCodes.includes(code)
        ? []
        : [code],
    }))
  }

  const toggleTreatment = (treatment: string) => {
    setFormData((prev) => ({
      ...prev,
      treatments: prev.treatments.includes(treatment)
        ? prev.treatments.filter((t) => t !== treatment)
        : [...prev.treatments, treatment],
    }))
  }

  const runMatch = async () => {
    if (formData.treatments.length === 0) {
      toast({
        title: "Missing treatment",
        description: "Please select at least one treatment to test matching.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setResults(null)

    try {
      const response = await fetch("/api/admin/test-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testLead: formData,
          pinnedClinicId: pinnedClinicId || undefined,
          limit: 20,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to run match")
      }

      setResults(data)
      setVisibleCount(3)
      toast({
        title: "Match complete",
        description: `Evaluated ${data.meta.totalClinicsEvaluated} clinics`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to run match",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleDebugPanel = (clinicId: string) => {
    setExpandedClinics((prev) => {
      const next = new Set(prev)
      if (next.has(clinicId)) {
        next.delete(clinicId)
      } else {
        next.add(clinicId)
      }
      return next
    })
  }

  const getMatchLabel = (index: number, isDirectory?: boolean) => {
    if (isDirectory) return "About this clinic"
    if (index < 2) return "Why we matched you"
    if (index < 5) return "Could also be a good match"
    return "Good alternative"
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "excellent":
        return "bg-green-100 text-green-800"
      case "strong":
        return "bg-blue-100 text-teal-800"
      case "good":
        return "bg-amber-100 text-amber-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }



  return (
    <div className="min-h-screen bg-secondary">
      <AdminNav />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-foreground" />
              <h2 className="text-2xl font-bold">Test Matching Algorithm</h2>
            </div>
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="debug-mode" className="text-sm">
                Debug
              </Label>
              <Switch id="debug-mode" checked={showDebug} onCheckedChange={setShowDebug} />
            </div>
          </div>
          <p className="text-muted-foreground">
            Test the matching pipeline without creating leads or sending emails. Results use the same algorithm as
            production.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel: Test Inputs */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test Lead Inputs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Presets */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Quick Presets (6 test scenarios)</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => loadPreset("invisalign-central")}>
                      1. Invisalign
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => loadPreset("implants-anxious")}>
                      2. Implants (Anxious)
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => loadPreset("veneers-quality")}>
                      3. Veneers (Quality)
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => loadPreset("whitening-budget")}>
                      4. Whitening (Budget)
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => loadPreset("emergency-pain")}>
                      5. Emergency (Pain)
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => loadPreset("checkup-local")}>
                      6. Check-up (Weekend)
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Each preset tests different treatments, priorities, and patient profiles
                  </p>
                </div>

                {/* Treatments (multi-select) */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Treatments * ({formData.treatments.length} selected)
                  </Label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {TREATMENT_OPTIONS.map((treatment) => (
                      <div
                        key={treatment}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          formData.treatments.includes(treatment)
                            ? "border-[#004443] bg-[#0d1019]/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => toggleTreatment(treatment)}
                      >
                        <Checkbox checked={formData.treatments.includes(treatment)} />
                        <span className="text-xs">{treatment}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Postcode */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Postcode</Label>
                  <Input
                    value={formData.postcode}
                    onChange={(e) => setFormData((p) => ({ ...p, postcode: e.target.value.toUpperCase() }))}
                    placeholder="e.g. W1G 9PF"
                  />
                </div>

                {/* Location Preference */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Travel Willingness</Label>
                  <Select
                    value={formData.locationPreference}
                    onValueChange={(v) => setFormData((p) => ({ ...p, locationPreference: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATION_PREFERENCE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Decision Values - What Matters Most */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Clinic Priorities (max 2) - {formData.decisionValues.length}/2 selected
                  </Label>
                  <div className="grid grid-cols-1 gap-2">
                    {DECISION_VALUE_OPTIONS.map((value) => (
                      <div
                        key={value}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          formData.decisionValues.includes(value)
                            ? "border-[#004443] bg-[#0d1019]/5"
                            : formData.decisionValues.length >= 2
                              ? "border-gray-200 opacity-50 cursor-not-allowed"
                              : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => toggleDecisionValue(value)}
                      >
                        <Checkbox 
                          checked={formData.decisionValues.includes(value)} 
                          disabled={!formData.decisionValues.includes(value) && formData.decisionValues.length >= 2}
                        />
                        <span className="text-sm">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Anxiety Level */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Dental Anxiety</Label>
                  <Select
                    value={formData.anxietyLevel}
                    onValueChange={(v) => setFormData((p) => ({ ...p, anxietyLevel: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANXIETY_LEVEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Cost Approach</Label>
                  <Select
                    value={formData.costApproach}
                    onValueChange={(v) => setFormData((p) => ({ ...p, costApproach: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COST_APPROACH_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.costApproach === "strict_budget" && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Maximum Budget (£)</Label>
                    <Input
                      type="number"
                      value={formData.strictBudgetAmount || ""}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          strictBudgetAmount: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      placeholder="e.g. 3000"
                    />
                  </div>
                )}

                {/* Timing */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Timing Preference</Label>
                  <Select
                    value={formData.timingPreference}
                    onValueChange={(v) => setFormData((p) => ({ ...p, timingPreference: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMING_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Preferred Times */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Preferred Times ({formData.preferred_times.length} selected)
                  </Label>
                  <div className="flex gap-2">
                    {PREFERRED_TIME_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={formData.preferred_times.includes(option.value) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            preferred_times: prev.preferred_times.includes(option.value)
                              ? prev.preferred_times.filter((t) => t !== option.value)
                              : [...prev.preferred_times, option.value],
                          }))
                        }}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Emergency + Urgency */}
                <div className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Emergency Lead</Label>
                    <Switch
                      checked={formData.isEmergency || false}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          isEmergency: checked,
                          urgency: checked ? "today" : undefined,
                          treatments: checked
                            ? [EMERGENCY_TREATMENT]
                            : prev.treatments.filter((t) => t !== EMERGENCY_TREATMENT),
                        }))
                      }
                    />
                  </div>
                  {formData.isEmergency && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Urgency</Label>
                      <Select
                        value={formData.urgency || "today"}
                        onValueChange={(v) => setFormData((p) => ({ ...p, urgency: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {URGENCY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Main Concern (single-select) */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Main Concern (single choice)
                  </Label>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                    {BLOCKER_OPTIONS.map((blocker) => (
                      <div
                        key={blocker.code}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          formData.conversionBlockerCodes.includes(blocker.code)
                            ? "border-[#004443] bg-[#0d1019]/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => selectBlocker(blocker.code)}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          formData.conversionBlockerCodes.includes(blocker.code)
                            ? "border-[#004443]"
                            : "border-gray-300"
                        }`}>
                          {formData.conversionBlockerCodes.includes(blocker.code) && (
                            <div className="w-2 h-2 rounded-full bg-[#0d1019]" />
                          )}
                        </div>
                        <span className="text-sm">{blocker.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pinned Clinic */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Pin Clinic ID (optional)</Label>
                  <Input
                    value={pinnedClinicId}
                    onChange={(e) => setPinnedClinicId(e.target.value)}
                    placeholder="e.g. abc123-def456..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">Force a specific clinic to appear in results</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button onClick={runMatch} disabled={isLoading || formData.treatments.length === 0} className="flex-1">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Run Match
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Results Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Match Results Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {!results && !isLoading && (
                  <div className="text-center py-12 text-muted-foreground">
                    <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Configure test inputs and click "Run Match" to see results</p>
                  </div>
                )}

                {isLoading && (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-foreground" />
                    <p className="text-muted-foreground">Running matching algorithm...</p>
                  </div>
                )}

                {results && (
                  <div className="space-y-4">
                    {/* Meta Info */}
                    <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Clinics evaluated:</span>
                        <span className="font-medium">{results.meta.totalClinicsEvaluated}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Results breakdown:</span>
                        <span className="font-medium">
                          {results.meta.verifiedCount ?? "?"} verified, {results.meta.directoryCount ?? "?"} directory
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contract version:</span>
                        <span className="font-medium">{results.meta.contractVersion}</span>
                      </div>
                    </div>

                    {/* Clinic Results */}
                    <div className="space-y-4">
                      {results.rankedClinics.slice(0, visibleCount).map((clinic, index) => (
                        <Card key={clinic.clinicId} className={
                          clinic.isPinned ? "border-amber-400 border-2" :
                          clinic.isDirectoryListing ? "border-orange-200 border-dashed" : ""
                        }>
                          <CardContent className="p-4">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold">{clinic.clinicName}</h3>
                                  {clinic.isPinned && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                                      Pinned
                                    </Badge>
                                  )}
                                  {clinic.isDirectoryListing ? (
                                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 text-[10px]">
                                      Directory
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-[10px]">
                                      Verified
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                  <MapPin className="w-3 h-3" />
                                  <span>{clinic.postcode}</span>
                                  {clinic.debug.distanceMiles !== undefined && (
                                    <span className="ml-1">({clinic.debug.distanceMiles.toFixed(1)} mi)</span>
                                  )}
                                  {clinic.isDirectoryListing && clinic.rating && (
                                    <span className="ml-2">
                                      ★ {clinic.rating}{clinic.reviewCount ? ` (${clinic.reviewCount})` : ""}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge className={getTierColor(clinic.tier)}>{clinic.tier}</Badge>
                                <p className="text-lg font-bold mt-1">{clinic.percent}%</p>
                                {clinic.isDirectoryListing && (
                                  <p className="text-[10px] text-muted-foreground">relevance</p>
                                )}
                              </div>
                            </div>

                            {/* Match Label */}
                            <p className="text-xs font-medium text-muted-foreground mb-2">{getMatchLabel(index, clinic.isDirectoryListing)}</p>

                            {/* Reasons */}
                            <ul className="space-y-2">
                              {clinic.reasons.map((reason, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <span>{reason.text}</span>
                                    {showDebug && (
                                      <div className="mt-1 flex flex-wrap gap-1 items-center">
                                        {reason.tagKey && (
                                          <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground">
                                            {reason.tagKey}
                                          </Badge>
                                        )}
                                        {reason.rawText && reason.rawText !== reason.text && (
                                          <span className="text-[10px] text-muted-foreground italic">
                                            (raw: {reason.rawText})
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>

                            {showDebug && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleDebugPanel(clinic.clinicId)}
                                  className="w-full mt-3 text-xs"
                                >
                                  {expandedClinics.has(clinic.clinicId) ? (
                                    <>
                                      <ChevronUp className="w-3 h-3 mr-1" />
                                      Hide Debug
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-3 h-3 mr-1" />
                                      Show Debug
                                    </>
                                  )}
                                </Button>

                                {expandedClinics.has(clinic.clinicId) && (
                                  <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs space-y-3">
                                    {/* Basic Stats */}
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <span className="text-muted-foreground">Distance:</span>
                                        <span className="ml-1 font-mono">
                                          {clinic.debug.distanceMiles?.toFixed(2) || "N/A"} mi
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Raw Score:</span>
                                        <span className="ml-1 font-mono">{clinic.debug.rawScore}/{clinic.debug.categories.reduce((sum, c) => sum + c.maxPoints, 0)}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground">Treatment:</span>
                                        {clinic.debug.treatmentMatch ? (
                                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                                        ) : (
                                          <XCircle className="w-3 h-3 text-red-600" />
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground">Anxiety:</span>
                                        {clinic.debug.anxietyMatched ? (
                                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                                        ) : (
                                          <XCircle className="w-3 h-3 text-red-600" />
                                        )}
                                      </div>
                                    </div>

                                    {/* Score Breakdown with Visual Bar */}
                                    <div className="border-t pt-2">
                                      <span className="text-muted-foreground font-medium">Score Breakdown:</span>
                                      <div className="mt-2 space-y-2">
                                        {clinic.debug.categories.map((cat) => (
                                          <div key={cat.category}>
                                            <div className="flex justify-between mb-1">
                                              <span className="capitalize font-medium">{cat.category}</span>
                                              <span className="font-mono text-muted-foreground">
                                                {cat.points}/{cat.maxPoints}
                                              </span>
                                            </div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                              <div 
                                                className={`h-full rounded-full ${
                                                  cat.points === cat.maxPoints ? 'bg-green-500' :
                                                  cat.points > 0 ? 'bg-teal-500' : 'bg-gray-300'
                                                }`}
                                                style={{ width: `${cat.maxPoints > 0 ? (cat.points / cat.maxPoints) * 100 : 0}%` }}
                                              />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Matched Tags by Category */}
                                    {clinic.debug.reasonsDebug && (
                                      <div className="border-t pt-2">
                                        <span className="text-muted-foreground font-medium">Matched Tags by Category:</span>
                                        <div className="mt-2 space-y-2">
                                          {Object.entries(clinic.debug.reasonsDebug.matchedTagsByCategory).map(([category, tags]) => (
                                            tags.length > 0 && (
                                              <div key={category}>
                                                <span className="capitalize text-muted-foreground">{category}:</span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                  {tags.map((tag) => (
                                                    <Badge key={tag} variant="secondary" className="text-[10px] font-mono">
                                                      {tag}
                                                    </Badge>
                                                  ))}
                                                </div>
                                              </div>
                                            )
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Reasons Generation Debug */}
                                    {clinic.debug.reasonsDebug && (
                                      <div className="border-t pt-2">
                                        <span className="text-muted-foreground font-medium">Reason Generation:</span>
                                        <div className="mt-1 grid grid-cols-2 gap-2">
                                          <div>
                                            <span className="text-muted-foreground">Primary Key:</span>
                                            <Badge variant="outline" className="ml-1 text-[10px] font-mono">
                                              {clinic.debug.reasonsDebug.primaryReasonKey}
                                            </Badge>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Fallbacks Used:</span>
                                            <span className="ml-1 font-mono">{clinic.debug.reasonsDebug.fallbacksUsed}</span>
                                          </div>
                                        </div>
                                        <div className="mt-2">
                                          <span className="text-muted-foreground">All Reason Keys:</span>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {clinic.debug.reasonsDebug.reasonKeys.map((key, i) => (
                                              <Badge 
                                                key={key} 
                                                variant={i === 0 ? "default" : "secondary"} 
                                                className="text-[10px] font-mono"
                                              >
                                                {key}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Clinic's Filter Keys */}
                                    {clinic.filterKeys && clinic.filterKeys.length > 0 && (
                                      <div className="border-t pt-2">
                                        <span className="text-muted-foreground font-medium">
                                          Clinic Tags ({clinic.filterKeys.length}):
                                        </span>
                                        <div className="flex flex-wrap gap-1 mt-1 max-h-24 overflow-y-auto">
                                          {clinic.filterKeys.map((tag) => (
                                            <Badge key={tag} variant="outline" className="text-[9px] font-mono bg-gray-100">
                                              {tag.replace('TAG_', '')}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Clinic Status & Metadata */}
                                    <div className="border-t pt-2 space-y-2">
                                      <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">Verified:</span>
                                          {clinic.verified ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                                          ) : (
                                            <XCircle className="w-4 h-4 text-amber-500" />
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">Type:</span>
                                          <Badge variant="outline" className={`text-[9px] ${clinic.isDirectoryListing ? "bg-orange-50 text-orange-700" : "bg-green-50 text-green-700"}`}>
                                            {clinic.isDirectoryListing ? "Directory Listing" : "Full Match"}
                                          </Badge>
                                        </div>
                                      </div>
                                      {clinic.isDirectoryListing && (
                                        <div className="grid grid-cols-3 gap-2">
                                          <div>
                                            <span className="text-muted-foreground">Rating:</span>
                                            <span className="ml-1 font-mono">{clinic.rating ?? "—"}</span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Reviews:</span>
                                            <span className="ml-1 font-mono">{clinic.reviewCount ?? 0}</span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Price:</span>
                                            <span className="ml-1 font-mono">{clinic.priceRange || "—"}</span>
                                          </div>
                                        </div>
                                      )}
                                      {!clinic.isDirectoryListing && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">Price Range:</span>
                                          <span className="font-mono">{clinic.priceRange || "not set"}</span>
                                        </div>
                                      )}
                                      {clinic.explanationVersion && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-muted-foreground text-[10px]">v{clinic.explanationVersion}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Load More */}
                    {results.rankedClinics.length > visibleCount && (
                      <Button variant="outline" onClick={() => setVisibleCount((v) => v + 3)} className="w-full">
                        Load More ({results.rankedClinics.length - visibleCount} remaining)
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
