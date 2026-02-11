"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Webhook, Mail, Bell, Shield, Copy, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

export default function DemoSettingsPage() {
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)
  const [settings, setSettings] = useState({
    webhookUrl: "https://smiledental.co.uk/api/pearlie-webhook",
    webhookSecret: "whsec_demo1234567890abcdef",
    emailForwarding: "leads@smiledental.co.uk",
    manualConfirmation: true,
    emailNotifications: true,
    smsNotifications: false,
    newLeadAlerts: true,
    dailyDigest: true,
    weeklyReport: true,
  })

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      {/* Demo Banner */}
      <div className="bg-blue-600 text-white px-4 py-2 text-center text-sm">
        <span className="font-medium">Demo Mode</span> - Changes will not be saved
        <Link href="/admin/clinic-users" className="ml-4 underline hover:no-underline">
          Back to Admin
        </Link>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/clinic/demo">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Configure your clinic portal</p>
          </div>
        </div>

        <Tabs defaultValue="integrations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          {/* Integrations */}
          <TabsContent value="integrations">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="w-5 h-5" />
                    Webhook Configuration
                  </CardTitle>
                  <CardDescription>
                    Receive real-time notifications when new leads come in
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="webhookUrl">Webhook URL</Label>
                    <Input
                      id="webhookUrl"
                      value={settings.webhookUrl}
                      className="mt-1 font-mono text-sm"
                      readOnly
                    />
                  </div>
                  <div>
                    <Label htmlFor="webhookSecret">Webhook Secret</Label>
                    <div className="flex gap-2 mt-1">
                      <div className="relative flex-1">
                        <Input
                          id="webhookSecret"
                          type={showWebhookSecret ? "text" : "password"}
                          value={settings.webhookSecret}
                          className="font-mono text-sm pr-10"
                          readOnly
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0"
                          onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                        >
                          {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                      <Button variant="outline" size="icon">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <Button>Test Webhook</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email Forwarding
                  </CardTitle>
                  <CardDescription>
                    Forward lead notifications to this email address
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="emailForwarding">Forwarding Address</Label>
                    <Input
                      id="emailForwarding"
                      type="email"
                      value={settings.emailForwarding}
                      className="mt-1"
                      readOnly
                    />
                  </div>
                  <Button>Update Email</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose how you want to be notified about new leads
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch checked={settings.emailNotifications} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
                  </div>
                  <Switch checked={settings.smsNotifications} />
                </div>

                <hr />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">New Lead Alerts</p>
                    <p className="text-sm text-muted-foreground">Get notified instantly for new leads</p>
                  </div>
                  <Switch checked={settings.newLeadAlerts} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Daily Digest</p>
                    <p className="text-sm text-muted-foreground">Summary of daily lead activity</p>
                  </div>
                  <Switch checked={settings.dailyDigest} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Weekly Report</p>
                    <p className="text-sm text-muted-foreground">Weekly performance summary</p>
                  </div>
                  <Switch checked={settings.weeklyReport} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Booking Preferences
                </CardTitle>
                <CardDescription>
                  Configure how bookings are confirmed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Manual Confirmation</p>
                    <p className="text-sm text-muted-foreground">
                      Allow staff to manually confirm bookings in the portal
                    </p>
                  </div>
                  <Switch checked={settings.manualConfirmation} />
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> Enable webhook integration for automatic booking confirmations
                    from your practice management system.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
