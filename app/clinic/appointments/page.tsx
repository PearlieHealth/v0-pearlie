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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDistanceToNow, format, differenceInHours, differenceInMinutes, subDays, isAfter } from "date-fns"
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
  Filter,
  X,
  Globe,
  CheckSquare,
  Download,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  created_at: string
  source?: string
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

type Tab = "new" | "awaiting" | "scheduled" | "attendance"

export default function AppointmentsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<Tab>("new")
  const [isLoading, setIsLoading] = useState(true)
  const [clinicId, setClinicId] = useState<string | null>(null)
  const router = useRouter()

  // Advanced filters
  const [filterTreatment, setFilterTreatment] = useState<string>("all")
  const [filterDateRange, setFilterDateRange] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterSource, setFilterSource] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)

  // Bulk selection
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)
  const [bulkAction, setBulkAction] = useState<string>("")

  const fetchData = useCallback(async () => {
    const supabase = createBrowserClient()

    // Use server-side API to get clinic ID (consistent with clinic-shell)
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

    // Fetch match results - include source from leads
    // Fetch match results and ALL conversations for this clinic in parallel
    const [{ data: matchResults }, { data: allConversations }] = await Promise.all([
      supabase
        .from("match_results")
        .select(
          `
          lead_id,
          created_at,
          leads(id, first_name, last_name, email, phone, created_at, raw_answers, source)
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

    // Build set of lead_ids from match_results
    const matchLeadIds = new Set((matchResults || []).map((mr) => mr.lead_id))

    // Find conversation-only leads (have conversations but no match_results)
    const conversationOnlyLeadIds = (allConversations || [])
      .map((c) => c.lead_id)
      .filter((id) => !matchLeadIds.has(id))

    // Fetch missing leads that only have conversations (no match_results)
    let conversationOnlyLeads: any[] = []
    if (conversationOnlyLeadIds.length > 0) {
      const { data: extraLeads } = await supabase
        .from("leads")
        .select("id, first_name, last_name, email, phone, created_at, raw_answers, source")
        .in("id", conversationOnlyLeadIds)
      conversationOnlyLeads = extraLeads || []
    }

    // Combine all lead IDs for status/booking lookups
    const allLeadIds = [
      ...(matchResults || []).map((mr) => mr.lead_id),
      ...conversationOnlyLeadIds,
    ]

    if (allLeadIds.length === 0) {
      setIsLoading(false)
      return
    }

    // Fetch statuses and bookings for all leads
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

    // Build leads from match_results
    const matchLeads = (matchResults || [])
      .filter((mr) => mr.leads)
      .map((mr) => ({
        ...(mr.leads as unknown as Lead),
        status: statusMap.get(mr.lead_id),
        booking: bookingMap.get(mr.lead_id),
        conversation: convMap.get(mr.lead_id),
      }))

    // Add conversation-only leads (patients who messaged but have no match_results)
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

  // Get unique treatments for filter dropdown
  const uniqueTreatments = Array.from(
    new Set(leads.map((l) => l.raw_answers?.treatment as string).filter(Boolean))
  )

  // Check if any filters are active
  const hasActiveFilters = filterTreatment !== "all" || filterDateRange !== "all" || filterStatus !== "all" || filterSource !== "all"
  const activeFilterCount = [filterTreatment !== "all", filterDateRange !== "all", filterStatus !== "all", filterSource !== "all"].filter(Boolean).length

  // Filter leads
  const filteredLeads = leads.filter((l) => {
    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        l.first_name?.toLowerCase().includes(q) ||
        l.last_name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q)
      if (!matchesSearch) return false
    }

    // Treatment filter
    if (filterTreatment !== "all") {
      const treatment = l.raw_answers?.treatment as string
      if (treatment !== filterTreatment) return false
    }

    // Date range filter
    if (filterDateRange !== "all") {
      const leadDate = new Date(l.created_at)
      const now = new Date()
      if (filterDateRange === "today" && !isAfter(leadDate, subDays(now, 1))) return false
      if (filterDateRange === "week" && !isAfter(leadDate, subDays(now, 7))) return false
      if (filterDateRange === "month" && !isAfter(leadDate, subDays(now, 30))) return false
    }

    // Status filter
    if (filterStatus !== "all") {
      const status = (l.status?.status || "NEW").toUpperCase()
      if (status !== filterStatus) return false
    }

    // Source filter
    if (filterSource !== "all") {
      if ((l.source || "match") !== filterSource) return false
    }

    return true
  })

  // Categorize leads (normalize status to uppercase for consistent comparison)
  // Sort each section by oldest first (most urgent at top)
  const newRequests = filteredLeads
    .filter((l) => {
      const s = (l.status?.status || "NEW").toUpperCase()
      return s === "NEW"
    })
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const awaitingResponse = filteredLeads
    .filter((l) => {
      const s = l.status?.status?.toUpperCase()
      return s === "CONTACTED" || s === "IN_PROGRESS"
    })
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const scheduled = filteredLeads
    .filter((l) => {
      const s = l.status?.status?.toUpperCase()
      if (!l.booking) return false
      const isFuture = new Date(l.booking.appointment_datetime) > new Date()
      return isFuture && (s === "BOOKED_PENDING" || s === "BOOKED_CONFIRMED")
    })
    .sort((a, b) => new Date(a.booking!.appointment_datetime).getTime() - new Date(b.booking!.appointment_datetime).getTime())

  // Attendance confirmation: two groups
  // Left — booked but not yet confirmed as attended (past appointments still pending)
  const pendingAttendance = filteredLeads
    .filter((l) => {
      const s = l.status?.status?.toUpperCase()
      if (s === "ATTENDED" || s === "CLOSED" || s === "NOT_SUITABLE" || s === "NO_RESPONSE") return false
      // Has a booking in the past but not yet marked attended
      if (l.booking && new Date(l.booking.appointment_datetime) <= new Date()) return true
      // Booked pending with no date yet
      if (s === "BOOKED_PENDING" && !l.booking) return true
      return false
    })
    .sort((a, b) => {
      const dateA = a.booking ? new Date(a.booking.appointment_datetime).getTime() : new Date(a.created_at).getTime()
      const dateB = b.booking ? new Date(b.booking.appointment_datetime).getTime() : new Date(b.created_at).getTime()
      return dateA - dateB
    })

  // Right — confirmed attendance / closed
  const confirmedAttendance = filteredLeads
    .filter((l) => {
      const s = l.status?.status?.toUpperCase()
      return s === "ATTENDED" || s === "CLOSED" || s === "NOT_SUITABLE" || s === "NO_RESPONSE"
    })
    .sort((a, b) => {
      const dateA = a.status?.updated_at ? new Date(a.status.updated_at).getTime() : new Date(a.created_at).getTime()
      const dateB = b.status?.updated_at ? new Date(b.status.updated_at).getTime() : new Date(b.created_at).getTime()
      return dateB - dateA // Most recent first
    })

  const attendanceCount = pendingAttendance.length + confirmedAttendance.length

  const tabs = [
    { key: "new" as Tab, label: "New Requests", count: newRequests.length, icon: Inbox },
    { key: "awaiting" as Tab, label: "Awaiting Response", count: awaitingResponse.length, icon: MessageSquare },
    { key: "scheduled" as Tab, label: "Scheduled", count: scheduled.length, icon: CalendarDays },
    { key: "attendance" as Tab, label: "Attendance", count: attendanceCount, icon: CalendarCheck },
  ]

  // Bulk actions
  const toggleSelect = (leadId: string) => {
    setSelectedLeads((prev) => {
      const next = new Set(prev)
      if (next.has(leadId)) next.delete(leadId)
      else next.add(leadId)
      return next
    })
  }

  const selectAll = (leadIds: string[]) => {
    setSelectedLeads((prev) => {
      const next = new Set(prev)
      const allSelected = leadIds.every((id) => next.has(id))
      if (allSelected) {
        leadIds.forEach((id) => next.delete(id))
      } else {
        leadIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (!clinicId || selectedLeads.size === 0) return
    setIsBulkUpdating(true)
    try {
      const res = await fetch("/api/clinic/leads/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: Array.from(selectedLeads),
          clinicId,
          status: newStatus,
        }),
      })
      if (res.ok) {
        setSelectedLeads(new Set())
        setBulkAction("")
        await fetchData()
      }
    } catch (err) {
      console.error("Bulk update failed:", err)
    } finally {
      setIsBulkUpdating(false)
    }
  }

  const clearFilters = () => {
    setFilterTreatment("all")
    setFilterDateRange("all")
    setFilterStatus("all")
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
      escapeCSV(getTreatmentLabel(l.raw_answers?.treatment as string)),
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
            Patient requests, messages, scheduling, and progress — all in one place
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

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px] h-8 text-xs bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="CONTACTED">Contacted</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="BOOKED_PENDING">Booked Pending</SelectItem>
              <SelectItem value="BOOKED_CONFIRMED">Booked Confirmed</SelectItem>
              <SelectItem value="ATTENDED">Attended</SelectItem>
              <SelectItem value="NOT_SUITABLE">Not Suitable</SelectItem>
              <SelectItem value="NO_RESPONSE">No Response</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
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

      {/* Bulk Actions Bar */}
      {selectedLeads.size > 0 && (
        <div className="flex items-center justify-between bg-[#faf3e6] border border-[#0fbcb0]/20 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[#0fbcb0]" />
            <span className="text-sm font-medium text-[#0fbcb0]">
              {selectedLeads.size} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => setSelectedLeads(new Set())}
            >
              Clear
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={bulkAction}
              onValueChange={setBulkAction}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs bg-white">
                <SelectValue placeholder="Choose action..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONTACTED">Mark as Contacted</SelectItem>
                <SelectItem value="NO_RESPONSE">Mark as No Response</SelectItem>
                <SelectItem value="NOT_SUITABLE">Mark as Not Suitable</SelectItem>
                <SelectItem value="BOOKED_CONFIRMED">Booking Confirmed</SelectItem>
                <SelectItem value="ATTENDED">Mark as Attended</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-8 text-xs bg-[#0fbcb0] hover:bg-[#0da399] text-white"
              disabled={isBulkUpdating || !bulkAction}
              onClick={() => {
                if (bulkAction) handleBulkStatusUpdate(bulkAction)
              }}
            >
              {isBulkUpdating ? "Updating..." : "Apply"}
            </Button>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === "new" && (
        <div className="space-y-3">
          {newRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Inbox className="w-12 h-12 mb-3 text-muted-foreground/40" />
                <p className="text-lg font-medium mb-1">No new requests</p>
                <p className="text-sm">New patient leads will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <LeadSection
              title="NEW REQUESTS"
              count={newRequests.length}
              leads={newRequests}
              actionLabel="Respond"
              actionIcon={<MessageSquare className="w-4 h-4" />}
              actionColor="bg-[#0fbcb0] hover:bg-[#0da399] text-white"
              onAction={(lead) => router.push(`/clinic/appointments/${lead.id}`)}
              onView={(lead) => router.push(`/clinic/appointments/${lead.id}`)}
              showElapsed
              selectedLeads={selectedLeads}
              onToggleSelect={toggleSelect}
              onSelectAll={selectAll}
            />
          )}
        </div>
      )}

      {activeTab === "awaiting" && (
        <div className="space-y-3">
          {awaitingResponse.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-3 text-muted-foreground/40" />
                <p className="text-lg font-medium mb-1">No leads awaiting response</p>
                <p className="text-sm">Leads you have replied to will appear here while waiting for the patient</p>
              </CardContent>
            </Card>
          ) : (
            <LeadSection
              title="AWAITING RESPONSE"
              count={awaitingResponse.length}
              leads={awaitingResponse}
              actionLabel="Follow up"
              actionIcon={<MessageSquare className="w-4 h-4" />}
              actionColor="bg-[#0fbcb0] hover:bg-[#0da399] text-white"
              onAction={(lead) => router.push(`/clinic/appointments/${lead.id}`)}
              onView={(lead) => router.push(`/clinic/appointments/${lead.id}`)}
              showElapsed
              selectedLeads={selectedLeads}
              onToggleSelect={toggleSelect}
              onSelectAll={selectAll}
            />
          )}
        </div>
      )}

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
            scheduled.map((lead) => (
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
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          lead.status?.status?.toUpperCase() === "BOOKED_CONFIRMED"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        )}
                      >
                        {lead.status?.status?.toUpperCase() === "BOOKED_CONFIRMED" ? "Confirmed" : "Pending"}
                      </Badge>
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
                    onClick={() => router.push(`/clinic/appointments/${lead.id}`)}
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
                              {getTreatmentLabel(lead.raw_answers?.treatment as string)}
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
                      onClick={() => router.push(`/clinic/appointments/${lead.id}`)}
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
                                {getTreatmentLabel(lead.raw_answers?.treatment as string)}
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
  selectedLeads,
  onToggleSelect,
  onSelectAll,
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
  selectedLeads: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAll: (ids: string[]) => void
}) {
  if (count === 0) return null

  const leadIds = leads.map((l) => l.id)
  const allSelected = leadIds.length > 0 && leadIds.every((id) => selectedLeads.has(id))

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <Checkbox
          checked={allSelected}
          onCheckedChange={() => onSelectAll(leadIds)}
          className="data-[state=checked]:bg-[#0fbcb0] data-[state=checked]:border-[#0fbcb0]"
        />
        <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
          {title} ({count})
        </h3>
      </div>
      <Card>
        <CardContent className="p-0 divide-y">
          {leads.map((lead) => {
            const treatment = getTreatmentLabel(lead.raw_answers?.treatment as string)
            const hasUnread = lead.conversation?.unread_by_clinic
            const hasReplied = !!lead.conversation?.clinic_first_reply_at
            const isSelected = selectedLeads.has(lead.id)
            const source = lead.source || "match"

            return (
              <div
                key={lead.id}
                className={cn(
                  "flex items-center justify-between p-4 hover:bg-muted/30 transition-colors",
                  hasUnread && "bg-[#faf3e6]/50",
                  isSelected && "bg-[#faf3e6]/80"
                )}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(lead.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="data-[state=checked]:bg-[#0fbcb0] data-[state=checked]:border-[#0fbcb0]"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">
                        {lead.first_name} {lead.last_name}
                      </p>
                      {hasUnread && (
                        <span className="w-2 h-2 rounded-full bg-[#0fbcb0] flex-shrink-0" />
                      )}
                      {hasReplied && !hasUnread && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200">
                          Replied
                        </Badge>
                      )}
                      {source === "direct_profile" && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Direct
                        </Badge>
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
