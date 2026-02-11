"use client"

import { useEffect, useState, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Webhook,
  Mail,
  Bell,
  Shield,
  Copy,
  RefreshCw,
  Save,
  Eye,
  EyeOff,
} from "lucide-react"
import { toast } from "sonner"

interface ClinicSettings {
  id: string
  booking_webhook_url: string | null
  booking_webhook_secret: string | null
  manual_confirmation_allowed: boolean
  email_forwarding_address: string | null
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<ClinicSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showSecret, setShowSecret] = useState(false)

  const fetchSettings = useCallback(async () => {
    const supabase = createBrowserClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Get clinic ID
    let clinicId: string | null = null

    const { data: portalUser } = await supabase
      .from("clinic_portal_users")
      .select("clinic_ids")
      .eq("email", session.user.email)
      .single()

    if (portalUser?.clinic_ids?.[0]) {
      clinicId = portalUser.clinic_ids[0]
    } else {
      const { data: clinicUser } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single()

      clinicId = clinicUser?.clinic_id || null
    }

    if (!clinicId) {
      setIsLoading(false)
      return
    }

    const { data: clinic } = await supabase
      .from("clinics")
      .select("id, booking_webhook_url, booking_webhook_secret, manual_confirmation_allowed, email_forwarding_address")
      .eq("id", clinicId)
      .single()

    if (clinic) {
      setSettings({
        id: clinic.id,
        booking_webhook_url: clinic.booking_webhook_url,
        booking_webhook_secret: clinic.booking_webhook_secret,
        manual_confirmation_allowed: clinic.manual_confirmation_allowed ?? true,
        email_forwarding_address: clinic.email_forwarding_address,
      })
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async () => {
    if (!settings) return

    setIsSaving(true)
    const supabase = createBrowserClient()

    const { error } = await supabase
      .from("clinics")
      .update({
        booking_webhook_url: settings.booking_webhook_url,
        booking_webhook_secret: settings.booking_webhook_secret,
        manual_confirmation_allowed: settings.manual_confirmation_allowed,
        email_forwarding_address: settings.email_forwarding_address,
      })
      .eq("id", settings.id)

    setIsSaving(false)

    if (error) {
      toast.error("Failed to save settings")
    } else {
      toast.success("Settings saved successfully")
    }
  }

  const generateWebhookSecret = () => {
    const secret = `whsec_${crypto.randomUUID().replace(/-/g, "")}`
    setSettings(s => s ? { ...s, booking_webhook_secret: secret } : null)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">No settings found.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure integrations and notification preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="booking">Booking Confirmation</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Booking Webhook
              </CardTitle>
              <CardDescription>
                Receive real-time booking confirmations from your practice management system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook_url">Webhook URL</Label>
                <Input
                  id="webhook_url"
                  placeholder="https://your-pms.com/webhook/pearlie"
                  value={settings.booking_webhook_url || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, booking_webhook_url: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Pearlie will send booking confirmations to this URL
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook_secret">Webhook Secret</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="webhook_secret"
                      type={showSecret ? "text" : "password"}
                      value={settings.booking_webhook_secret || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, booking_webhook_secret: e.target.value })
                      }
                      className="pr-20"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setShowSecret(!showSecret)}
                      >
                        {showSecret ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                      {settings.booking_webhook_secret && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(settings.booking_webhook_secret!)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" onClick={generateWebhookSecret}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use this secret to verify webhook requests are from Pearlie
                </p>
              </div>

              <div className="rounded-lg border p-4 bg-muted/50">
                <p className="text-sm font-medium mb-2">Webhook Payload Example</p>
                <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
{`{
  "event": "booking.confirmed",
  "lead_id": "uuid",
  "patient_name": "John Doe",
  "appointment_datetime": "2025-01-20T10:00:00Z",
  "treatment": "Dental Implants",
  "signature": "sha256=..."
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Forwarding
              </CardTitle>
              <CardDescription>
                Forward booking confirmation emails for automatic parsing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email_forwarding">Forwarding Address</Label>
                <Input
                  id="email_forwarding"
                  type="email"
                  placeholder="bookings@your-clinic.com"
                  value={settings.email_forwarding_address || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, email_forwarding_address: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Forward confirmation emails from your PMS to this address
                </p>
              </div>

              <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950/20">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                  Your unique inbox
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-white dark:bg-background px-2 py-1 rounded flex-1">
                    {settings.id}@inbox.pearlie.org
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(`${settings.id}@inbox.pearlie.org`)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
                  Forward booking confirmations here for automatic lead status updates
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to be notified about new leads and updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">New Lead Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when a new patient is matched to your clinic
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Daily Summary</p>
                  <p className="text-sm text-muted-foreground">
                    Receive a daily email with lead activity summary
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Weekly Report</p>
                  <p className="text-sm text-muted-foreground">
                    Receive a weekly performance report
                  </p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Inactive Lead Reminders</p>
                  <p className="text-sm text-muted-foreground">
                    Get reminded about leads that haven't been contacted
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="booking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Booking Confirmation Methods
              </CardTitle>
              <CardDescription>
                Configure how booking confirmations are recorded
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Manual Confirmation</p>
                  <p className="text-sm text-muted-foreground">
                    Allow staff to manually mark leads as booked
                  </p>
                </div>
                <Switch
                  checked={settings.manual_confirmation_allowed}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, manual_confirmation_allowed: checked })
                  }
                />
              </div>

              <div className="rounded-lg border p-4">
                <p className="font-medium mb-3">Active Confirmation Methods</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Webhook className="h-3 w-3" />
                    Webhook
                    {settings.booking_webhook_url ? (
                      <span className="ml-1 w-2 h-2 rounded-full bg-green-500" />
                    ) : (
                      <span className="ml-1 w-2 h-2 rounded-full bg-gray-300" />
                    )}
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <Mail className="h-3 w-3" />
                    Email Parsing
                    {settings.email_forwarding_address ? (
                      <span className="ml-1 w-2 h-2 rounded-full bg-green-500" />
                    ) : (
                      <span className="ml-1 w-2 h-2 rounded-full bg-gray-300" />
                    )}
                  </Badge>
                  {settings.manual_confirmation_allowed && (
                    <Badge variant="secondary" className="gap-1">
                      Manual
                      <span className="ml-1 w-2 h-2 rounded-full bg-green-500" />
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
