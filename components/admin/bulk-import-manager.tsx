"use client"

import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Play,
  Square,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  MapPin,
  Image,
  DollarSign,
  SkipForward,
  ExternalLink,
  RefreshCw,
} from "lucide-react"

// London neighbourhood seeds (must match server-side)
const LONDON_NEIGHBOURHOODS: Record<string, string[]> = {
  Central: [
    "Soho", "Mayfair", "Marylebone", "Fitzrovia", "Covent Garden",
    "Bank", "London Bridge", "Holborn", "Bloomsbury", "Westminster",
  ],
  North: [
    "Islington", "Camden", "Hampstead", "Finchley", "Muswell Hill",
    "Highgate", "Crouch End", "Stoke Newington",
  ],
  East: [
    "Shoreditch", "Canary Wharf", "Stratford", "Walthamstow",
    "Bethnal Green", "Mile End", "Hackney",
  ],
  West: [
    "Kensington", "Chelsea", "Hammersmith", "Ealing", "Chiswick",
    "Notting Hill", "Fulham", "Shepherd's Bush",
  ],
  South: [
    "Clapham", "Balham", "Wimbledon", "Greenwich", "Dulwich",
    "Brixton", "Peckham", "Putney", "Croydon",
  ],
}

const ALL_NEIGHBOURHOODS = Object.values(LONDON_NEIGHBOURHOODS).flat()

interface BatchClinicResult {
  placeId: string
  name: string
  status: "imported" | "skipped" | "failed"
  clinicId?: string
  reason?: string
  photosOk: boolean
  pricingOk: boolean
  priceCount?: number
}

interface ImportRun {
  id: string
  status: string
  target_count: number
  min_rating: number
  min_review_count: number
  imported_count: number
  skipped_count: number
  failed_count: number
  photos_success_count: number
  photos_failed_count: number
  pricing_success_count: number
  pricing_failed_count: number
  neighbourhoods_completed: string[]
  current_neighbourhood: string | null
  started_at: string
  completed_at: string | null
  import_log: BatchClinicResult[]
}

type ImportPhase = "idle" | "running" | "completed" | "cancelled" | "failed"

export function BulkImportManager() {
  // Configuration
  const [targetCount, setTargetCount] = useState(100)
  const [minRating, setMinRating] = useState(4.5)
  const [minReviewCount, setMinReviewCount] = useState(100)

  // Import state
  const [phase, setPhase] = useState<ImportPhase>("idle")
  const [runId, setRunId] = useState<string | null>(null)
  const [currentNeighbourhood, setCurrentNeighbourhood] = useState<string | null>(null)
  const [completedNeighbourhoods, setCompletedNeighbourhoods] = useState<string[]>([])
  const [totalImported, setTotalImported] = useState(0)
  const [totalSkipped, setTotalSkipped] = useState(0)
  const [totalFailed, setTotalFailed] = useState(0)
  const [photosOk, setPhotosOk] = useState(0)
  const [photosFail, setPhotosFail] = useState(0)
  const [pricingOk, setPricingOk] = useState(0)
  const [pricingFail, setPricingFail] = useState(0)
  const [allResults, setAllResults] = useState<BatchClinicResult[]>([])
  const [batchLog, setBatchLog] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  // Past runs
  const [pastRuns, setPastRuns] = useState<ImportRun[]>([])
  const [loadingRuns, setLoadingRuns] = useState(false)

  const cancelledRef = useRef(false)

  const addLog = useCallback((msg: string) => {
    setBatchLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }, [])

  // ------- Load past runs -------
  const loadPastRuns = useCallback(async () => {
    setLoadingRuns(true)
    try {
      const res = await fetch("/api/admin/bulk-import")
      if (res.ok) {
        const data = await res.json()
        setPastRuns(data.runs || [])
      }
    } catch {
      // ignore
    } finally {
      setLoadingRuns(false)
    }
  }, [])

  // ------- Start import -------
  const startImport = async () => {
    setPhase("running")
    setError(null)
    cancelledRef.current = false
    setAllResults([])
    setBatchLog([])
    setTotalImported(0)
    setTotalSkipped(0)
    setTotalFailed(0)
    setPhotosOk(0)
    setPhotosFail(0)
    setPricingOk(0)
    setPricingFail(0)
    setCompletedNeighbourhoods([])

    addLog(`Starting bulk import: target=${targetCount}, min_rating=${minRating}, min_reviews=${minReviewCount}`)

    // Step 1: Create the run
    try {
      const createRes = await fetch("/api/admin/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_count: targetCount,
          min_rating: minRating,
          min_review_count: minReviewCount,
        }),
      })

      if (!createRes.ok) {
        const err = await createRes.json()
        throw new Error(err.error || "Failed to create import run")
      }

      const { runId: newRunId } = await createRes.json()
      setRunId(newRunId)
      addLog(`Import run created: ${newRunId}`)

      // Step 2: Process each neighbourhood
      let imported = 0

      for (const neighbourhood of ALL_NEIGHBOURHOODS) {
        if (cancelledRef.current) {
          addLog("Import cancelled by user")
          setPhase("cancelled")
          // Mark run as cancelled
          await fetch(`/api/admin/bulk-import/${newRunId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "cancelled" }),
          })
          return
        }

        if (imported >= targetCount) {
          addLog(`Target of ${targetCount} clinics reached! Stopping.`)
          break
        }

        setCurrentNeighbourhood(neighbourhood)
        addLog(`Searching: ${neighbourhood}...`)

        try {
          const batchRes = await fetch("/api/admin/bulk-import/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ runId: newRunId, neighbourhood }),
          })

          if (!batchRes.ok) {
            const err = await batchRes.json()
            addLog(`Error processing ${neighbourhood}: ${err.error}`)
            continue
          }

          const batchData = await batchRes.json()
          const results: BatchClinicResult[] = batchData.results || []

          // Update counts
          const batchImported = results.filter((r: BatchClinicResult) => r.status === "imported").length
          const batchSkipped = results.filter((r: BatchClinicResult) => r.status === "skipped").length
          const batchFailed = results.filter((r: BatchClinicResult) => r.status === "failed").length
          const batchPhotosOk = results.filter((r: BatchClinicResult) => r.photosOk).length
          const batchPricingOk = results.filter((r: BatchClinicResult) => r.pricingOk).length

          imported = batchData.totalImported || (imported + batchImported)

          setTotalImported(imported)
          setTotalSkipped((prev) => prev + batchSkipped)
          setTotalFailed((prev) => prev + batchFailed)
          setPhotosOk((prev) => prev + batchPhotosOk)
          setPhotosFail((prev) => prev + (batchImported - batchPhotosOk))
          setPricingOk((prev) => prev + batchPricingOk)
          setPricingFail((prev) => prev + (batchImported - batchPricingOk))
          setAllResults((prev) => [...prev, ...results])
          setCompletedNeighbourhoods((prev) => [...prev, neighbourhood])

          addLog(
            `${neighbourhood}: +${batchImported} imported, ${batchSkipped} skipped, ${batchFailed} failed (total: ${imported}/${targetCount})`,
          )

          if (batchData.done) {
            addLog(`Target reached! Total imported: ${imported}`)
            break
          }
        } catch (err) {
          addLog(`Network error processing ${neighbourhood}: ${err instanceof Error ? err.message : "unknown"}`)
        }
      }

      // Step 3: Mark run as completed
      setCurrentNeighbourhood(null)
      setPhase("completed")
      addLog(`Import complete! ${imported} clinics imported.`)

      await fetch(`/api/admin/bulk-import/${newRunId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setError(msg)
      setPhase("failed")
      addLog(`Import failed: ${msg}`)
    }
  }

  const cancelImport = () => {
    cancelledRef.current = true
    addLog("Cancelling import after current batch...")
  }

  const progress = ALL_NEIGHBOURHOODS.length > 0
    ? (completedNeighbourhoods.length / ALL_NEIGHBOURHOODS.length) * 100
    : 0

  const importedResults = allResults.filter((r) => r.status === "imported")
  const skippedResults = allResults.filter((r) => r.status === "skipped")
  const failedResults = allResults.filter((r) => r.status === "failed")

  return (
    <div className="space-y-6">
      {/* Configuration */}
      {phase === "idle" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Import Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target">Target clinic count</Label>
                <Input
                  id="target"
                  type="number"
                  value={targetCount}
                  onChange={(e) => setTargetCount(Number(e.target.value))}
                  min={1}
                  max={200}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rating">Minimum Google rating</Label>
                <Input
                  id="rating"
                  type="number"
                  step={0.1}
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  min={0}
                  max={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviews">Minimum review count</Label>
                <Input
                  id="reviews"
                  type="number"
                  value={minReviewCount}
                  onChange={(e) => setMinReviewCount(Number(e.target.value))}
                  min={0}
                />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Import settings</p>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    <li>All clinics will be created as <strong>drafts</strong> (is_live = false)</li>
                    <li>Searches {ALL_NEIGHBOURHOODS.length} London neighbourhoods across {Object.keys(LONDON_NEIGHBOURHOODS).length} areas</li>
                    <li>Photos will be downloaded and stored permanently</li>
                    <li>Website pricing extraction will run automatically</li>
                    <li>Duplicates will be automatically skipped</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={startImport}
                className="bg-[#004443] hover:bg-[#003332]"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Import
              </Button>
              <Button variant="outline" onClick={loadPastRuns} disabled={loadingRuns}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingRuns ? "animate-spin" : ""}`} />
                Load Past Runs
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      {phase !== "idle" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {phase === "running" ? "Import in Progress" : phase === "completed" ? "Import Complete" : phase === "cancelled" ? "Import Cancelled" : "Import Failed"}
              </CardTitle>
              {phase === "running" && (
                <Button variant="destructive" size="sm" onClick={cancelImport}>
                  <Square className="w-3 h-3 mr-1" />
                  Stop
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {currentNeighbourhood
                    ? `Processing: ${currentNeighbourhood}`
                    : phase === "completed"
                      ? "All neighbourhoods processed"
                      : phase === "cancelled"
                        ? "Stopped by user"
                        : ""}
                </span>
                <span className="font-medium">
                  {completedNeighbourhoods.length}/{ALL_NEIGHBOURHOODS.length} areas
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
                label="Imported"
                value={totalImported}
                target={targetCount}
              />
              <StatCard
                icon={<SkipForward className="w-4 h-4 text-blue-600" />}
                label="Skipped (dup)"
                value={totalSkipped}
              />
              <StatCard
                icon={<Image className="w-4 h-4 text-purple-600" />}
                label="Photos OK"
                value={photosOk}
                total={totalImported}
              />
              <StatCard
                icon={<DollarSign className="w-4 h-4 text-amber-600" />}
                label="Pricing found"
                value={pricingOk}
                total={totalImported}
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Neighbourhood chips */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Neighbourhood Coverage
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_NEIGHBOURHOODS.map((n) => {
                  const isDone = completedNeighbourhoods.includes(n)
                  const isCurrent = currentNeighbourhood === n
                  return (
                    <Badge
                      key={n}
                      variant={isDone ? "default" : "outline"}
                      className={`text-xs ${
                        isCurrent
                          ? "bg-blue-600 text-white animate-pulse"
                          : isDone
                            ? "bg-green-100 text-green-800 border-green-300"
                            : "text-muted-foreground"
                      }`}
                    >
                      {isCurrent && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      {isDone && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {n}
                    </Badge>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results table */}
      {allResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Import Results ({allResults.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Imported clinics */}
              {importedResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-green-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Imported ({importedResults.length})
                  </h4>
                  <div className="divide-y border rounded-lg max-h-64 overflow-y-auto">
                    {importedResults.map((r) => (
                      <div
                        key={r.placeId}
                        className="px-3 py-2 flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate font-medium">{r.name}</span>
                          {r.clinicId && (
                            <a
                              href={`/admin/clinics`}
                              className="text-blue-600 hover:underline flex-shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${r.photosOk ? "border-green-300 text-green-700" : "border-red-300 text-red-700"}`}
                          >
                            <Image className="w-2.5 h-2.5 mr-0.5" />
                            {r.photosOk ? "OK" : "fail"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${r.pricingOk ? "border-green-300 text-green-700" : "border-amber-300 text-amber-700"}`}
                          >
                            <DollarSign className="w-2.5 h-2.5 mr-0.5" />
                            {r.pricingOk ? `${r.priceCount}` : "none"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skipped clinics */}
              {skippedResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-blue-700 flex items-center gap-1">
                    <SkipForward className="w-4 h-4" />
                    Skipped — duplicates ({skippedResults.length})
                  </h4>
                  <div className="divide-y border rounded-lg max-h-32 overflow-y-auto">
                    {skippedResults.map((r) => (
                      <div key={r.placeId} className="px-3 py-1.5 text-sm text-muted-foreground">
                        {r.name} — {r.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed clinics */}
              {failedResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-red-700 flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    Failed ({failedResults.length})
                  </h4>
                  <div className="divide-y border rounded-lg max-h-32 overflow-y-auto">
                    {failedResults.map((r) => (
                      <div key={r.placeId} className="px-3 py-1.5 text-sm text-red-600">
                        {r.name} — {r.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity log */}
      {batchLog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs space-y-0.5">
              {batchLog.map((line, i) => (
                <div key={i} className="text-gray-700">
                  {line}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New import button when done */}
      {(phase === "completed" || phase === "cancelled" || phase === "failed") && (
        <Button
          variant="outline"
          onClick={() => {
            setPhase("idle")
            setRunId(null)
            setAllResults([])
            setBatchLog([])
          }}
        >
          Start New Import
        </Button>
      )}

      {/* Past runs */}
      {pastRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Past Import Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {pastRuns.map((run) => (
                <div key={run.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          run.status === "completed"
                            ? "default"
                            : run.status === "running"
                              ? "secondary"
                              : "destructive"
                        }
                        className={
                          run.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : ""
                        }
                      >
                        {run.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {run.started_at
                          ? new Date(run.started_at).toLocaleString()
                          : "Not started"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-3">
                      <span>Imported: {run.imported_count}</span>
                      <span>Skipped: {run.skipped_count}</span>
                      <span>Failed: {run.failed_count}</span>
                      <span>Photos: {run.photos_success_count}</span>
                      <span>Pricing: {run.pricing_success_count}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Target: {run.target_count}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ------- Helper components -------

function StatCard({
  icon,
  label,
  value,
  target,
  total,
}: {
  icon: React.ReactNode
  label: string
  value: number
  target?: number
  total?: number
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-xl font-bold">
        {value}
        {target != null && (
          <span className="text-sm font-normal text-muted-foreground">/{target}</span>
        )}
        {total != null && (
          <span className="text-sm font-normal text-muted-foreground">/{total}</span>
        )}
      </div>
    </div>
  )
}
