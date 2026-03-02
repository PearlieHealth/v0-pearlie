"use client"

import { useEffect, useState } from "react"
import { AdminNav } from "@/components/admin/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResetDataButton } from "@/components/admin/reset-data-button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { AlertTriangle, Bell, BellOff, Mail, Clock } from "lucide-react"

interface ResponseTrackingSettings {
  clinicNudgeEnabled: boolean
  altClinicsEmailEnabled: boolean
  nudgeThresholdHours: number
  altClinicsThresholdHours: number
}

const DEFAULTS: ResponseTrackingSettings = {
  clinicNudgeEnabled: false,
  altClinicsEmailEnabled: false,
  nudgeThresholdHours: 2,
  altClinicsThresholdHours: 4,
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<ResponseTrackingSettings>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle")

  useEffect(() => {
    fetch("/api/admin/response-tracking-settings")
      .then(r => r.json())
      .then(data => { if (data.settings) setSettings(data.settings) })
      .catch(() => {})
  }, [])

  const saveSettings = async (newSettings: ResponseTrackingSettings) => {
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
    } catch {
      setSaveStatus("error")
      setTimeout(() => setSaveStatus("idle"), 3000)
    } finally {
      setSaving(false)
    }
  }

  const toggleSetting = (key: keyof ResponseTrackingSettings, value: boolean) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    saveSettings(updated)
  }

  return (
    <div className="min-h-screen bg-[#faf6f0]">
      <AdminNav />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-3xl">
        <h1 className="text-2xl font-bold text-[#004443] mb-8">Settings</h1>

        {/* ── Response Tracking Settings ──────────────────────────────── */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Response Tracking
                </CardTitle>
                <CardDescription className="mt-1">
                  Control automated email notifications for unanswered patient messages.
                  Response time tracking is always active.
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
          <CardContent className="space-y-4">
            {/* Clinic Nudge */}
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
                    <Label htmlFor="settings-nudge" className="text-sm font-medium cursor-pointer">
                      Clinic nudge emails
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Remind clinics when a patient is waiting for a reply
                    </p>
                  </div>
                  <Switch
                    id="settings-nudge"
                    checked={settings.clinicNudgeEnabled}
                    onCheckedChange={(checked) => toggleSetting("clinicNudgeEnabled", checked)}
                    disabled={saving}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="settings-nudge-hours" className="text-xs text-muted-foreground whitespace-nowrap">
                    Send after
                  </Label>
                  <Input
                    id="settings-nudge-hours"
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
                  <span className="text-xs text-muted-foreground">hours of no reply</span>
                </div>
              </div>
            </div>

            {/* Alt Clinics Email */}
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
                    <Label htmlFor="settings-alt" className="text-sm font-medium cursor-pointer">
                      Alternative clinics email
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Suggest other clinics to patients still waiting for a reply
                    </p>
                  </div>
                  <Switch
                    id="settings-alt"
                    checked={settings.altClinicsEmailEnabled}
                    onCheckedChange={(checked) => toggleSetting("altClinicsEmailEnabled", checked)}
                    disabled={saving}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="settings-alt-hours" className="text-xs text-muted-foreground whitespace-nowrap">
                    Send after
                  </Label>
                  <Input
                    id="settings-alt-hours"
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
                  <span className="text-xs text-muted-foreground">hours of no reply</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that affect all data in the system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Reset all transactional data</p>
                <p className="text-sm text-muted-foreground">
                  Permanently deletes leads, matches, bookings, analytics, and email logs.
                  Clinic profiles and configurations are preserved.
                </p>
              </div>
              <ResetDataButton />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
