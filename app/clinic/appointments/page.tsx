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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDistanceToNow, format, differenceInHours, subDays, isAfter } from "date-fns"
import {
  Search,
  Clock,
  MessageSquare,
  CalendarCheck,
  ChevronRight,
  Inbox,
  History,
  CalendarDays,
  Filter,
  X,
  Download,
  UserPlus,
  Reply,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { clinicHref } from "@/lib/clinic-url"

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  created_at: string
  source?: string
  raw_answers: Record<string, unknown>
  booking_status?: string | null
  booking_date?: string | null
  booking_time?: string | null
  booking_clinic_id?: string | null
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
    unread_count_clinic?: number
    clinic_first_reply_at: string | null
    latest_message?: string | null
    latest_message_sender?: string | null
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

function getTimeAgo(dateStr: string) {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

function getUrgencyColor(dateStr: string) {
  const hours = differenceInHours(new Date(), new Date(dateStr))
  if (hours < 1) return "bg-green-500"
  if (hours < 4) return "bg-yellow-500"
  if (hours < 12) return "bg-orange-500"
  return "bg-red-500"
}

type Tab = "conversations" | "scheduled" | "attendance"

// Determine conversation priority category
type ConversationCategory = "needs_reply" | "waiting_for_patient" | "new_lead"

function getConversationCategory(lead: Lead): ConversationCategory {
  const status = (lead.status?.status || "NEW").toUpperCase()
  const hasConversation = !!lead.conversation
  const hasClinicReplied = !!lead.conversation?.clinic_first_reply_at
  const lastSender = lead.conversation?.latest_message_sender

  // Brand new lead, no conversation or status is NEW and clinic hasn't replied
  if (status === "NEW" && !hasClinicReplied) {
    return "new_lead"
  }

  // Has a conversation where last message is from patient/bot — clinic needs to reply
  if (hasConversation && (lastSender === "patient" || lastSender === "bot") && !hasClinicReplied) {
    return "needs_reply"
  }
  if (hasConversation && lastSender === "patient") {
    return "needs_reply"
  }

  // Clinic has replied, waiting for patient
  return "waiting_for_patient"
}

// Get the most relevant timestamp for sorting (most recent activity first)
function getSortTimestamp(lead: Lead): number {
  const times: number[] = []
  if (lead.conversation?.last_message_at) {
    times.push(new Date(lead.conversation.last_message_at).getTime())
  }
  if (lead.status?.updated_at) {
    times.push(new Date(lead.status.updated_at).getTime())
  }
  times.push(new Date(lead.created_at).getTime())
  return Math.max(...times)
}

export default function AppointmentsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<Tab>("conversations")
  const [isLoading, setIsLoading] = useState(true)
  const [clinicId, setClinicId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const router = useRouter()

  // Advanced filters
  const [filterTreatment, setFilterTreatment] = useState<string>("all")
  const [filterDateRange, setFilterDateRange] = useState<string>("all")
  const [filterSource, setFilterSource] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)

  const fetchData = useCallback(async () => {
    const supabase = createBrowserClient()

    const profileRes = await fetch("/api/clinic/profile")
    if (!profileRes.ok) {
      setIsLoading(false)
      return
    }
    const { clinic } = await profileRes.json()
    const cId = clinic?.id as string | null

    if (!cId) {
      setIsLoading(false)
      return
    }
    setClinicId(cId)

    const [{ data: matchResults }, { data: allConversations }] = await Promise.all([
      supabase
        .from("match_results")
        .select(
          `
          lead_id,
          created_at,
          leads(id, first_name, last_name, email, phone, created_at, raw_answers, source, booking_status, booking_date, booking_time, booking_clinic_id)
        `
        )
        .eq("clinic_id", cId)
        .order("created_at", { ascending: false }),
      supabase
        .from("conversations")
        .select("id, lead_id, last_message_at, unread_by_clinic, unread_count_clinic, clinic_first_reply_at")
        .eq("clinic_id", cId),
    ])

    if (!matchResults && !allConversations?.length) {
      setIsLoading(false)
      return
    }

    const matchLeadIds = new Set((matchResults || []).map((mr) => mr.lead_id))

    const conversationOnlyLeadIds = (allConversations || [])
      .map((c) => c.lead_id)
      .filter((id) => !matchLeadIds.has(id))

    let conversationOnlyLeads: any[] = []
    if (conversationOnlyLeadIds.length > 0) {
      const { data: extraLeads } = await supabase
        .from("leads")
        .select("id, first_name, last_name, email, phone, created_at, raw_answers, source, booking_status, booking_date, booking_time, booking_clinic_id")
        .in("id", conversationOnlyLeadIds)
      conversationOnlyLeads = extraLeads || []
    }

    const allLeadIds = [
      ...(matchResults || []).map((mr) => mr.lead_id),
      ...conversationOnlyLeadIds,
    ]

    if (allLeadIds.length === 0) {
      setIsLoading(false)
      return
    }

    const [{ data: statuses }, { data: bookings }] = await Promise.all([
      supabase
        .from("lead_clinic_status")
        .select("*")
        .eq("clinic_id", cId)
        .in("lead_id", allLeadIds),
      supabase
        .from("bookings")
        .select("*")
        .eq("clinic_id", cId)
        .in("lead_id", allLeadIds),
    ])

    const statusMap = new Map(statuses?.map((s) => [s.lead_id, s]) || [])
    const bookingMap = new Map(bookings?.map((b) => [b.lead_id, b]) || [])

    // Fetch latest message per conversation for previews
    const convIds = (allConversations || []).map((c) => c.id)
    const latestMessageMap = new Map<string, { content: string; sender_type: string }>()
    if (convIds.length > 0) {
      const { data: recentMessages } = await supabase
        .from("messages")
        .select("conversation_id, content, sender_type, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false })

      for (const msg of recentMessages || []) {
        if (!latestMessageMap.has(msg.conversation_id)) {
          latestMessageMap.set(msg.conversation_id, {
            content: (msg.content || "").substring(0, 100),
            sender_type: msg.sender_type,
          })
        }
      }
    }

    const convMap = new Map(
      (allConversations || []).map((c) => {
        const latestMsg = latestMessageMap.get(c.id)
        return [c.lead_id, {
          ...c,
          latest_message: latestMsg?.content || null,
          latest_message_sender: latestMsg?.sender_type || null,
        }]
      })
    )

    const matchLeads = (matchResults || [])
      .filter((mr) => mr.leads)
      .map((mr) => ({
        ...(mr.leads as unknown as Lead),
        status: statusMap.get(mr.lead_id),
        booking: bookingMap.get(mr.lead_id),
        conversation: convMap.get(mr.lead_id),
      }))

    const extraLeads = conversationOnlyLeads.map((lead) => ({
      ...lead,
      source: lead.source || "conversation",
      status: statusMap.get(lead.id),
      booking: bookingMap.get(lead.id),
      conversation: convMap.get(lead.id),
    }))

    setLeads([...matchLeads, ...extraLeads])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Mark attendance directly from the list
  const handleMarkAttended = async (leadId: string) => {
    if (!clinicId) return
    setIsUpdating(leadId)
    try {
      const res = await fetch("/api/clinic/leads/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: [leadId],
          clinicId,
          status: "ATTENDED",
        }),
      })
      if (res.ok) {
        await fetchData()
      }
    } catch (err) {
      console.error("Failed to mark attended:", err)
    } finally {
      setIsUpdating(null)
    }
  }

  // Get unique treatments for filter dropdown
  const uniqueTreatments = Array.from(
    new Set(leads.map((l) => l.raw_answers?.treatment as string).filter(Boolean))
  )

  const hasActiveFilters = filterTreatment !== "all" || filterDateRange !== "all" || filterSource !== "all"
  const activeFilterCount = [filterTreatment !== "all", filterDateRange !== "all", filterSource !== "all"].filter(Boolean).length

  // Filter leads
  const filteredLeads = leads.filter((l) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        l.first_name?.toLowerCase().includes(q) ||
        l.last_name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q) ||
        getTreatmentLabel(l.raw_answers).toLowerCase().includes(q)
      if (!matchesSearch) return false
    }

    if (filterTreatment !== "all") {
      const treatment = l.raw_answers?.treatment as string
      if (treatment !== filterTreatment) return false
    }

    if (filterDateRange !== "all") {
      const leadDate = new Date(l.created_at)
      const now = new Date()
      if (filterDateRange === "today" && !isAfter(leadDate, subDays(now, 1))) return false
      if (filterDateRange === "week" && !isAfter(leadDate, subDays(now, 7))) return false
      if (filterDateRange === "month" && !isAfter(leadDate, subDays(now, 30))) return false
    }

    if (filterSource !== "all") {
      if ((l.source || "match") !== filterSource) return false
    }

    return true
  })

  // Helper: check if a lead is a confirmed/scheduled appointment
  const isScheduledLead = (l: Lead) => {
    const s = (l.status?.status || "NEW").toUpperCase()
    // Check bookings table: future booking with BOOKED_PENDING or BOOKED_CONFIRMED
    if (l.booking && new Date(l.booking.appointment_datetime) > new Date() &&
        (s === "BOOKED_PENDING" || s === "BOOKED_CONFIRMED")) return true
    // Also check lead-level booking_status: when clinic confirms, booking_status = "confirmed"
    // and it sends an automated message — this should count as scheduled
    if (l.booking_status === "confirmed" && l.booking_clinic_id === clinicId) {
      // Has a future booking date
      if (l.booking_date) {
        const bookingDateTime = l.booking_time
          ? new Date(`${l.booking_date}T${l.booking_time}:00`)
          : new Date(`${l.booking_date}T09:00:00`)
        if (bookingDateTime > new Date()) return true
      }
      // Or has a future bookings-table entry
      if (l.booking && new Date(l.booking.appointment_datetime) > new Date()) return true
    }
    return false
  }

  // === CONVERSATIONS TAB: Two-column sorted by most recent activity ===
  // Active conversations: not ATTENDED, CLOSED, NOT_SUITABLE, NO_RESPONSE
  // And doesn't have a future scheduled booking
  const conversationLeads = filteredLeads
    .filter((l) => {
      const s = (l.status?.status || "NEW").toUpperCase()
      // Exclude terminal statuses
      if (s === "ATTENDED" || s === "CLOSED" || s === "NOT_SUITABLE" || s === "NO_RESPONSE") return false
      // Exclude scheduled appointments (those appear in "scheduled" tab)
      if (isScheduledLead(l)) return false
      return true
    })
    .sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a)) // Most recent first

  // Split conversation leads into categories for grouping
  const needsReplyLeads = conversationLeads.filter((l) => getConversationCategory(l) === "needs_reply")
  const newLeadsList = conversationLeads.filter((l) => getConversationCategory(l) === "new_lead")
  const waitingLeads = conversationLeads.filter((l) => getConversationCategory(l) === "waiting_for_patient")

  // === SCHEDULED TAB ===
  const scheduled = filteredLeads
    .filter((l) => {
      const s = (l.status?.status || "NEW").toUpperCase()
      // Exclude terminal statuses
      if (s === "ATTENDED" || s === "CLOSED" || s === "NOT_SUITABLE" || s === "NO_RESPONSE") return false
      return isScheduledLead(l)
    })
    .sort((a, b) => {
      const dateA = a.booking ? new Date(a.booking.appointment_datetime).getTime()
        : a.booking_date ? new Date(`${a.booking_date}T${a.booking_time || "09:00"}:00`).getTime()
        : 0
      const dateB = b.booking ? new Date(b.booking.appointment_datetime).getTime()
        : b.booking_date ? new Date(`${b.booking_date}T${b.booking_time || "09:00"}:00`).getTime()
        : 0
      return dateA - dateB
    })

  // === ATTENDANCE TAB ===
  const pendingAttendance = filteredLeads
    .filter((l) => {
      const s = (l.status?.status || "NEW").toUpperCase()
      if (s === "ATTENDED" || s === "CLOSED" || s === "NOT_SUITABLE" || s === "NO_RESPONSE") return false
      if (l.booking && new Date(l.booking.appointment_datetime) <= new Date()) return true
      if (s === "BOOKED_PENDING" && !l.booking) return true
      return false
    })
    .sort((a, b) => {
      const dateA = a.booking ? new Date(a.booking.appointment_datetime).getTime() : new Date(a.created_at).getTime()
      const dateB = b.booking ? new Date(b.booking.appointment_datetime).getTime() : new Date(b.created_at).getTime()
      return dateA - dateB
    })

  const confirmedAttendance = filteredLeads
    .filter((l) => {
      const s = l.status?.status?.toUpperCase()
      return s === "ATTENDED" || s === "CLOSED" || s === "NOT_SUITABLE" || s === "NO_RESPONSE"
    })
    .sort((a, b) => {
      const dateA = a.status?.updated_at ? new Date(a.status.updated_at).getTime() : new Date(a.created_at).getTime()
      const dateB = b.status?.updated_at ? new Date(b.status.updated_at).getTime() : new Date(b.created_at).getTime()
      return dateB - dateA
    })

  const attendanceCount = pendingAttendance.length + confirmedAttendance.length
  const conversationCount = needsReplyLeads.length + newLeadsList.length + waitingLeads.length

  const tabs = [
    {
      key: "conversations" as Tab,
      label: "Conversations",
      count: conversationCount,
      icon: MessageSquare,
      urgentCount: needsReplyLeads.length + newLeadsList.length,
    },
    { key: "scheduled" as Tab, label: "Scheduled", count: scheduled.length, icon: CalendarDays, urgentCount: 0 },
    { key: "attendance" as Tab, label: "Attendance", count: attendanceCount, icon: CalendarCheck, urgentCount: pendingAttendance.length },
  ]

  const clearFilters = () => {
    setFilterTreatment("all")
    setFilterDateRange("all")
    setFilterSource("all")
  }

  const exportCSV = () => {
    if (filteredLeads.length === 0) return

    const escapeCSV = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return val
    }

    const headers = ["Name", "Email", "Phone", "Treatment", "Status", "Source", "Date", "Appointment"]
    const rows = filteredLeads.map((l) => [
      escapeCSV(`${l.first_name || ""} ${l.last_name || ""}`.trim()),
      escapeCSV(l.email || ""),
      escapeCSV(l.phone || ""),
      escapeCSV(getTreatmentLabel(l.raw_answers)),
      escapeCSV((l.status?.status || "NEW").replace(/_/g, " ")),
      escapeCSV(l.source || "match"),
      escapeCSV(l.created_at ? format(new Date(l.created_at), "yyyy-MM-dd") : ""),
      escapeCSV(l.booking ? format(new Date(l.booking.appointment_datetime), "yyyy-MM-dd HH:mm") : ""),
    ])

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `leads-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">
            Patient requests, messages, scheduling, and progress
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCSV}
          disabled={filteredLeads.length === 0}
          className="gap-1.5 bg-transparent"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Tabs + Search + Filter Toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.key
                  ? "border-[#0fbcb0] text-[#0fbcb0]"
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
                      ? "bg-[#faf3e6] text-[#0fbcb0]"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              )}
              {tab.urgentCount > 0 && activeTab !== tab.key && (
                <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn("gap-1.5", showFilters ? "bg-[#0fbcb0] hover:bg-[#0da399] text-white" : "bg-transparent")}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Advanced Filters Bar */}
      {showFilters && (
        <div className="flex items-center gap-3 flex-wrap bg-muted/50 rounded-lg p-3 border">
          <Select value={filterTreatment} onValueChange={setFilterTreatment}>
            <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
              <SelectValue placeholder="Treatment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All treatments</SelectItem>
              {uniqueTreatments.map((t) => (
                <SelectItem key={t} value={t}>
                  {TREATMENT_LABELS[t] || t.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterDateRange} onValueChange={setFilterDateRange}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-background">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Past 7 days</SelectItem>
              <SelectItem value="month">Past 30 days</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-[150px] h-8 text-xs bg-background">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="match">From matching</SelectItem>
              <SelectItem value="direct_profile">Direct enquiry</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1 text-muted-foreground">
              <X className="w-3 h-3" />
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* ─── CONVERSATIONS TAB (Two-column layout) ─── */}
      {activeTab === "conversations" && (
        <div className="space-y-6">
          {conversationCount === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Inbox className="w-12 h-12 mb-3 text-muted-foreground/40" />
                <p className="text-lg font-medium mb-1">No active conversations</p>
                <p className="text-sm">New patient leads and messages will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Top row: New Leads (left) | Needs Reply (right) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left column: New leads */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <UserPlus className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-bold tracking-wider text-blue-600 uppercase">
                      New leads ({newLeadsList.length})
                    </h3>
                  </div>
                  {newLeadsList.length === 0 ? (
                    <Card className="border-blue-100">
                      <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <UserPlus className="w-10 h-10 mb-2 text-muted-foreground/40" />
                        <p className="text-sm">No new leads</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-blue-100">
                      <CardContent className="p-0 divide-y">
                        {newLeadsList.map((lead) => (
                          <ConversationRow
                            key={lead.id}
                            lead={lead}
                            category="new_lead"
                            onClick={() => router.push(clinicHref(`/clinic/appointments/${lead.id}`))}
                          />
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right column: Needs reply */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <h3 className="text-xs font-bold tracking-wider text-red-600 uppercase">
                      Needs your reply ({needsReplyLeads.length})
                    </h3>
                  </div>
                  {needsReplyLeads.length === 0 ? (
                    <Card className="border-red-100">
                      <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Reply className="w-10 h-10 mb-2 text-muted-foreground/40" />
                        <p className="text-sm">All caught up</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-red-100">
                      <CardContent className="p-0 divide-y">
                        {needsReplyLeads.map((lead) => (
                          <ConversationRow
                            key={lead.id}
                            lead={lead}
                            category="needs_reply"
                            onClick={() => router.push(clinicHref(`/clinic/appointments/${lead.id}`))}
                          />
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Bottom row: Waiting for patient (full width) */}
              {waitingLeads.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                      Waiting for patient ({waitingLeads.length})
                    </h3>
                  </div>
                  <Card>
                    <CardContent className="p-0 divide-y">
                      {waitingLeads.map((lead) => (
                        <ConversationRow
                          key={lead.id}
                          lead={lead}
                          category="waiting_for_patient"
                          onClick={() => router.push(clinicHref(`/clinic/appointments/${lead.id}`))}
                        />
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── SCHEDULED TAB ─── */}
      {activeTab === "scheduled" && (
        <div className="space-y-3">
          {scheduled.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CalendarDays className="w-12 h-12 mb-3 text-muted-foreground/40" />
                <p className="text-lg font-medium mb-1">No scheduled appointments</p>
                <p className="text-sm">Confirmed appointments will show here</p>
              </CardContent>
            </Card>
          ) : (
            scheduled.map((lead) => {
              const isConfirmed = lead.status?.status?.toUpperCase() === "BOOKED_CONFIRMED" ||
                lead.booking_status === "confirmed"
              const appointmentDate = lead.booking
                ? new Date(lead.booking.appointment_datetime)
                : lead.booking_date
                  ? new Date(`${lead.booking_date}T${lead.booking_time || "09:00"}:00`)
                  : null
              return (
              <Card
                key={lead.id}
                className="hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => router.push(clinicHref(`/clinic/appointments/${lead.id}`))}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <CalendarCheck className="w-5 h-5 text-green-700" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">
                            {lead.first_name} {lead.last_name}
                          </p>
                          {lead.conversation?.unread_by_clinic && (
                            <span className="w-2 h-2 rounded-full bg-[#0fbcb0] flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getTreatmentLabel(lead.raw_answers)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          isConfirmed
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        )}
                      >
                        {isConfirmed ? "Confirmed" : "Pending"}
                      </Badge>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {appointmentDate
                            ? format(appointmentDate, "EEE, d MMM yyyy")
                            : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {appointmentDate
                            ? format(appointmentDate, "h:mm a")
                            : ""}
                        </p>
                      </div>
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

      {/* ─── ATTENDANCE TAB ─── */}
      {activeTab === "attendance" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: Pending attendance confirmation */}
          <div>
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Confirmation ({pendingAttendance.length})
            </h3>
            {pendingAttendance.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CalendarCheck className="w-10 h-10 mb-2 text-muted-foreground/40" />
                  <p className="text-sm">No appointments pending confirmation</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {pendingAttendance.map((lead) => (
                  <Card
                    key={lead.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer border-amber-200"
                    onClick={() => router.push(clinicHref(`/clinic/appointments/${lead.id}`))}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-amber-700" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">
                              {lead.first_name} {lead.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getTreatmentLabel(lead.raw_answers)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            {lead.booking && (
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(lead.booking.appointment_datetime), "d MMM yyyy")}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                            disabled={isUpdating === lead.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkAttended(lead.id)
                            }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {isUpdating === lead.id ? "Saving..." : "Confirm attended"}
                          </Button>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Right column: Confirmed attendance / closed */}
          <div>
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-3 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4" />
              Confirmed / Closed ({confirmedAttendance.length})
            </h3>
            {confirmedAttendance.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <History className="w-10 h-10 mb-2 text-muted-foreground/40" />
                  <p className="text-sm">No confirmed attendance yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {confirmedAttendance.map((lead) => {
                  const status = (lead.status?.status || "CLOSED").toUpperCase()
                  return (
                    <Card
                      key={lead.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer opacity-90"
                      onClick={() => router.push(clinicHref(`/clinic/appointments/${lead.id}`))}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-9 h-9 rounded-full flex items-center justify-center",
                              status === "ATTENDED" ? "bg-green-100" : "bg-muted"
                            )}>
                              {status === "ATTENDED" ? (
                                <CalendarCheck className="w-4 h-4 text-green-700" />
                              ) : (
                                <History className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">
                                {lead.first_name} {lead.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {getTreatmentLabel(lead.raw_answers)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs",
                                status === "ATTENDED" && "bg-green-100 text-green-700",
                                status === "NOT_SUITABLE" && "bg-red-50 text-red-600",
                                status === "NO_RESPONSE" && "bg-gray-100 text-gray-600",
                              )}
                            >
                              {status === "ATTENDED" ? "Attended" : status.replace(/_/g, " ")}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {lead.booking
                                ? format(new Date(lead.booking.appointment_datetime), "d MMM")
                                : lead.status?.updated_at
                                  ? formatDistanceToNow(new Date(lead.status.updated_at), { addSuffix: true })
                                  : ""}
                            </p>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper: extract treatment label from raw_answers, checking both new and legacy fields
function getTreatmentLabel(rawAnswers: Record<string, unknown> | undefined | null) {
  if (!rawAnswers) return "General Enquiry"
  // Newer form versions use treatments_selected (array)
  const treatmentsSelected = rawAnswers.treatments_selected as string[] | undefined
  if (treatmentsSelected?.length) {
    return treatmentsSelected.join(", ")
  }
  // Legacy form versions use treatment (string slug)
  const treatment = rawAnswers.treatment as string | undefined
  if (treatment) {
    return TREATMENT_LABELS[treatment] || treatment.replace(/_/g, " ")
  }
  return "General Enquiry"
}

// ─── WhatsApp-style conversation row ───
function ConversationRow({
  lead,
  category,
  onClick,
}: {
  lead: Lead
  category: ConversationCategory
  onClick: () => void
}) {
  const treatment = getTreatmentLabel(lead.raw_answers)
  const hasUnread = lead.conversation?.unread_by_clinic
  const unreadCount = lead.conversation?.unread_count_clinic || 0
  const latestMessage = lead.conversation?.latest_message
  const latestSender = lead.conversation?.latest_message_sender
  const source = lead.source || "match"

  // Determine the most relevant time to show
  const displayTime = lead.conversation?.last_message_at
    ? getTimeAgo(lead.conversation.last_message_at)
    : getTimeAgo(lead.created_at)

  // For the urgency indicator dot color
  const urgencyDate = lead.conversation?.last_message_at || lead.created_at

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors cursor-pointer",
        category === "needs_reply" && "bg-red-50/50",
        category === "new_lead" && "bg-blue-50/30",
      )}
      onClick={onClick}
    >
      {/* Avatar / Status indicator */}
      <div className="relative flex-shrink-0">
        <div className={cn(
          "w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold",
          category === "needs_reply" && "bg-red-100 text-red-700",
          category === "new_lead" && "bg-blue-100 text-blue-700",
          category === "waiting_for_patient" && "bg-gray-100 text-gray-600",
        )}>
          {lead.first_name?.[0]?.toUpperCase() || "?"}{lead.last_name?.[0]?.toUpperCase() || ""}
        </div>
        {/* Urgency dot */}
        {(category === "needs_reply" || category === "new_lead") && (
          <div className={cn(
            "absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white",
            getUrgencyColor(urgencyDate)
          )} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <p className={cn(
              "font-semibold text-sm truncate",
              hasUnread && "text-foreground",
              !hasUnread && category === "waiting_for_patient" && "text-muted-foreground"
            )}>
              {lead.first_name} {lead.last_name}
            </p>
            {source === "direct_profile" && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                Direct
              </Badge>
            )}
          </div>
          <span className={cn(
            "text-xs flex-shrink-0 ml-2",
            category === "needs_reply" ? "text-red-600 font-medium" : "text-muted-foreground"
          )}>
            {displayTime}
          </span>
        </div>

        {/* Treatment badge + message preview line */}
        <div className="flex items-center gap-2 mb-1">
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] px-1.5 py-0 flex-shrink-0",
              category === "new_lead" && "bg-blue-50 text-blue-700 border-blue-200"
            )}
          >
            {treatment}
          </Badge>
          {category === "new_lead" && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-200 flex-shrink-0">
              New lead
            </Badge>
          )}
        </div>

        {/* Message preview */}
        <div className="flex items-center gap-1.5">
          {latestSender === "clinic" && (
            <Reply className="w-3 h-3 text-muted-foreground flex-shrink-0 rotate-180" />
          )}
          <p className={cn(
            "text-xs truncate",
            hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
          )}>
            {latestMessage
              ? latestMessage
              : category === "new_lead"
                ? "New patient enquiry - no messages yet"
                : "No messages yet"
            }
          </p>
        </div>
      </div>

      {/* Right side: unread badge + action hint */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {unreadCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-[#0fbcb0] text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        {category === "needs_reply" && !unreadCount && (
          <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5">
            Reply needed
          </Badge>
        )}
        {category === "waiting_for_patient" && (
          <span className="text-[10px] text-muted-foreground">Waiting</span>
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  )
}
