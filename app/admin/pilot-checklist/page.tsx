"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AdminNav } from "@/components/admin/admin-nav"
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, ExternalLink } from "lucide-react"
import Link from "next/link"

interface ChecklistItem {
  id: string
  name: string
  description: string
  status: "pass" | "fail" | "warn" | "pending"
  details?: string
  link?: string
  linkText?: string
}

export default function PilotChecklistPage() {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchChecklist = async () => {
    setRefreshing(true)
    try {
      const response = await fetch("/api/admin/pilot-checklist")
      const data = await response.json()
      setItems(data.items || [])
    } catch (error) {
      console.error("Failed to fetch pilot checklist:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchChecklist()
  }, [])

  const passCount = items.filter((i) => i.status === "pass").length
  const failCount = items.filter((i) => i.status === "fail").length
  const warnCount = items.filter((i) => i.status === "warn").length
  const totalCount = items.length

  const overallStatus =
    failCount > 0
      ? "NOT READY"
      : warnCount > 0
        ? "NEEDS ATTENTION"
        : passCount === totalCount
          ? "PILOT READY"
          : "CHECKING..."

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "fail":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "warn":
        return <AlertCircle className="h-5 w-5 text-amber-600" />
      default:
        return <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pass":
        return <Badge className="bg-green-100 text-green-800">PASS</Badge>
      case "fail":
        return <Badge className="bg-red-100 text-red-800">FAIL</Badge>
      case "warn":
        return <Badge className="bg-amber-100 text-amber-800">WARN</Badge>
      default:
        return <Badge variant="secondary">CHECKING</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <AdminNav />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Pilot Readiness Checklist</h1>
              <p className="text-muted-foreground mt-1">
                All items must pass before launching the pilot with real clinics and patients.
              </p>
            </div>
            <Button onClick={fetchChecklist} disabled={refreshing} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overall Status Card */}
        <Card
          className={`mb-8 ${
            overallStatus === "PILOT READY"
              ? "border-green-200 bg-green-50"
              : overallStatus === "NOT READY"
                ? "border-red-200 bg-red-50"
                : "border-amber-200 bg-amber-50"
          }`}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overall Status</p>
                <p
                  className={`text-2xl font-bold ${
                    overallStatus === "PILOT READY"
                      ? "text-green-800"
                      : overallStatus === "NOT READY"
                        ? "text-red-800"
                        : "text-amber-800"
                  }`}
                >
                  {overallStatus}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {passCount} / {totalCount} checks passed
                </p>
                {failCount > 0 && <p className="text-sm text-red-600">{failCount} critical issues</p>}
                {warnCount > 0 && <p className="text-sm text-amber-600">{warnCount} warnings</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checklist Items */}
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">Running pilot readiness checks...</p>
              </CardContent>
            </Card>
          ) : (
            items.map((item) => (
              <Card key={item.id} className={item.status === "fail" ? "border-red-200" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5">{getStatusIcon(item.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{item.name}</h3>
                        {getStatusBadge(item.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      {item.details && (
                        <p className="text-sm mt-2 text-foreground bg-muted/50 rounded px-2 py-1">{item.details}</p>
                      )}
                      {item.link && (
                        <Link
                          href={item.link}
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-2"
                        >
                          {item.linkText || "View"} <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
