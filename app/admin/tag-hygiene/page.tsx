"use client"

import { useState, useEffect } from "react"
import { AdminNav } from "@/components/admin/admin-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  XCircle,
  Archive,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { REASON_TEMPLATES, PROFILE_HIGHLIGHT_TAGS, isMatchingTag } from "@/lib/matching/tag-schema"
import Link from "next/link"

interface ClinicTagData {
  clinicId: string
  clinicName: string
  tags: string[]
  invalidTags: string[]
  validTags: string[]
  matchingTagCount: number
  highlightTagCount: number
  status: "NOT_MATCHABLE" | "WEAK" | "OK"
  missingCategories: string[]
  treatments: string[]
  isArchived: boolean
}

// All canonical TAG_* keys from tag-schema.ts
const CANONICAL_MATCHING_TAGS = Object.keys(REASON_TEMPLATES)
const CANONICAL_ALL_TAGS = [...CANONICAL_MATCHING_TAGS, ...PROFILE_HIGHLIGHT_TAGS]

export default function MatchReadinessPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [clinicData, setClinicData] = useState<ClinicTagData[]>([])
  const [archivedClinics, setArchivedClinics] = useState<ClinicTagData[]>([])
  const [isRemoving, setIsRemoving] = useState<string | null>(null)

  const fetchTagData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/tag-hygiene")
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      setClinicData(data.clinics || [])
      setArchivedClinics(data.archivedClinics || [])
    } catch (error) {
      toast({
        title: "Error loading tag data",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTagData()
  }, [])

  const removeInvalidTags = async (clinicId: string) => {
    setIsRemoving(clinicId)
    try {
      const response = await fetch("/api/admin/tag-hygiene", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId }),
      })
      const data = await response.json()
      if (data.error) throw new Error(data.error)

      toast({
        title: "Invalid tags removed",
        description: `Removed ${data.removedCount} invalid tag(s)`,
      })
      fetchTagData()
    } catch (error) {
      toast({
        title: "Error removing tags",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsRemoving(null)
    }
  }

  const totalInvalidTags = clinicData.reduce((sum, c) => sum + c.invalidTags.length, 0)
  const clinicsWithInvalidTags = clinicData.filter((c) => c.invalidTags.length > 0).length
  const notMatchableCount = clinicData.filter((c) => c.status === "NOT_MATCHABLE").length
  const weakCount = clinicData.filter((c) => c.status === "WEAK").length
  const okCount = clinicData.filter((c) => c.status === "OK").length

  const getStatusBadge = (status: "NOT_MATCHABLE" | "WEAK" | "OK") => {
    switch (status) {
      case "NOT_MATCHABLE":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            NOT MATCHABLE
          </Badge>
        )
      case "WEAK":
        return (
          <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600 bg-amber-50">
            <AlertCircle className="h-3 w-3" />
            WEAK
          </Badge>
        )
      case "OK":
        return (
          <Badge variant="outline" className="gap-1 border-green-500 text-green-600 bg-green-50">
            <CheckCircle2 className="h-3 w-3" />
            OK
          </Badge>
        )
    }
  }

  return (
    <div className="min-h-screen bg-secondary">
      <AdminNav />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Match Readiness</h1>
            <p className="text-muted-foreground">
              Audit clinic tags against the canonical 11Q schema. Clinics need matching tags to appear in patient results.
            </p>
          </div>
          <Link href="/admin/tag-hygiene/matching-algorithm">
            <Button variant="outline" className="gap-2 bg-transparent">
              <ExternalLink className="h-4 w-4" />
              Matching Algorithm
            </Button>
          </Link>
        </div>

        {/* Live Clinics Status Cards */}
        <div className="mb-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Live Clinic Status (Active Only)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Not Matchable</p>
                    <p className="text-2xl font-bold text-destructive">{notMatchableCount}</p>
                    <p className="text-xs text-muted-foreground">Blocks visibility</p>
                  </div>
                  <XCircle className="h-8 w-8 text-destructive/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Weak</p>
                    <p className="text-2xl font-bold text-amber-600">{weakCount}</p>
                    <p className="text-xs text-muted-foreground">May match poorly</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-amber-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">OK</p>
                    <p className="text-2xl font-bold text-green-600">{okCount}</p>
                    <p className="text-xs text-muted-foreground">Ready for matching</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Invalid Tags</p>
                    <p className="text-2xl font-bold">{totalInvalidTags}</p>
                    <p className="text-xs text-muted-foreground">Need cleanup</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchTagData} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Excluded from Matching */}
        {archivedClinics.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Excluded from Matching</h2>
            <Card className="bg-muted/30 border-muted">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Archived</p>
                    <p className="text-2xl font-bold text-muted-foreground">{archivedClinics.length}</p>
                    <p className="text-xs text-muted-foreground">Informational only</p>
                  </div>
                  <Archive className="h-8 w-8 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Status Legend */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Matchable Status Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-start gap-2">
                {getStatusBadge("NOT_MATCHABLE")}
                <span className="text-muted-foreground">
                  0 matching tags OR no treatments. Will not appear in patient results.
                </span>
              </div>
              <div className="flex items-start gap-2">
                {getStatusBadge("WEAK")}
                <span className="text-muted-foreground">1-5 matching tags. May match poorly with patients.</span>
              </div>
              <div className="flex items-start gap-2">
                {getStatusBadge("OK")}
                <span className="text-muted-foreground">6+ matching tags. Good coverage for patient matching.</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <Archive className="h-3 w-3" />
                  ARCHIVED
                </Badge>
                <span className="text-muted-foreground">Excluded from all matching. No warnings or errors.</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Per-Clinic Tag Audit - Active Clinics Only */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-8">
              <h2 className="text-lg font-semibold text-foreground">
                Live Clinics ({clinicData.length})
                {notMatchableCount > 0 && (
                  <span className="text-sm font-normal text-destructive ml-2">
                    {notMatchableCount} blocking patient visibility
                  </span>
                )}
              </h2>
              {clinicData.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">No active clinics found.</CardContent>
                </Card>
              ) : (
                clinicData.map((clinic) => (
                  <Card
                    key={clinic.clinicId}
                    className={
                      clinic.status === "NOT_MATCHABLE"
                        ? "border-destructive/50"
                        : clinic.status === "WEAK"
                          ? "border-amber-300"
                          : ""
                    }
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-base">{clinic.clinicName}</CardTitle>
                          {getStatusBadge(clinic.status)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/clinics?edit=${clinic.clinicId}`}>
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Edit Tags
                            </Button>
                          </Link>
                          {clinic.invalidTags.length > 0 && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeInvalidTags(clinic.clinicId)}
                              disabled={isRemoving === clinic.clinicId}
                            >
                              {isRemoving === clinic.clinicId ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                              )}
                              Remove Invalid
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* Tag Counts */}
                        <div className="flex gap-4 text-sm">
                          <span>
                            <strong>{clinic.matchingTagCount}</strong> matching tags
                          </span>
                          <span className="text-muted-foreground">
                            <strong>{clinic.highlightTagCount}</strong> highlights
                          </span>
                          <span className="text-muted-foreground">
                            <strong>{clinic.treatments.length}</strong> treatments
                          </span>
                        </div>

                        {/* Missing Categories Warning */}
                        {clinic.missingCategories.length > 0 && (
                          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                            <h4 className="text-sm font-medium text-amber-800 mb-1 flex items-center gap-1">
                              <AlertTriangle className="h-4 w-4" />
                              Missing Critical Tags
                            </h4>
                            <p className="text-sm text-amber-700">{clinic.missingCategories.join(", ")}</p>
                          </div>
                        )}

                        {/* Invalid Tags */}
                        {clinic.invalidTags.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-destructive mb-1">
                              Invalid/Deprecated Tags ({clinic.invalidTags.length})
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {clinic.invalidTags.map((tag) => (
                                <Badge key={tag} variant="destructive" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Valid Tags */}
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">
                            Assigned Tags ({clinic.validTags.length})
                          </h4>
                          {clinic.validTags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {clinic.validTags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant={isMatchingTag(tag) ? "secondary" : "outline"}
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No tags assigned</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {archivedClinics.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-t pt-6">
                  <Archive className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold text-muted-foreground">
                    Archived Clinics ({archivedClinics.length})
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  These clinics are archived and completely excluded from patient matching. They do not count toward
                  status totals and will never trigger warnings, errors, or validation failures.
                </p>
                <div className="space-y-2">
                  {archivedClinics.map((clinic) => (
                    <Card key={clinic.clinicId} className="bg-muted/30 border-muted">
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-muted-foreground">{clinic.clinicName}</span>
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              <Archive className="h-3 w-3 mr-1" />
                              Archived
                            </Badge>
                          </div>
                          <Link href={`/admin/clinics?edit=${clinic.clinicId}`}>
                            <Button variant="ghost" size="sm" className="text-muted-foreground">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
