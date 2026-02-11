"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, BarChart3, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  TestInfoTooltip,
  TestRowTooltip,
  TEST_INFO,
  TEST_ROW_EXPLANATIONS,
  getFriendlyErrorMessage,
} from "./test-info-tooltip"

interface CheckResult {
  name: string
  status: "pass" | "fail" | "warning"
  message: string
  details?: Record<string, unknown>
}

interface SelfCheckResult {
  summary: {
    total: number
    passed: number
    failed: number
    warnings: number
    overallStatus: "pass" | "fail" | "warning"
  }
  checks: CheckResult[]
  timestamp: string
}

export function AnalyticsSelfCheckButton() {
  const { toast } = useToast()
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<SelfCheckResult | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const runCheck = async () => {
    setIsRunning(true)
    setResults(null)

    try {
      const response = await fetch("/api/admin/analytics-self-check")
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setResults(data)

      if (data.summary.failed > 0) {
        toast({
          title: "Analytics Check Failed",
          description: `${data.summary.failed} check(s) failed`,
          variant: "destructive",
        })
      } else if (data.summary.warnings > 0) {
        toast({
          title: "Analytics Check Complete",
          description: `${data.summary.warnings} warning(s) found`,
        })
      } else {
        toast({
          title: "Analytics Check Passed",
          description: "All metrics are valid",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: "pass" | "fail" | "warning") => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "fail":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
    }
  }

  const failedResults = results?.checks.filter((r) => r.status === "fail") || []

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="flex-col h-auto py-2 px-3 bg-transparent">
            <span className="flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="font-medium">Run Analytics Sanity Check</span>
            </span>
            <span className="text-[10px] text-muted-foreground">(Analytics Check)</span>
          </Button>
          <TestInfoTooltip {...TEST_INFO.analyticsCheck} />
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Analytics Sanity Check
            <TestInfoTooltip {...TEST_INFO.analyticsCheck} />
          </DialogTitle>
          <DialogDescription>Verifies dashboard numbers can't show impossible metrics.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button onClick={runCheck} disabled={isRunning} className="w-full">
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running checks...
              </>
            ) : (
              "Run Analytics Sanity Check"
            )}
          </Button>

          {results && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Overall Status</span>
                <Badge
                  variant={
                    results.summary.overallStatus === "pass"
                      ? "default"
                      : results.summary.overallStatus === "fail"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {results.summary.passed}/{results.summary.total} passed
                  {results.summary.warnings > 0 && `, ${results.summary.warnings} warnings`}
                </Badge>
              </div>

              {/* Individual Checks with info icons */}
              <div className="space-y-2">
                {results.checks.map((check, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                    {getStatusIcon(check.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm">{check.name}</span>
                        <TestRowTooltip
                          explanation={
                            TEST_ROW_EXPLANATIONS[check.name] || "Verifies this metric is calculated correctly."
                          }
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">{check.message}</div>
                    </div>
                  </div>
                ))}
              </div>

              {failedResults.length > 0 && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <h4 className="font-medium text-sm text-red-800 mb-2">What failed?</h4>
                  <div className="space-y-2">
                    {failedResults.map((result, idx) => {
                      const friendlyMessage = getFriendlyErrorMessage(result.message)
                      return (
                        <div key={idx} className="text-xs text-red-700">
                          <p className="font-medium">{result.name}</p>
                          {friendlyMessage && <p className="mt-0.5 text-red-600">{friendlyMessage}</p>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground text-center">
                Last run: {new Date(results.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
