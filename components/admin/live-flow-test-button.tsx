"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Play, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
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
  status: "PASS" | "FAIL" | "WARN"
  message: string
  details?: Record<string, unknown>
}

interface TestResponse {
  results: TestResult[]
  overallStatus: "PASS" | "FAIL" | "WARN"
}

export function LiveFlowTestButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [testResults, setTestResults] = useState<TestResponse | null>(null)

  const runTest = async () => {
    setIsRunning(true)
    setTestResults(null)
    try {
      const response = await fetch("/api/admin/live-flow-test", {
        method: "POST",
      })
      const data = await response.json()
      setTestResults(data)
      updateQAStatus({
        lastLiveFlowTestAt: new Date().toISOString(),
        liveFlowTestPassed: data.overallStatus === "PASS",
      })
    } catch (error) {
      setTestResults({
        results: [
          {
            name: "Network Error",
            status: "FAIL",
            message: error instanceof Error ? error.message : "Failed to run test",
          },
        ],
        overallStatus: "FAIL",
      })
      updateQAStatus({
        lastLiveFlowTestAt: new Date().toISOString(),
        liveFlowTestPassed: false,
      })
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: "PASS" | "FAIL" | "WARN") => {
    switch (status) {
      case "PASS":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "FAIL":
        return <XCircle className="h-4 w-4 text-destructive" />
      case "WARN":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
    }
  }

  const getOverallStatusColor = (status: "PASS" | "FAIL" | "WARN") => {
    switch (status) {
      case "PASS":
        return "text-green-600 bg-green-50 border-green-200"
      case "FAIL":
        return "text-destructive bg-red-50 border-red-200"
      case "WARN":
        return "text-amber-600 bg-amber-50 border-amber-200"
    }
  }

  const failedResults = testResults?.results.filter((r) => r.status === "FAIL") || []

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsOpen(true)
            runTest()
          }}
          className="flex-col h-auto py-2 px-3"
        >
          <span className="flex items-center gap-1.5">
            <Play className="h-4 w-4" />
            <span className="font-medium">Run Live Patient Journey Test</span>
          </span>
          <span className="text-[10px] text-muted-foreground">(Live Flow Test)</span>
        </Button>
        <TestInfoTooltip {...TEST_INFO.liveFlow} />
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Live Patient Journey Test
              <TestInfoTooltip {...TEST_INFO.liveFlow} />
            </DialogTitle>
            <DialogDescription>
              Simulates a real patient submitting the form and verifies the site can produce clinic matches safely.
            </DialogDescription>
          </DialogHeader>

          {isRunning ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Running live flow test...</p>
            </div>
          ) : testResults ? (
            <div className="space-y-4">
              {/* Overall Status */}
              <div className={`p-3 rounded-lg border ${getOverallStatusColor(testResults.overallStatus)}`}>
                <div className="flex items-center gap-2 font-medium">
                  {getStatusIcon(testResults.overallStatus)}
                  Overall: {testResults.overallStatus}
                </div>
              </div>

              {/* Individual Results with info icons */}
              <div className="space-y-2">
                {testResults.results.map((result, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                    <div className="mt-0.5">{getStatusIcon(result.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm">{result.name}</span>
                        <TestRowTooltip
                          explanation={
                            TEST_ROW_EXPLANATIONS[result.name] || "Verifies this aspect of the system works correctly."
                          }
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">{result.message}</div>
                      {result.details != null && (
                        <details className="mt-1">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Show details
                          </summary>
                          <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-x-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
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
                <p className="mt-1 text-muted-foreground">Contract: v1_locked</p>
              </details>

              {/* Re-run button */}
              <Button onClick={runTest} variant="outline" className="w-full bg-transparent">
                <Play className="h-4 w-4 mr-2" />
                Run Again
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
