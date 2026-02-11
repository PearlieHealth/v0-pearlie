"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface QAStatus {
  lastSelfTestAt: string | null
  selfTestPassed: boolean | null
  lastLiveFlowTestAt: string | null
  liveFlowTestPassed: boolean | null
}

export function QAStatusBanner() {
  const [status, setStatus] = useState<QAStatus>({
    lastSelfTestAt: null,
    selfTestPassed: null,
    lastLiveFlowTestAt: null,
    liveFlowTestPassed: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load from localStorage on mount
    const loadStatus = () => {
      const saved = localStorage.getItem("pearlie_qa_status")
      if (saved) {
        try {
          setStatus(JSON.parse(saved))
        } catch {
          // Ignore invalid JSON
        }
      }
      setLoading(false)
    }

    loadStatus()

    const handleStatusUpdate = () => loadStatus()
    window.addEventListener("qa-status-updated", handleStatusUpdate)
    return () => window.removeEventListener("qa-status-updated", handleStatusUpdate)
  }, [])

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return "Never"
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const getOverallStatus = () => {
    if (status.selfTestPassed === null || status.liveFlowTestPassed === null) {
      return "unknown"
    }
    if (status.selfTestPassed && status.liveFlowTestPassed) {
      return "pass"
    }
    return "fail"
  }

  const overallStatus = getOverallStatus()

  if (loading) {
    return null
  }

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 mb-6",
        overallStatus === "pass" && "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
        overallStatus === "fail" && "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
        overallStatus === "unknown" && "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800",
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          {overallStatus === "pass" && <CheckCircle2 className="w-5 h-5 text-green-600" />}
          {overallStatus === "fail" && <XCircle className="w-5 h-5 text-red-600" />}
          {overallStatus === "unknown" && <AlertTriangle className="w-5 h-5 text-amber-600" />}

          <div>
            <p className="font-medium text-sm">
              {overallStatus === "pass" && "Quality Checks: All passing"}
              {overallStatus === "fail" && "Quality Checks: Review needed"}
              {overallStatus === "unknown" && "Quality Checks"}
            </p>
            <p className="text-xs text-muted-foreground mb-1.5">
              Run these before demos or launches to confirm matching + analytics are healthy.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                {status.selfTestPassed === null ? (
                  <span className="w-2 h-2 rounded-full bg-gray-300" />
                ) : status.selfTestPassed ? (
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                )}
                System Health: {formatTime(status.lastSelfTestAt)}
                {status.selfTestPassed !== null && (
                  <span className={status.selfTestPassed ? "text-green-600" : "text-red-600"}>
                    ({status.selfTestPassed ? "Pass" : "Fail"})
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1.5">
                {status.liveFlowTestPassed === null ? (
                  <span className="w-2 h-2 rounded-full bg-gray-300" />
                ) : status.liveFlowTestPassed ? (
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                )}
                Patient Journey: {formatTime(status.lastLiveFlowTestAt)}
                {status.liveFlowTestPassed !== null && (
                  <span className={status.liveFlowTestPassed ? "text-green-600" : "text-red-600"}>
                    ({status.liveFlowTestPassed ? "Pass" : "Fail"})
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Trigger a refresh by dispatching custom event
            window.dispatchEvent(new CustomEvent("run-qa-tests"))
          }}
          className="shrink-0"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Re-run Tests
        </Button>
      </div>
    </div>
  )
}

// Helper to update QA status from test buttons
export function updateQAStatus(update: Partial<QAStatus>) {
  const saved = localStorage.getItem("pearlie_qa_status")
  let current: QAStatus = {
    lastSelfTestAt: null,
    selfTestPassed: null,
    lastLiveFlowTestAt: null,
    liveFlowTestPassed: null,
  }
  if (saved) {
    try {
      current = JSON.parse(saved)
    } catch {
      // Ignore
    }
  }
  const updated = { ...current, ...update }
  localStorage.setItem("pearlie_qa_status", JSON.stringify(updated))
  // Dispatch event for banner to refresh
  window.dispatchEvent(new CustomEvent("qa-status-updated"))
}
