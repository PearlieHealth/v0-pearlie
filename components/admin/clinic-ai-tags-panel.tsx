"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, Check, X, RefreshCw, Globe, Quote, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { TAG_CATEGORIES, type TagCategory } from "@/lib/matching/tag-schema"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface AITag {
  filter_key: string
  filter_name: string
  category: TagCategory
  evidence: string | null
  created_at: string
}

interface ClinicAITagsPanelProps {
  clinicId: string
  clinicWebsite: string | null
  onTagsUpdated?: () => void
}

export function ClinicAITagsPanel({ clinicId, clinicWebsite, onTagsUpdated }: ClinicAITagsPanelProps) {
  const [isExtracting, setIsExtracting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [aiTags, setAITags] = useState<AITag[]>([])
  const [processingTagId, setProcessingTagId] = useState<string | null>(null)
  const { toast } = useToast()

  // Load AI-suggested tags
  const loadAITags = async () => {
    try {
      const res = await fetch(`/api/admin/clinic-filter-selections?clinicId=${clinicId}&source=ai_website`)
      if (!res.ok) throw new Error("Failed to load AI tags")
      const data = await res.json()
      setAITags(data.selections || [])
    } catch (error) {
      console.error("Error loading AI tags:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAITags()
  }, [clinicId])

  // Extract signals from website
  const handleExtract = async () => {
    if (!clinicWebsite) {
      toast({
        title: "No website configured",
        description: "Please add a website URL to the clinic before extracting signals.",
        variant: "destructive",
      })
      return
    }

    setIsExtracting(true)
    try {
      const res = await fetch(`/api/admin/clinics/${clinicId}/extract-signals`, {
        method: "POST",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to extract signals")
      }

      toast({
        title: "Signals extracted",
        description: `Found ${data.application.added.length} new tags from ${data.extraction.pagesScraped} pages.`,
      })

      // Reload AI tags
      await loadAITags()
      onTagsUpdated?.()
    } catch (error) {
      toast({
        title: "Extraction failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsExtracting(false)
    }
  }

  // Approve a tag (convert from ai_website to manual)
  const handleApprove = async (filterKey: string) => {
    setProcessingTagId(filterKey)
    try {
      const res = await fetch(`/api/admin/clinic-filter-selections/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId, filterKey, source: "manual" }),
      })

      if (!res.ok) throw new Error("Failed to approve tag")

      toast({ title: "Tag approved" })
      setAITags(prev => prev.filter(t => t.filter_key !== filterKey))
      onTagsUpdated?.()
    } catch (error) {
      toast({
        title: "Failed to approve tag",
        variant: "destructive",
      })
    } finally {
      setProcessingTagId(null)
    }
  }

  // Reject a tag (delete it)
  const handleReject = async (filterKey: string) => {
    setProcessingTagId(filterKey)
    try {
      const res = await fetch(`/api/admin/clinic-filter-selections/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId, filterKey }),
      })

      if (!res.ok) throw new Error("Failed to reject tag")

      toast({ title: "Tag rejected" })
      setAITags(prev => prev.filter(t => t.filter_key !== filterKey))
      onTagsUpdated?.()
    } catch (error) {
      toast({
        title: "Failed to reject tag",
        variant: "destructive",
      })
    } finally {
      setProcessingTagId(null)
    }
  }

  // Approve all tags
  const handleApproveAll = async () => {
    setIsLoading(true)
    try {
      await Promise.all(aiTags.map(tag => 
        fetch(`/api/admin/clinic-filter-selections/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clinicId, filterKey: tag.filter_key, source: "manual" }),
        })
      ))

      toast({ title: "All tags approved" })
      setAITags([])
      onTagsUpdated?.()
    } catch (error) {
      toast({
        title: "Failed to approve all tags",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Group tags by category
  const tagsByCategory = aiTags.reduce((acc, tag) => {
    if (!acc[tag.category]) acc[tag.category] = []
    acc[tag.category].push(tag)
    return acc
  }, {} as Record<TagCategory, AITag[]>)

  const getCategoryInfo = (category: TagCategory) => {
    return TAG_CATEGORIES[category] || { label: category, color: "gray" }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-purple-500" />
              AI-Extracted Tags
            </CardTitle>
            <CardDescription>
              Tags automatically extracted from the clinic website for review
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExtract}
            disabled={isExtracting || !clinicWebsite}
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {aiTags.length > 0 ? "Re-extract" : "Extract from Website"}
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!clinicWebsite && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>No website URL configured. Add a website to extract tags automatically.</span>
          </div>
        )}

        {clinicWebsite && aiTags.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No AI-extracted tags pending review.</p>
            <p className="text-sm mt-1">Click "Extract from Website" to analyze the clinic website.</p>
          </div>
        )}

        {aiTags.length > 0 && (
          <div className="space-y-4">
            {/* Bulk actions */}
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="text-sm text-muted-foreground">
                {aiTags.length} tag{aiTags.length !== 1 ? "s" : ""} pending review
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Check className="w-4 h-4 mr-1" />
                    Approve All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Approve all AI tags?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will approve all {aiTags.length} AI-extracted tags and add them to the clinic's profile.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleApproveAll}>
                      Approve All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Tags grouped by category */}
            {Object.entries(tagsByCategory).map(([category, tags]) => {
              const categoryInfo = getCategoryInfo(category as TagCategory)
              return (
                <div key={category} className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {categoryInfo.label}
                  </h4>
                  <div className="space-y-2">
                    {tags.map((tag) => (
                      <div
                        key={tag.filter_key}
                        className="flex items-start justify-between gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-normal">
                              {tag.filter_name}
                            </Badge>
                          </div>
                          {tag.evidence && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="mt-1.5 text-xs text-muted-foreground flex items-start gap-1 cursor-help">
                                    <Quote className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                    <span className="line-clamp-2 italic">"{tag.evidence}"</span>
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-sm">
                                  <p className="text-sm italic">"{tag.evidence}"</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApprove(tag.filter_key)}
                            disabled={processingTagId === tag.filter_key}
                          >
                            {processingTagId === tag.filter_key ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleReject(tag.filter_key)}
                            disabled={processingTagId === tag.filter_key}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
