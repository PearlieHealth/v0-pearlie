"use client"

import React from "react"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow, format, differenceInHours, differenceInMinutes } from "date-fns"
import {
  Search,
  Clock,
  MessageSquare,
  CalendarCheck,
  Eye,
  ChevronRight,
  Inbox,
  History,
  CalendarDays,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  created_at: string
  raw_answers: Record<string, unknown>
  status?: {
    id: string
    status: string
    note: string | null
    updated_at: string
  }
  booking?: {
    id: string
    appointment_datetime: string
    booking_method: string
    expected_value_gbp: number | null
  }
  conversation?: {
    id: string
    last_message_at: string
    unread_by_clinic: boolean
  }
}

const TREATMENT_LABELS: Record<string, string> = {
  dental_implants: "Dental Implants",
  composite_bonding: "Composite Bonding",
  invisalign: "Invisalign",
  veneers: "Veneers",
  teeth_whitening: "Teeth Whitening",
  crowns_bridges: "Crowns & Bridges",
  general_checkup: "General Checkup",
  emergency: "Emergency",
  root_canal: "Root Canal",
  dentures: "Dentures",
}

function getElapsedLabel(dateStr: string) {
  const mins = differenceInMinutes(new Date(), new Date(dateStr))
  const hours = differenceInHours(new Date(), new Date(dateStr))
  if (mins < 60) return `${mins}m`
  if (hours < 24) return `${hours}h ${mins % 60}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

function getElapsedColor(dateStr: string) {
  const hours = differenceInHours(new Date(), new Date(dateStr))
  if (hours < 2) return "text-green-600"
  if (hours < 6) return "text-yellow-600"
  if (hours < 24) return "text-orange-600"
  return "text-red-600"
}

type Tab = "todos" | "upcoming" | "history"

export default function AppointmentsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<Tab>("todos")
  const [isLoading, setIsLoading] = useState(true)
  const [clinicId, setClinicId] = useState<string | null>(null)
  const router = useRouter()

  const fetchData = useCallback(async () => {
    const supabase = createBrowserClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return

    // Get clinic ID
    let cId: string | null = null

    const { data: portalUser } = await supabase
      .from("clinic_portal_users")
      .select("clinic_ids")
      .eq("email", session.user.email)
      .single()

    if (portalUser?.clinic_ids?.[0]) {
      cId = portalUser.clinic_ids[0]
    } else {
      const { data: clinicUser } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single()
      cId = clinicUser?.clinic_id || null
    }

    if (!cId) {
      setIsLoading(false)
      return
    }
    setClinicId(cId)

    // Fetch match results
    const { data: matchResults } = await supabase
      .from("match_results")
      .select(
        `
        lead_id,
        created_at,
        leads(id, first_name, last_name, email, phone, created_at, raw_answers)
      `
      )
      .eq("clinic_id", cId)
      .order("created_at", { ascending: false })

    if (!matchResults) {
      setIsLoading(false)
      return
    }

    const leadIds = matchResults.map((mr) => mr.lead_id)
    if (leadIds.length === 0) {
      setIsLoading(false)
      return
    }

    // Fetch statuses, bookings, and conversations in parallel
    const [{ data: statuses }, { data: bookings }, { data: conversations }] =
      await Promise.all([
        supabase
          .from("lead_clinic_status")
          .select("*")
          .eq("clinic_id", cId)
          .in("lead_id", leadIds),
        supabase
          .from("bookings")
          .select("*")
          .eq("clinic_id", cId)
          .in("lead_id", leadIds),
        supabase
          .from("conversations")
          .select("id, lead_id, last_message_at, unread_by_clinic")
          .eq("clinic_id", cId)
          .in("lead_id", leadIds),
      ])

    const statusMap = new Map(statuses?.map((s) => [s.lead_id, s]) || [])
    const bookingMap = new Map(bookings?.map((b) => [b.lead_id, b]) || [])
    const convMap = new Map(conversations?.map((c) => [c.lead_id, c]) || [])

    const leadsData = matchResults
      .filter((mr) => mr.leads)
      .map((mr) => ({
        ...(mr.leads as unknown as Lead),
        status: statusMap.get(mr.lead_id),
        booking: bookingMap.get(mr.lead_id),
        conversation: convMap.get(mr.lead_id),
      }))

    setLeads(leadsData)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Filter by search
  const filteredLeads = leads.filter((l) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      l.first_name?.toLowerCase().includes(q) ||
      l.last_name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.phone?.toLowerCase().includes(q)
    )
  })

  // Categorize leads
  const newRequests = filteredLeads.filter((l) => {
    const s = l.status?.status || "NEW"
    return s === "NEW"
  })

  const needsScheduling = filteredLeads.filter((l) => {
    const s = l.status?.status
    return s === "CONTACTED" || s === "IN_PROGRESS"
  })

  const needsConfirming = filteredLeads.filter((l) => {
    const s = l.status?.status
    return s === "BOOKED_PENDING" || (s === "BOOKED_CONFIRMED" && l.booking)
  })

  const upcoming = filteredLeads.filter((l) => {
    if (!l.booking) return false
    return new Date(l.booking.appointment_datetime) > new Date()
  })

  const history = filteredLeads.filter((l) => {
    const s = l.status?.status
    return (
      s === "CLOSED" ||
      s === "NOT_SUITABLE" ||
      s === "NO_RESPONSE" ||
      (l.booking && new Date(l.booking.appointment_datetime) <= new Date())
    )
  })

  const todoCount = newRequests.length + needsScheduling.length + needsConfirming.length

  const tabs = [
    { key: "todos" as Tab, label: "To Do's", count: todoCount, icon: Inbox },
    { key: "upcoming" as Tab, label: "Upcoming", count: upcoming.length, icon: CalendarDays },
    { key: "history" as Tab, label: "History", count: history.length, icon: History },
  ]

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
        <p className="text-muted-foreground">
          Manage patient requests, schedule appointments, and track progress
        </p>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.key
                  ? "border-[#7C3AED] text-[#7C3AED]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    activeTab === tab.key
                      ? "bg-[#F5F0FF] text-[#7C3AED]"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "todos" && (
        <div className="space-y-8">
          {/* New Requests */}
          <LeadSection
            title="NEW REQUESTS"
            count={newRequests.length}
            leads={newRequests}
            actionLabel="Respond"
            actionIcon={<MessageSquare className="w-4 h-4" />}
            actionColor="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
            onAction={(lead) => router.push(`/clinic/appointments/${lead.id}`)}
            onView={(lead) => router.push(`/clinic/appointments/${lead.id}`)}
            showElapsed
          />

          {/* Needs Scheduling */}
          <LeadSection
            title="NEEDS SCHEDULING"
            count={needsScheduling.length}
            leads={needsScheduling}
            actionLabel="Schedule"
            actionIcon={<CalendarCheck className="w-4 h-4" />}
            actionColor="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
            onAction={(lead) => router.push(`/clinic/appointments/${lead.id}`)}
            onView={(lead) => router.push(`/clinic/appointments/${lead.id}`)}
            showElapsed
          />

          {/* Needs Confirming */}
          <LeadSection
            title="NEEDS CONFIRMING"
            count={needsConfirming.length}
            leads={needsConfirming}
            actionLabel="Confirm"
            actionIcon={<CalendarCheck className="w-4 h-4" />}
            actionColor="bg-green-600 hover:bg-green-700 text-white"
            onAction={(lead) => router.push(`/clinic/appointments/${lead.id}`)}
            onView={(lead) => router.push(`/clinic/appointments/${lead.id}`)}
            showDate
          />

          {todoCount === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Inbox className="w-12 h-12 mb-3 text-muted-foreground/40" />
                <p className="text-lg font-medium mb-1">All caught up</p>
                <p className="text-sm">No pending items right now</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "upcoming" && (
        <div className="space-y-3">
          {upcoming.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CalendarDays className="w-12 h-12 mb-3 text-muted-foreground/40" />
                <p className="text-lg font-medium mb-1">No upcoming appointments</p>
                <p className="text-sm">
                  Confirmed appointments will show here
                </p>
              </CardContent>
            </Card>
          ) : (
            upcoming.map((lead) => (
              <Card
                key={lead.id}
                className="hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => router.push(`/clinic/appointments/${lead.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <CalendarCheck className="w-5 h-5 text-green-700" />
                      </div>
                      <div>
                        <p className="font-semibold">
                          {lead.first_name} {lead.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {getTreatmentLabel(lead.raw_answers?.treatment as string)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {lead.booking
                            ? format(new Date(lead.booking.appointment_datetime), "EEE, d MMM yyyy")
                            : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {lead.booking
                            ? format(new Date(lead.booking.appointment_datetime), "h:mm a")
                            : ""}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <History className="w-12 h-12 mb-3 text-muted-foreground/40" />
                <p className="text-lg font-medium mb-1">No history yet</p>
                <p className="text-sm">
                  Past appointments and closed leads will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            history.map((lead) => {
              const status = lead.status?.status || "CLOSED"
              return (
                <Card
                  key={lead.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer opacity-80"
                  onClick={() => router.push(`/clinic/appointments/${lead.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <History className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold">
                            {lead.first_name} {lead.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {getTreatmentLabel(lead.raw_answers?.treatment as string)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="text-xs">
                          {status.replace(/_/g, " ")}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          {lead.booking
                            ? format(new Date(lead.booking.appointment_datetime), "d MMM yyyy")
                            : formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                        </p>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// Helper
function getTreatmentLabel(treatment: string | undefined) {
  if (!treatment) return "Dental Treatment"
  return TREATMENT_LABELS[treatment] || treatment.replace(/_/g, " ")
}

// Reusable section component for To Do's tab
function LeadSection({
  title,
  count,
  leads,
  actionLabel,
  actionIcon,
  actionColor,
  onAction,
  onView,
  showElapsed = false,
  showDate = false,
}: {
  title: string
  count: number
  leads: Lead[]
  actionLabel: string
  actionIcon: React.ReactNode
  actionColor: string
  onAction: (lead: Lead) => void
  onView: (lead: Lead) => void
  showElapsed?: boolean
  showDate?: boolean
}) {
  if (count === 0) return null

  return (
    <div>
      <h3 className="text-xs font-bold tracking-wider text-muted-foreground mb-3 uppercase">
        {title} ({count})
      </h3>
      <Card>
        <CardContent className="p-0 divide-y">
          {leads.map((lead) => {
            const treatment = getTreatmentLabel(lead.raw_answers?.treatment as string)
            const hasUnread = lead.conversation?.unread_by_clinic

            return (
              <div
                key={lead.id}
                className={cn(
                  "flex items-center justify-between p-4 hover:bg-muted/30 transition-colors",
                  hasUnread && "bg-[#F5F0FF]/50"
                )}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">
                        {lead.first_name} {lead.last_name}
                      </p>
                      {hasUnread && (
                        <span className="w-2 h-2 rounded-full bg-[#7C3AED] flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{treatment}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {showElapsed && (
                    <div className="flex items-center gap-1.5 min-w-[80px]">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span
                        className={cn(
                          "text-sm font-medium",
                          getElapsedColor(lead.created_at)
                        )}
                      >
                        {getElapsedLabel(lead.created_at)}
                      </span>
                    </div>
                  )}

                  {showDate && lead.booking && (
                    <div className="text-right min-w-[140px]">
                      <p className="text-sm text-muted-foreground">
                        Scheduled for
                      </p>
                      <p className="text-sm font-medium">
                        {format(
                          new Date(lead.booking.appointment_datetime),
                          "d MMM yyyy, h:mma"
                        )}
                      </p>
                    </div>
                  )}

                  <Button
                    size="sm"
                    className={cn("gap-1.5", actionColor)}
                    onClick={(e) => {
                      e.stopPropagation()
                      onAction(lead)
                    }}
                  >
                    {actionIcon}
                    {actionLabel}
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-8 h-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      onView(lead)
                    }}
                  >
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
