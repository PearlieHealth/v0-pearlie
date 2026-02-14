"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { ClinicSidebar } from "./clinic-sidebar"
import { ClinicMobileNav } from "./clinic-mobile-nav"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface ClinicData {
  id: string
  name: string
}

interface UserData {
  role: "CLINIC_USER" | "CLINIC_ADMIN" | "CORPORATE_ADMIN"
  clinicIds: string[]
}

interface ClinicShellProps {
  children: React.ReactNode
}

export function ClinicShell({ children }: ClinicShellProps) {
  const [clinic, setClinic] = useState<ClinicData | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [newLeadsCount, setNewLeadsCount] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [debugError, setDebugError] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  const fetchData = async () => {
    // Known dashboard and auth path segments -- everything else under /clinic/[x] is a public profile
    const DASHBOARD_SEGMENTS = [
      "login", "demo", "accept-invite", "forgot-password", "reset-password",
      "profile", "leads", "inbox", "appointments", "bookings",
      "insights", "settings", "team", "providers"
    ]
    const pathSegment = pathname?.split("/")[2] // e.g. "/clinic/leads" -> "leads"
    const isDashboardPage = !pathSegment || DASHBOARD_SEGMENTS.includes(pathSegment)
    const publicPageCheck = pathname?.startsWith("/clinic/") && !isDashboardPage
    
    if (publicPageCheck) {
      setIsLoading(false)
      return
    }

    // Use server-side API to verify authentication and get clinic data
    // This avoids RLS issues with client-side queries
    try {
      // Get session from browser client and pass token explicitly
      const supabaseAuth = createBrowserClient()
      
      // Try getSession first, fall back to getUser for fresh token
      let accessToken: string | null = null
      const { data: { session } } = await supabaseAuth.auth.getSession()
      
      if (session) {
        accessToken = session.access_token
      } else {
        const { data: { user } } = await supabaseAuth.auth.getUser()
        if (user) {
          // Re-fetch session after getUser refreshes it
          const { data: { session: refreshedSession } } = await supabaseAuth.auth.getSession()
          accessToken = refreshedSession?.access_token || null
        }
      }
      
      if (!accessToken) {
        setDebugError("No access token found — session missing")
        setIsLoading(false)
        return
      }

      const response = await fetch("/api/clinic/me", {
        headers: { "Authorization": `Bearer ${accessToken}` },
      })

      if (!response.ok) {
        const errBody = await response.text()
        setDebugError(`API ${response.status}: ${errBody}`)
        setIsLoading(false)
        return
      }

      const data = await response.json()

      if (!data.clinic) {
        setDebugError("API returned OK but no clinic data: " + JSON.stringify(data))
        setIsLoading(false)
        return
      }

      setClinic({
        id: data.clinic.id,
        name: data.clinic.name
      })
      setUserData({
        role: data.user.role === "clinic_admin" ? "CLINIC_ADMIN" : 
              data.user.role === "corporate_admin" ? "CORPORATE_ADMIN" : "CLINIC_USER",
        clinicIds: [data.clinic.id],
      })

      // Get new leads count using the Supabase client
      const supabase = createBrowserClient()
      const { count } = await supabase
        .from("lead_clinic_status")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", data.clinic.id)
        .eq("status", "NEW")

      setNewLeadsCount(count || 0)
    } catch (error) {
      console.error("Auth check failed:", error)
      setDebugError(`Exception: ${error instanceof Error ? error.message : String(error)}`)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Check public pages FIRST - must be before any loading state to prevent flicker/redirect race
  // Uses the same dashboard whitelist logic: anything under /clinic/[x] that isn't a known dashboard segment is public
  const DASHBOARD_SEGMENTS_RENDER = [
    "login", "demo", "accept-invite", "forgot-password", "reset-password",
    "profile", "leads", "inbox", "appointments", "bookings",
    "insights", "settings", "team", "providers"
  ]
  const renderSegment = pathname?.split("/")[2]
  const isPublicPage = pathname?.startsWith("/clinic/") && !!renderSegment && !DASHBOARD_SEGMENTS_RENDER.includes(renderSegment)
  
  // For public pages, render children immediately without any auth check or loading
  if (isPublicPage) {
    return <>{children}</>
  }

  // Only show loading for non-public pages
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!clinic || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Unable to load clinic data</p>
          {debugError && (
            <p className="text-xs text-red-500 max-w-md mx-auto break-all">{debugError}</p>
          )}
          <Button onClick={async () => {
            const supabase = createBrowserClient()
            await supabase.auth.signOut()
            window.location.href = "/clinic/login"
          }}>
            Return to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <ClinicSidebar
          clinicName={clinic.name}
          clinicId={clinic.id}
          userRole={userData.role}
          newLeadsCount={newLeadsCount}
        />
      </div>

      {/* Mobile Header + Content */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-border bg-card">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <ClinicSidebar
                clinicName={clinic.name}
                clinicId={clinic.id}
                userRole={userData.role}
                newLeadsCount={newLeadsCount}
              />
            </SheetContent>
          </Sheet>
          <span className="font-semibold">{clinic.name}</span>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto min-h-0">
          {children}
        </main>
      </div>
    </div>
  )
}
