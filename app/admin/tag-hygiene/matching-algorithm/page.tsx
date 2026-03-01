"use client"

import { useState, useEffect } from "react"
import { AdminNav } from "@/components/admin/admin-nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowRight,
  Save,
  RefreshCw,
  Info,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Settings2,
  FileText,
  Link2,
  Zap,
  Bot,
} from "lucide-react"
import {
  WEIGHT_CONFIG,
  Q4_PRIORITY_TAG_MAP,
  Q5_BLOCKER_TAG_MAP,
  Q8_COST_TAG_MAP,
  Q10_ANXIETY_TAG_MAP,
  REASON_TEMPLATES,
  FALLBACK_REASONS,
  TAG_CATEGORIES,
  getTagCategory,
} from "@/lib/matching/tag-schema"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Color mappings for visual display
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  q4_priorities: { bg: "bg-teal-50", text: "text-blue-700", border: "border-teal-200" },
  q5_blockers: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  q8_cost: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  q10_anxiety: { bg: "bg-teal-50", text: "text-purple-700", border: "border-teal-200" },
  profile: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
  unknown: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
}

interface ReasonVariation {
  tagKey: string
  templates: string[]
  currentIndex: number
}

export default function MatchingAlgorithmPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("overview")
  const [isSaving, setIsSaving] = useState(false)
  const [editedTemplates, setEditedTemplates] = useState<Record<string, string>>({})
  const [reasonVariations, setReasonVariations] = useState<ReasonVariation[]>([])

  // Initialize reason variations from REASON_TEMPLATES
  useEffect(() => {
    const variations: ReasonVariation[] = Object.entries(REASON_TEMPLATES).map(([tagKey, templates]) => ({
      tagKey,
      templates: Array.isArray(templates) ? templates : [templates],
      currentIndex: 0,
    }))
    setReasonVariations(variations)
  }, [])

  const handleTemplateChange = (tagKey: string, value: string) => {
    setEditedTemplates((prev) => ({ ...prev, [tagKey]: value }))
  }

  const handleSaveTemplates = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/admin/matching-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reasonTemplates: editedTemplates }),
      })

      if (!response.ok) throw new Error("Failed to save")

      toast({
        title: "Configuration saved",
        description: "Reason templates updated. Changes will apply to new matches.",
      })
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Group tags by their source question
  const tagMappings = [
    {
      question: "Q4: What matters most when choosing a clinic?",
      description: "Patient selects up to 3 priorities. Each maps to a clinic tag.",
      map: Q4_PRIORITY_TAG_MAP,
      weight: WEIGHT_CONFIG.priorities,
      category: "q4_priorities",
    },
    {
      question: "Q5: What concerns might be holding you back?",
      description: "Patient selects blockers/concerns. Clinics with matching support tags score higher.",
      map: Q5_BLOCKER_TAG_MAP,
      weight: WEIGHT_CONFIG.blockers,
      category: "q5_blockers",
    },
    {
      question: "Q8: How would you prefer to approach cost?",
      description: "Patient selects cost approach. Clinics with matching finance options score higher.",
      map: Q8_COST_TAG_MAP,
      weight: WEIGHT_CONFIG.cost,
      category: "q8_cost",
    },
    {
      question: "Q10: How do you feel about dental treatment?",
      description: "Patient anxiety level. Anxious patients matched with anxiety-friendly clinics.",
      map: Q10_ANXIETY_TAG_MAP,
      weight: WEIGHT_CONFIG.anxiety,
      category: "q10_anxiety",
    },
  ]

  return (
    <div className="min-h-screen bg-secondary">
      <AdminNav />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Matching Algorithm</h1>
          <p className="text-muted-foreground">
            Visualize and configure how patient form answers connect to clinic tags and match reasons.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <Link2 className="h-4 w-4" />
              Tag Connections
            </TabsTrigger>
            <TabsTrigger value="weights" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Score Weights
            </TabsTrigger>
            <TabsTrigger value="reasons" className="gap-2">
              <FileText className="h-4 w-4" />
              Match Reasons
            </TabsTrigger>
            <TabsTrigger value="ai-agents" className="gap-2">
              <Bot className="h-4 w-4" />
              AI Agents
            </TabsTrigger>
          </TabsList>

          {/* Tag Connections Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  How Matching Works
                </CardTitle>
                <CardDescription>
                  Patient form answers map to TAG_* keys. Clinics with those tags score higher.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-16 bg-blue-100 border border-blue-300 rounded-lg flex items-center justify-center text-sm font-medium text-blue-700">
                        Patient Form
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      <div className="w-32 h-16 bg-amber-100 border border-amber-300 rounded-lg flex items-center justify-center text-sm font-medium text-amber-700">
                        TAG_* Keys
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      <div className="w-32 h-16 bg-green-100 border border-green-300 rounded-lg flex items-center justify-center text-sm font-medium text-green-700">
                        Clinic Tags
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      <div className="w-32 h-16 bg-purple-100 border border-purple-300 rounded-lg flex items-center justify-center text-sm font-medium text-purple-700">
                        Match Score
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {tagMappings.map((mapping) => {
              const colors = CATEGORY_COLORS[mapping.category] || CATEGORY_COLORS.unknown
              return (
                <Card key={mapping.question} className={`${colors.border} border`}>
                  <CardHeader className={colors.bg}>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className={`text-base ${colors.text}`}>{mapping.question}</CardTitle>
                        <CardDescription className="mt-1">{mapping.description}</CardDescription>
                      </div>
                      <Badge variant="outline" className={`${colors.text} ${colors.border}`}>
                        Weight: {mapping.weight} pts
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid gap-3">
                      {Object.entries(mapping.map).map(([formValue, tagKey]) => (
                        <div
                          key={formValue}
                          className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium">{formValue.replace(/_/g, " ").replace(/-/g, " ")}</div>
                            <div className="text-xs text-muted-foreground">Form answer value</div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1">
                            <Badge variant="secondary" className="font-mono text-xs">
                              {tagKey}
                            </Badge>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm text-muted-foreground">
                              {REASON_TEMPLATES[tagKey]?.[0] || "No reason template"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </TabsContent>

          {/* Score Weights Tab */}
          <TabsContent value="weights" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Score Category Weights</CardTitle>
                <CardDescription>
                  How much each category contributes to the final match score. Total: 100 points max.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(WEIGHT_CONFIG).map(([category, weight]) => (
                    <div key={category} className="flex items-center gap-4">
                      <div className="w-32 text-sm font-medium capitalize">{category}</div>
                      <div className="flex-1">
                        <div className="h-8 bg-muted rounded-lg overflow-hidden">
                          <div
                            className="h-full bg-primary/80 flex items-center justify-end pr-2"
                            style={{ width: `${weight}%` }}
                          >
                            <span className="text-xs font-medium text-primary-foreground">{weight}%</span>
                          </div>
                        </div>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-[200px] text-sm">
                              {category === "treatment" && "Must-have: clinic offers requested treatment"}
                              {category === "distance" && "Geographic proximity to patient"}
                              {category === "priorities" && "Q4: Patient priority tag matches"}
                              {category === "blockers" && "Q5: Blocker/concern support tags"}
                              {category === "anxiety" && "Q10: Anxiety accommodation tags"}
                              {category === "cost" && "Q8: Cost approach alignment tags"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Weights are defined in code</p>
                      <p className="text-sm text-amber-700 mt-1">
                        To change weights, edit <code className="bg-amber-100 px-1 rounded">lib/matching/tag-schema.ts</code> WEIGHT_CONFIG.
                        Changes require code deployment.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Match Reasons Tab */}
          <TabsContent value="reasons" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Why We Matched You Templates</CardTitle>
                    <CardDescription>
                      Edit the text shown to patients explaining why each clinic was matched.
                      Each tag has a template that appears in the match reasons.
                    </CardDescription>
                  </div>
                  <Button onClick={handleSaveTemplates} disabled={isSaving}>
                    {isSaving ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(REASON_TEMPLATES).map(([tagKey, templates]) => {
                    const category = getTagCategory(tagKey)
                    const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.unknown
                    const categoryInfo = TAG_CATEGORIES[category]
                    const firstTemplate = Array.isArray(templates) ? templates[0] : templates

                    return (
                      <div key={tagKey} className={`p-4 rounded-lg border ${colors.border} ${colors.bg}`}>
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <Badge variant="outline" className={`${colors.text} ${colors.border} font-mono text-xs`}>
                              {tagKey}
                            </Badge>
                            <div className="mt-1">
                              <span className={`text-xs ${colors.text}`}>{categoryInfo?.label}</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <Input
                              value={editedTemplates[tagKey] ?? firstTemplate}
                              onChange={(e) => handleTemplateChange(tagKey, e.target.value)}
                              className="bg-card"
                              placeholder="Enter reason text..."
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Shown to patients when this tag matches
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-3">Fallback Reasons</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Used when fewer than 3 strong tag matches exist. Priority determines order.
                  </p>
                  <div className="space-y-3">
                    {FALLBACK_REASONS.map((fallback) => (
                      <div key={fallback.key} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                        <Badge variant="outline" className="font-mono text-xs">
                          Priority {fallback.priority}
                        </Badge>
                        <span className="flex-1 text-sm">{fallback.text}</span>
                        <Badge variant="secondary">{fallback.key}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Agents Tab */}
          <TabsContent value="ai-agents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Agents for Matching Maintenance
                </CardTitle>
                <CardDescription>
                  Potential AI agents that could automate matching algorithm updates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800">Yes, AI agents can help maintain this system</p>
                      <p className="text-sm text-green-700 mt-1">
                        Using Groq (already integrated) or the AI SDK, you can create agents for the following tasks:
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <Card className="border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        Agent 1: Reason Template Generator
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        Generates varied sentence templates for each tag to prevent repetitive match reasons.
                      </p>
                      <div className="bg-muted/50 rounded-lg p-3 text-sm font-mono">
                        <p className="text-muted-foreground">// Example prompt:</p>
                        <p>Generate 5 variations of: {`"Offers flexible payment plans"`}</p>
                        <p>Rules: Max 8 words, patient-focused, no generic phrases</p>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Badge variant="outline">Integration: Groq</Badge>
                        <Badge variant="outline">Model: llama-3.3-70b</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-500" />
                        Agent 2: Form-to-Tag Sync Validator
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        Compares intake form options against tag-schema.ts mappings. Alerts when they diverge.
                      </p>
                      <div className="bg-muted/50 rounded-lg p-3 text-sm font-mono">
                        <p className="text-muted-foreground">// Checks:</p>
                        <p>1. All form values have corresponding TAG_* mappings</p>
                        <p>2. All TAG_* keys have REASON_TEMPLATES entries</p>
                        <p>3. No orphaned tags in clinic_filter_selections</p>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Badge variant="outline">Integration: Supabase</Badge>
                        <Badge variant="outline">Trigger: On form change</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        Agent 3: Clinic Tag Auto-Suggester
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        Analyzes clinic website content and suggests relevant tags from the canonical set.
                      </p>
                      <div className="bg-muted/50 rounded-lg p-3 text-sm font-mono">
                        <p className="text-muted-foreground">// Already implemented!</p>
                        <p>See: lib/clinic-ingest/website-reader.ts</p>
                        <p>Uses: Groq + WebFetch to extract signals</p>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Badge variant="default">Active</Badge>
                        <Badge variant="outline">Integration: Groq + WebFetch</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-green-500" />
                        Agent 4: Match Quality Monitor
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        Monitors match outcomes and suggests weight adjustments based on conversion data.
                      </p>
                      <div className="bg-muted/50 rounded-lg p-3 text-sm font-mono">
                        <p className="text-muted-foreground">// Could analyze:</p>
                        <p>- Which reasons correlate with book_clicked events</p>
                        <p>- Which tag combinations have highest conversion</p>
                        <p>- Recommend weight changes based on data</p>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Badge variant="outline">Not implemented</Badge>
                        <Badge variant="outline">Needs: Analytics data + Groq</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                  <h4 className="font-medium text-teal-800 mb-2">How to Create These Agents</h4>
                  <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
                    <li>Create an API route in <code className="bg-blue-100 px-1 rounded">/api/admin/agents/[agent-name]/route.ts</code></li>
                    <li>Use the Groq integration (GROQ_API_KEY already configured)</li>
                    <li>Define clear prompts with structured output (JSON mode)</li>
                    <li>Add UI triggers or schedule with cron jobs</li>
                    <li>Store results in Supabase for audit trail</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
