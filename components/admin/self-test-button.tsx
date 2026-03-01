"use client"

import { useState } from "react"
import { FlaskConical, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  TestInfoTooltip,
  TestRowTooltip,
  TEST_INFO,
  TEST_ROW_EXPLANATIONS,
  getFriendlyErrorMessage,
} from "./test-info-tooltip"
import { updateQAStatus } from "./qa-status-banner"

interface TestResult {
  name: string
  status: "pass" | "fail"
  message: string
  details?: any
}

interface SelfTestResponse {
  summary: {
    total: number
    passed: number
    failed: number
    status: string
  }
  contractVersion: string
  timestamp: string
  results: TestResult[]
}

export function SelfTestButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<SelfTestResponse | null>(null)
  const [open, setOpen] = useState(false)

  const runSelfTest = async () => {
    setIsLoading(true)
    setResults(null)

    try {
      const response = await fetch("/api/admin/self-test", {
        method: "POST",
      })
      const data = await response.json()
      setResults(data)
      updateQAStatus({
        lastSelfTestAt: new Date().toISOString(),
        selfTestPassed: data.summary.status === "ALL_PASS",
      })
    } catch (error) {
      console.error("Self-test failed:", error)
      updateQAStatus({
        lastSelfTestAt: new Date().toISOString(),
        selfTestPassed: false,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const failedResults = results?.results.filter((r) => r.status === "fail") || []

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-col h-auto py-2 px-3 bg-transparent"
            onClick={() => {
              setOpen(true)
              runSelfTest()
            }}
          >
            <span className="flex items-center gap-1.5">
              <FlaskConical className="w-4 h-4" />
              <span className="font-medium hidden sm:inline">Run System Health Checks</span>
              <span className="font-medium sm:hidden">Health Check</span>
            </span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">(Self-Test)</span>
          </Button>
          <TestInfoTooltip {...TEST_INFO.selfTest} />
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5" />
            System Health Checks
            <TestInfoTooltip {...TEST_INFO.selfTest} />
          </DialogTitle>
          <DialogDescription>
            Quick internal checks to confirm the database + matching engine are working.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">Running automated tests...</p>
          </div>
        )}

        {results && (
          <div className="space-y-4">
            {/* Summary */}
            <div
              className={`p-4 rounded-lg ${
                results.summary.status === "ALL_PASS"
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {results.summary.status === "ALL_PASS" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className="font-semibold">
                  {results.summary.passed}/{results.summary.total} tests passed
                </span>
              </div>
            </div>

            {/* Individual Results with info icons */}
            <div className="space-y-2">
              {results.results.map((result, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    result.status === "pass" ? "bg-green-50/50 border-green-100" : "bg-red-50/50 border-red-100"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {result.status === "pass" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm">{result.name}</span>
                        <TestRowTooltip
                          explanation={
                            TEST_ROW_EXPLANATIONS[result.name] || "Verifies this aspect of the system works correctly."
                          }
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{result.message}</p>
                    </div>
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

            <details className="text-xs">
              <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                Technical details
              </summary>
              <p className="mt-1 text-muted-foreground">Contract: {results.contractVersion}</p>
            </details>

            {/* Rerun Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={runSelfTest}
              disabled={isLoading}
              className="w-full bg-transparent"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                "Run Again"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
