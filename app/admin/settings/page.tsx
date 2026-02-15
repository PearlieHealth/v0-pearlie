"use client"

import { AdminNav } from "@/components/admin/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResetDataButton } from "@/components/admin/reset-data-button"
import { AlertTriangle } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <AdminNav />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-3xl">
        <h1 className="text-2xl font-bold text-[#1a2332] mb-8">Settings</h1>

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
