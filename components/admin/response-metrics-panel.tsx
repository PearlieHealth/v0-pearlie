"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Clock, AlertTriangle, CheckCircle, TrendingUp, Users, Mail, Settings, Bell, BellOff } from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────

interface Settings {
  clinicNudgeEnabled: boolean
  altClinicsEmailEnabled: boolean
  nudgeThresholdHours: number
  altClinicsThresholdHours: number
}

interface Summary {
  totalClinicsTracked: number
  totalResponses: number
  totalUnanswered: number
  avgResponseRate: number
  platformAvgResponseMins: number | null
  currentlyWaiting: number
}

interface ClinicStat {
  clinicId: string
  clinicName: string
  avgResponseMins: number | null
  medianResponseMins: number | null
  p95ResponseMins: number | null
  totalResponses: number
  totalUnanswered: number
  responseRate: number
  lastComputed: string
}

interface UnansweredConvo {
  conversationId: string
  clinicId: string
  clinicName: string
  leadId: string
  patientName: string
  patientEmail: string
  treatment: string
  waitingSince: string
  waitingHours: number
  clinicNudgeSent: boolean
  clinicNudgeSentAt: string | null
  altEmailSent: boolean
  altEmailSentAt: string | null
}

interface RecentLog {
  id: string
  conversationId: string
  clinicId: string
  clinicName: string
  patientName: string
  patientMessageAt: string
  clinicRepliedAt: string | null
  responseTimeSecs: number | null
  responseTimeMins: number | null
  status: "replied" | "waiting"
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatResponseTime(mins: number | null): string {
  if (mins === null) return "—"
  if (mins < 1) return "<1 min"
  if (mins < 60) return `${Math.round(mins)} min`
  const hours = Math.floor(mins / 60)
  const remainMins = Math.round(mins % 60)
  if (hours < 24) return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remainHours = hours % 24
  return remainHours > 0 ? `${days}d ${remainHours}h` : `${days}d`
}

function formatWaitTime(hours: number): string {
  if (hours < 1) return "<1 hour"
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""}`
  const days = Math.floor(hours / 24)
  const remainHours = hours % 24
  return remainHours > 0 ? `${days}d ${remainHours}h` : `${days} day${days !== 1 ? "s" : ""}`
}

function responseRateColor(rate: number): string {
  if (rate >= 90) return "text-green-600"
  if (rate >= 70) return "text-yellow-600"
  return "text-red-600"
}

function responseRateBadge(rate: number): "default" | "secondary" | "destructive" {
  if (rate >= 90) return "default"
  if (rate >= 70) return "secondary"
  return "destructive"
}

// ── Component ────────────────────────────────────────────────────────────────

export function ResponseMetricsPanel() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<Settings>({
    clinicNudgeEnabled: false,
    altClinicsEmailEnabled: false,
    nudgeThresholdHours: 2,
    altClinicsThresholdHours: 4,
  })
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle")
  const [summary, setSummary] = useState<Summary | null>(null)
  const [clinicStats, setClinicStats] = useState<ClinicStat[]>([])
  const [unanswered, setUnanswered] = useState<UnansweredConvo[]>([])
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([])
  const [sortBy, setSortBy] = useState("avg_time")
  const [sortOrder, setSortOrder] = useState("asc")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ sort: sortBy, order: sortOrder })
      const res = await fetch(`/api/admin/response-metrics?${params}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      if (data.settings) setSettings(data.settings)
      setSummary(data.summary)
      setClinicStats(data.clinicStats || [])
      setUnanswered(data.unansweredConversations || [])
      setRecentLogs(data.recentLogs || [])
    } catch (err) {
      console.error("Failed to fetch response metrics:", err)
    } finally {
      setLoading(false)
    }
  }, [sortBy, sortOrder])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const saveSettings = async (newSettings: Settings) => {
    setSaving(true)
    setSaveStatus("idle")
    try {
      const res = await fetch("/api/admin/response-tracking-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: newSettings }),
      })
      if (!res.ok) throw new Error("Failed to save")
      const data = await res.json()
      if (data.settings) setSettings(data.settings)
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch (err) {
      console.error("Failed to save settings:", err)
      setSaveStatus("error")
      setTimeout(() => setSaveStatus("idle"), 3000)
    } finally {
      setSaving(false)
    }
  }

  const toggleSetting = (key: keyof Settings, value: boolean) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    saveSettings(updated)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-white rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Email Automation Controls ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Email Automation
              </CardTitle>
              <CardDescription className="mt-1">
                Control whether automated nudge and alternative-clinic emails are sent.
                Tracking always runs — only email sending is toggled.
              </CardDescription>
            </div>
            {saveStatus === "saved" && (
              <span className="text-xs text-green-600 font-medium">Saved</span>
            )}
            {saveStatus === "error" && (
              <span className="text-xs text-red-600 font-medium">Failed to save</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Clinic Nudge Toggle */}
            <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
              <div className="pt-0.5">
                {settings.clinicNudgeEnabled
                  ? <Bell className="w-5 h-5 text-amber-600" />
                  : <BellOff className="w-5 h-5 text-muted-foreground" />
                }
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="nudge-toggle" className="text-sm font-medium cursor-pointer">
                      Clinic nudge emails
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Remind clinics when a patient is waiting for their reply
                    </p>
                  </div>
                  <Switch
                    id="nudge-toggle"
                    checked={settings.clinicNudgeEnabled}
                    onCheckedChange={(checked) => toggleSetting("clinicNudgeEnabled", checked)}
                    disabled={saving}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="nudge-hours" className="text-xs text-muted-foreground whitespace-nowrap">
                    Send after
                  </Label>
                  <Input
                    id="nudge-hours"
                    type="number"
                    min={1}
                    max={48}
                    className="w-16 h-7 text-xs"
                    value={settings.nudgeThresholdHours}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      if (val >= 1 && val <= 48) {
                        setSettings(s => ({ ...s, nudgeThresholdHours: val }))
                      }
                    }}
                    onBlur={() => saveSettings(settings)}
                  />
                  <span className="text-xs text-muted-foreground">hours</span>
                </div>
              </div>
            </div>

            {/* Alt Clinics Email Toggle */}
            <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
              <div className="pt-0.5">
                {settings.altClinicsEmailEnabled
                  ? <Mail className="w-5 h-5 text-teal-600" />
                  : <BellOff className="w-5 h-5 text-muted-foreground" />
                }
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="alt-toggle" className="text-sm font-medium cursor-pointer">
                      Alternative clinics email
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Suggest other clinics to patients still waiting for a reply
                    </p>
                  </div>
                  <Switch
                    id="alt-toggle"
                    checked={settings.altClinicsEmailEnabled}
                    onCheckedChange={(checked) => toggleSetting("altClinicsEmailEnabled", checked)}
                    disabled={saving}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="alt-hours" className="text-xs text-muted-foreground whitespace-nowrap">
                    Send after
                  </Label>
                  <Input
                    id="alt-hours"
                    type="number"
                    min={1}
                    max={72}
                    className="w-16 h-7 text-xs"
                    value={settings.altClinicsThresholdHours}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      if (val >= 1 && val <= 72) {
                        setSettings(s => ({ ...s, altClinicsThresholdHours: val }))
                      }
                    }}
                    onBlur={() => saveSettings(settings)}
                  />
                  <span className="text-xs text-muted-foreground">hours</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary Cards ─────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Clock className="w-3.5 h-3.5" />
                Avg Response
              </div>
              <p className="text-2xl font-bold">
                {formatResponseTime(summary.platformAvgResponseMins)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                Response Rate
              </div>
              <p className={`text-2xl font-bold ${responseRateColor(summary.avgResponseRate)}`}>
                {summary.avgResponseRate}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Waiting Now
              </div>
              <p className={`text-2xl font-bold ${summary.currentlyWaiting > 0 ? "text-amber-600" : "text-green-600"}`}>
                {summary.currentlyWaiting}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Total Replies
              </div>
              <p className="text-2xl font-bold">{summary.totalResponses}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Mail className="w-3.5 h-3.5" />
                Unanswered
              </div>
              <p className={`text-2xl font-bold ${summary.totalUnanswered > 0 ? "text-red-600" : "text-green-600"}`}>
                {summary.totalUnanswered}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Users className="w-3.5 h-3.5" />
                Clinics Tracked
              </div>
              <p className="text-2xl font-bold">{summary.totalClinicsTracked}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Data Tabs ─────────────────────────────────────────────────── */}
      <Tabs defaultValue="unanswered">
        <TabsList>
          <TabsTrigger value="unanswered">
            Unanswered
            {unanswered.length > 0 && (
              <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full font-medium">
                {unanswered.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="clinics">Clinic Rankings</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        {/* ── Unanswered ──────────────────────────────────────────────── */}
        <TabsContent value="unanswered" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Patients Waiting for Replies</CardTitle>
              <CardDescription>
                Conversations where a patient messaged but the clinic hasn't responded yet.
                {!settings.clinicNudgeEnabled && !settings.altClinicsEmailEnabled && (
                  <span className="block mt-1 text-amber-600 font-medium">
                    Automated emails are currently OFF. Toggle them above to start sending.
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unanswered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-70" />
                  <p className="text-sm">All patients have been responded to!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Clinic</TableHead>
                        <TableHead>Treatment</TableHead>
                        <TableHead className="text-right">Waiting</TableHead>
                        <TableHead>Clinic Nudge</TableHead>
                        <TableHead>Alt Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unanswered.map(convo => (
                        <TableRow key={convo.conversationId} className={convo.waitingHours >= 4 ? "bg-red-50/50" : convo.waitingHours >= 2 ? "bg-amber-50/50" : ""}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{convo.patientName}</p>
                              <p className="text-xs text-muted-foreground">{convo.patientEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{convo.clinicName}</TableCell>
                          <TableCell className="text-sm">{convo.treatment || "—"}</TableCell>
                          <TableCell className="text-right">
                            <span className={`text-sm font-medium ${convo.waitingHours >= 4 ? "text-red-600" : convo.waitingHours >= 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                              {formatWaitTime(convo.waitingHours)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {convo.clinicNudgeSent ? (
                              <Badge variant="secondary" className="text-xs">
                                Sent {convo.clinicNudgeSentAt
                                  ? new Date(convo.clinicNudgeSentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                                  : ""}
                              </Badge>
                            ) : !settings.clinicNudgeEnabled ? (
                              <span className="text-xs text-muted-foreground">Off</span>
                            ) : convo.waitingHours >= settings.nudgeThresholdHours ? (
                              <span className="text-xs text-amber-600 font-medium">Due</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {formatWaitTime(settings.nudgeThresholdHours - convo.waitingHours)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {convo.altEmailSent ? (
                              <Badge variant="secondary" className="text-xs">
                                Sent {convo.altEmailSentAt
                                  ? new Date(convo.altEmailSentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                                  : ""}
                              </Badge>
                            ) : !settings.altClinicsEmailEnabled ? (
                              <span className="text-xs text-muted-foreground">Off</span>
                            ) : convo.waitingHours >= settings.altClinicsThresholdHours ? (
                              <span className="text-xs text-amber-600 font-medium">Due</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {formatWaitTime(settings.altClinicsThresholdHours - convo.waitingHours)}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Clinic Rankings ─────────────────────────────────────────── */}
        <TabsContent value="clinics" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Clinic Response Performance</CardTitle>
                  <CardDescription>Aggregated response metrics per clinic, recomputed every cron cycle.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="avg_time">Avg Response Time</SelectItem>
                      <SelectItem value="response_rate">Response Rate</SelectItem>
                      <SelectItem value="unanswered">Unanswered Count</SelectItem>
                      <SelectItem value="total">Total Responses</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger className="w-[100px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {clinicStats.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No response data yet. Stats populate as patients message clinics.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Clinic</TableHead>
                        <TableHead className="text-right">Avg Time</TableHead>
                        <TableHead className="text-right">Median</TableHead>
                        <TableHead className="text-right">P95</TableHead>
                        <TableHead className="text-right">Replies</TableHead>
                        <TableHead className="text-right">Unanswered</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clinicStats.map(stat => (
                        <TableRow key={stat.clinicId}>
                          <TableCell className="font-medium">{stat.clinicName}</TableCell>
                          <TableCell className="text-right">{formatResponseTime(stat.avgResponseMins)}</TableCell>
                          <TableCell className="text-right">{formatResponseTime(stat.medianResponseMins)}</TableCell>
                          <TableCell className="text-right">{formatResponseTime(stat.p95ResponseMins)}</TableCell>
                          <TableCell className="text-right">{stat.totalResponses}</TableCell>
                          <TableCell className="text-right">
                            {stat.totalUnanswered > 0 ? (
                              <span className="text-red-600 font-medium">{stat.totalUnanswered}</span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={responseRateBadge(stat.responseRate)}>
                              {stat.responseRate}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Recent Activity ─────────────────────────────────────────── */}
        <TabsContent value="recent" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Response Activity</CardTitle>
              <CardDescription>Individual patient-message to clinic-reply tracking log.</CardDescription>
            </CardHeader>
            <CardContent>
              {recentLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No response activity recorded yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Clinic</TableHead>
                        <TableHead>Sent At</TableHead>
                        <TableHead>Replied At</TableHead>
                        <TableHead className="text-right">Response Time</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentLogs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium text-sm">{log.patientName}</TableCell>
                          <TableCell className="text-sm">{log.clinicName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(log.patientMessageAt).toLocaleString("en-GB", {
                              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.clinicRepliedAt
                              ? new Date(log.clinicRepliedAt).toLocaleString("en-GB", {
                                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                                })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatResponseTime(log.responseTimeMins)}
                          </TableCell>
                          <TableCell>
                            {log.status === "replied" ? (
                              <Badge variant="default" className="text-xs">Replied</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">Waiting</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
