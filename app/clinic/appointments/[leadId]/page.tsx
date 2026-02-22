"use client"

import React from "react"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format, formatDistanceToNow } from "date-fns"
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
  MessageSquare,
  StickyNote,
  Plus,
  Star,
  Heart,
  AlertTriangle,
  DollarSign,
  Brain,
  Activity,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CalendarCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { BookingDialog } from "@/components/clinic/booking-dialog"
import { AppointmentActionCard } from "@/components/clinic/appointment-action-card"

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  postcode: string
  created_at: string
  source?: string
  raw_answers: Record<string, unknown>
}

interface LeadStatus {
  id: string
  status: string
  note: string | null
  staff_notes: StaffNote[] | null
  updated_at: string
}

interface StaffNote {
  text: string
  created_at: string
  created_by: string
}

interface Booking {
  id: string
  appointment_datetime: string
  booking_method: string
  expected_value_gbp: number | null
  booking_reference: string | null
}

interface MatchResult {
  reasons: string[]
  rank: number
  score?: number
  match_breakdown?: Array<{
    category: string
    points: number
    maxPoints: number
  }>
}

interface Conversation {
  id: string
  lead_id: string
  last_message_at: string
  unread_by_clinic: boolean
}

interface Message {
  id: string
  content: string
  sender_type: "patient" | "clinic" | "bot"
  created_at: string
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

export default function AppointmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.leadId as string
  const scrollRef = useRef<HTMLDivElement>(null)

  const [lead, setLead] = useState<Lead | null>(null)
  const [clinic, setClinic] = useState<{ id: string; name: string } | null>(null)
  const [status, setStatus] = useState<LeadStatus | null>(null)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showBookingDialog, setShowBookingDialog] = useState(false)

  const [newMessage, setNewMessage] = useState("")
  const [newNote, setNewNote] = useState("")
  const [showNoteInput, setShowNoteInput] = useState(false)

  // Collapsible sidebar sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    intent: true,
    match: false,
    notes: false,
  })

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const fetchData = useCallback(async () => {
    const supabase = createBrowserClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return

    // Get clinic
    const { data: clinicUser } = await supabase
      .from("clinic_users")
      .select("clinic_id, clinics(id, name)")
      .eq("user_id", session.user.id)
      .single()

    if (!clinicUser) return
    const clinicData = clinicUser.clinics as unknown as { id: string; name: string }
    setClinic(clinicData)

    // Fetch all data in parallel
    const [
      { data: leadData },
      { data: matchData },
      { data: statusData },
      { data: bookingData },
      { data: convData },
    ] = await Promise.all([
      supabase.from("leads").select("*").eq("id", leadId).single(),
      supabase
        .from("match_results")
        .select("*")
        .eq("lead_id", leadId)
        .eq("clinic_id", clinicData.id)
        .single(),
      supabase
        .from("lead_clinic_status")
        .select("*")
        .eq("lead_id", leadId)
        .eq("clinic_id", clinicData.id)
        .single(),
      supabase
        .from("bookings")
        .select("*")
        .eq("lead_id", leadId)
        .eq("clinic_id", clinicData.id)
        .single(),
      supabase
        .from("conversations")
        .select("*")
        .eq("lead_id", leadId)
        .eq("clinic_id", clinicData.id)
        .single(),
    ])

    if (leadData) setLead(leadData)
    if (matchData) setMatchResult(matchData as MatchResult)
    if (statusData) {
      setStatus(statusData)
    }
    if (bookingData) setBooking(bookingData)
    if (convData) {
      setConversation(convData)
      // Fetch messages
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convData.id)
        .order("created_at", { ascending: true })
      if (msgs) setMessages(msgs)

      // Mark as read
      await supabase
        .from("conversations")
        .update({ unread_by_clinic: false })
        .eq("id", convData.id)
    }

    setIsLoading(false)
  }, [leadId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Poll for new messages
  useEffect(() => {
    if (!conversation) return
    let isMounted = true
    const abortController = new AbortController()

    const pollMessages = async () => {
      if (!isMounted) return
      try {
        const response = await fetch(
          `/api/clinic/conversations/${conversation.id}/messages`,
          { signal: abortController.signal }
        )
        if (!isMounted) return
        if (response.ok) {
          const data = await response.json()
          setMessages(data.messages || [])
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return
      }
    }

    const interval = setInterval(pollMessages, 5000)
    return () => {
      isMounted = false
      abortController.abort()
      clearInterval(interval)
    }
  }, [conversation])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])


  const handleAddNote = async () => {
    if (!clinic || !newNote.trim()) return
    setIsSaving(true)
    const supabase = createBrowserClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const note: StaffNote = {
      text: newNote.trim(),
      created_at: new Date().toISOString(),
      created_by: session?.user.email || "Unknown",
    }

    const existingNotes = status?.staff_notes || []
    const updatedNotes = [...existingNotes, note]

    if (status) {
      await supabase
        .from("lead_clinic_status")
        .update({ staff_notes: updatedNotes })
        .eq("id", status.id)
    } else {
      await supabase.from("lead_clinic_status").insert({
        lead_id: leadId,
        clinic_id: clinic.id,
        status: "NEW",
        staff_notes: [note],
        updated_by: session?.user.id,
      })
    }

    setNewNote("")
    setShowNoteInput(false)
    await fetchData()
    setIsSaving(false)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!conversation || !newMessage.trim() || isSending) return

    setIsSending(true)
    try {
      const response = await fetch("/api/chat/clinic-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          content: newMessage.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages((prev) => [...prev, data.message])
        setNewMessage("")
      }
    } catch (error) {
      console.error("Failed to send:", error)
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading || !lead) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0fbcb0]" />
      </div>
    )
  }

  const treatment =
    TREATMENT_LABELS[lead.raw_answers?.treatment as string] ||
    (lead.raw_answers?.treatment as string) ||
    "Dental Treatment"

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* ── HEADER BAR ── */}
      <div className="shrink-0 border-b bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => router.push("/clinic/appointments")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold">
                  {lead.first_name} {lead.last_name}
                </h1>
                {lead.source && lead.source !== "match" && (
                  <Badge variant="secondary" className="text-[10px]">
                    {lead.source === "direct_profile" ? "Direct" : lead.source.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span>{treatment}</span>
                <span className="text-muted-foreground/40">|</span>
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="hover:underline flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {lead.email}
                  </a>
                )}
                {lead.phone && (
                  <>
                    <span className="text-muted-foreground/40">|</span>
                    <a href={`tel:${lead.phone}`} className="hover:underline flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {lead.phone}
                    </a>
                  </>
                )}
                {lead.postcode && (
                  <>
                    <span className="text-muted-foreground/40">|</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {lead.postcode}
                    </span>
                  </>
                )}
                <span className="text-muted-foreground/40">|</span>
                <span>{formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-2">
            {lead.phone && (
              <Button size="sm" variant="outline" className="gap-1.5 bg-transparent" asChild>
                <a href={`tel:${lead.phone}`}>
                  <Phone className="w-3.5 h-3.5" />
                  Call
                </a>
              </Button>
            )}
            {!booking && (
              <Button
                size="sm"
                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setShowBookingDialog(true)}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                Appointment confirmed with patient
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN: Chat + Sidebar ── */}
      <div className="flex-1 grid grid-cols-[1fr_380px] min-h-0">
        {/* ── CHAT COLUMN ── */}
        <div className="flex flex-col border-r min-h-0">
          {/* Booking banner if scheduled */}
          {booking && (
            <div className="shrink-0 bg-green-50 border-b border-green-100 px-6 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <CalendarCheck className="w-4 h-4 text-green-600" />
                <span className="text-green-700 font-medium">
                  Appointment: {format(new Date(booking.appointment_datetime), "EEE d MMM yyyy 'at' h:mm a")}
                </span>
                {booking.booking_method && (
                  <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700">
                    {booking.booking_method.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full" ref={scrollRef}>
              <div className="px-6 py-4">
                {!conversation ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mb-3 text-muted-foreground/30" />
                    <p className="font-medium">No conversation yet</p>
                    <p className="text-sm mt-1">Messages will appear when the patient reaches out</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mb-3 text-muted-foreground/30" />
                    <p className="font-medium">No messages yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-w-2xl mx-auto">
                    {messages.map((msg, idx) => {
                      const prevMsg = idx > 0 ? messages[idx - 1] : null
                      const showBotLabel = msg.sender_type === "bot" && (!prevMsg || prevMsg.sender_type !== "bot")

                      // Show date separator
                      const msgDate = format(new Date(msg.created_at), "d MMM yyyy")
                      const prevDate = prevMsg ? format(new Date(prevMsg.created_at), "d MMM yyyy") : null
                      const showDateSeparator = msgDate !== prevDate

                      return (
                        <React.Fragment key={msg.id}>
                          {showDateSeparator && (
                            <div className="flex items-center gap-3 py-2">
                              <div className="flex-1 h-px bg-muted" />
                              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                {msgDate}
                              </span>
                              <div className="flex-1 h-px bg-muted" />
                            </div>
                          )}
                          <div
                            className={cn(
                              "flex flex-col",
                              msg.sender_type === "clinic" ? "items-end" : "items-start"
                            )}
                          >
                            {showBotLabel && (
                              <span className="text-[10px] font-medium mb-0.5 px-1 text-[#0fbcb0] flex items-center gap-1">
                                <Heart className="w-2.5 h-2.5 fill-[#0fbcb0] text-[#0fbcb0]" />
                                Pearlie
                              </span>
                            )}
                            {msg.sender_type === "patient" && (!prevMsg || prevMsg.sender_type !== "patient") && (
                              <span className="text-[10px] font-medium mb-0.5 px-1 text-muted-foreground">
                                {lead.first_name}
                              </span>
                            )}
                            <div
                              className={cn(
                                "rounded-2xl",
                                msg.sender_type === "bot"
                                  ? "max-w-[52%] px-3 py-2 bg-gradient-to-br from-teal-50 to-[#faf3e6] border border-teal-100 rounded-bl-md"
                                  : "max-w-[75%] px-4 py-2.5",
                                msg.sender_type === "clinic"
                                  ? "bg-[#0fbcb0] text-white rounded-br-md"
                                  : msg.sender_type === "patient"
                                    ? "bg-muted rounded-bl-md"
                                    : ""
                              )}
                            >
                              <p
                                className={cn(
                                  "whitespace-pre-wrap leading-relaxed",
                                  msg.sender_type === "bot" ? "text-xs text-neutral-600" : "text-sm"
                                )}
                              >
                                {msg.content}
                              </p>
                              {msg.sender_type === "bot" && (
                                <p className="text-[9px] text-[#0fbcb0]/70 mt-1 italic">Automated message</p>
                              )}
                              <p
                                className={cn(
                                  "text-[10px] mt-1",
                                  msg.sender_type === "clinic" ? "text-white/60" : "text-muted-foreground/60"
                                )}
                              >
                                {format(new Date(msg.created_at), "h:mm a")}
                              </p>
                            </div>
                          </div>
                        </React.Fragment>
                      )
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Quick actions + message input */}
          {conversation && (
            <div className="shrink-0 border-t bg-white">
              <div className="flex gap-2 px-6 pt-3 pb-2 overflow-x-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs flex-shrink-0 rounded-full bg-transparent"
                  onClick={() =>
                    setNewMessage(
                      "I have the following times available:\n- \n- \n\nWould any of these work for you?"
                    )
                  }
                >
                  <Clock className="w-3 h-3 mr-1" />
                  Suggest times
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs flex-shrink-0 rounded-full bg-transparent"
                  onClick={() =>
                    setNewMessage(
                      "To help process your request, could you please provide the following:\n- "
                    )
                  }
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Request info
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs flex-shrink-0 rounded-full bg-transparent"
                  onClick={() =>
                    setNewMessage(
                      "Great news! Your appointment has been confirmed. We look forward to seeing you."
                    )
                  }
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Confirm booking
                </Button>
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2 px-6 pb-4">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 min-h-[42px] max-h-[120px] resize-none"
                  disabled={isSending}
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage(e)
                    }
                  }}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!newMessage.trim() || isSending}
                  className="bg-[#0fbcb0] hover:bg-[#0da399] text-white h-[42px] w-[42px] shrink-0"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <ScrollArea className="h-full">
          <div className="p-5 space-y-1">

            {/* Section: Patient Intent */}
            <SidebarSection
              title="Patient Details"
              icon={<Heart className="w-4 h-4 text-[#0fbcb0]" />}
              expanded={expandedSections.intent}
              onToggle={() => toggleSection("intent")}
            >
              <PatientIntent lead={lead} />
            </SidebarSection>


            {/* Section: Match Score */}
            {matchResult && (
              <SidebarSection
                title="Match Score"
                icon={<Sparkles className="w-4 h-4 text-[#0fbcb0]" />}
                expanded={expandedSections.match}
                onToggle={() => toggleSection("match")}
                badge={matchResult.score ? `${matchResult.score}%` : undefined}
              >
                <div className="space-y-3">
                  {/* Category breakdown */}
                  {matchResult.match_breakdown && matchResult.match_breakdown.length > 0 && (
                    <div className="space-y-2">
                      {matchResult.match_breakdown.map((cat) => {
                        const ratio = cat.maxPoints > 0 ? cat.points / cat.maxPoints : 0
                        const pct = Math.round(ratio * 100)
                        const categoryLabels: Record<string, string> = {
                          treatment: "Treatment match",
                          priorities: "Patient priorities",
                          blockers: "Concerns addressed",
                          anxiety: "Anxiety support",
                          cost: "Cost & value fit",
                          distance: "Location proximity",
                          availability: "Appointment times",
                        }
                        return (
                          <div key={cat.category}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs text-muted-foreground">{categoryLabels[cat.category] || cat.category}</span>
                              <span className="text-xs font-medium">{pct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#0fbcb0]"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Match reasons */}
                  {matchResult.reasons && matchResult.reasons.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Why they matched</p>
                      <ul className="space-y-1.5">
                        {matchResult.reasons.map((reason, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </SidebarSection>
            )}

            {/* Section: Appointment Management */}
            {lead && (lead as any).booking_status && clinic && (
              <SidebarSection
                title="Appointment"
                icon={<CalendarCheck className="w-4 h-4 text-[#0fbcb0]" />}
                expanded={true}
                onToggle={() => {}}
              >
                <AppointmentActionCard
                  leadId={lead.id}
                  clinicId={clinic.id}
                  bookingStatus={(lead as any).booking_status}
                  bookingDate={(lead as any).booking_date || null}
                  bookingTime={(lead as any).booking_time || null}
                  bookingDeclineReason={(lead as any).booking_decline_reason || null}
                  bookingCancelReason={(lead as any).booking_cancel_reason || null}
                  bookingConfirmedAt={(lead as any).booking_confirmed_at || null}
                  bookingDeclinedAt={(lead as any).booking_declined_at || null}
                  bookingCancelledAt={(lead as any).booking_cancelled_at || null}
                  bookingRescheduledAt={(lead as any).booking_rescheduled_at || null}
                  onUpdate={fetchData}
                />
              </SidebarSection>
            )}

            {/* Section: Staff Notes */}
            <SidebarSection
              title="Staff Notes"
              icon={<StickyNote className="w-4 h-4 text-[#0fbcb0]" />}
              expanded={expandedSections.notes}
              onToggle={() => toggleSection("notes")}
              badge={status?.staff_notes?.length ? `${status.staff_notes.length}` : undefined}
            >
              <div className="space-y-3">
                {status?.staff_notes && status.staff_notes.length > 0 && (
                  <div className="space-y-2">
                    {status.staff_notes.map((note, i) => (
                      <div key={i} className="bg-muted/50 rounded-lg p-2.5">
                        <p className="text-xs">{note.text}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {note.created_by} · {format(new Date(note.created_at), "d MMM, h:mm a")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {showNoteInput ? (
                  <div className="space-y-2">
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Write an internal note..."
                      rows={3}
                      className="text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleAddNote}
                        disabled={!newNote.trim() || isSaving}
                        className="bg-[#0fbcb0] hover:bg-[#0da399] text-white text-xs h-7"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7"
                        onClick={() => {
                          setShowNoteInput(false)
                          setNewNote("")
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-transparent text-xs h-8"
                    onClick={() => setShowNoteInput(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Note
                  </Button>
                )}
              </div>
            </SidebarSection>
          </div>
        </ScrollArea>
      </div>

      {showBookingDialog && clinic && (
        <BookingDialog
          leadId={leadId}
          clinicId={clinic.id}
          patientName={`${lead.first_name} ${lead.last_name}`}
          onClose={() => setShowBookingDialog(false)}
          onSuccess={() => {
            setShowBookingDialog(false)
            fetchData()
          }}
        />
      )}
    </div>
  )
}

// ── Collapsible sidebar section ──
function SidebarSection({
  title,
  icon,
  expanded,
  onToggle,
  badge,
  children,
}: {
  title: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  badge?: string
  children: React.ReactNode
}) {
  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full py-3 text-left hover:bg-muted/30 transition-colors -mx-1 px-1 rounded"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold">{title}</span>
          {badge && (
            <span className="text-[10px] font-medium bg-[#0fbcb0]/10 text-[#0fbcb0] px-1.5 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {expanded && <div className="pb-4">{children}</div>}
    </div>
  )
}

// ── Patient Intent display ──
function PatientIntent({ lead }: { lead: Lead }) {
  const ra = lead.raw_answers || {}
  const treatmentsSelected = ra.treatments_selected as string[] | undefined
  const treatmentSingle = ra.treatment as string | undefined
  const anxietyLevel = ra.anxiety_level as string | undefined
  const costApproach = ra.cost_approach as string | undefined
  const budgetRange = ra.budget_range as string | undefined
  const urgency = ra.urgency as string | undefined
  const decisionValues = ra.values as string[] | undefined
  const blockers = ra.blocker as string[] | undefined
  const blockerLabels = ra.blocker_labels as string[] | undefined
  const painScore = ra.pain_score as number | undefined
  const hasSwelling = ra.has_swelling === true
  const hasBleeding = ra.has_bleeding === true
  const outcomePriority = ra.outcome_priority as string | undefined
  const isEmergency = ra.is_emergency as boolean | undefined
  const preferredTimes = ra.preferred_times as string[] | undefined
  const locationPref = ra.location_preference as string | undefined

  const treatmentDisplay = treatmentsSelected?.length
    ? treatmentsSelected.join(", ")
    : treatmentSingle
      ? (TREATMENT_LABELS[treatmentSingle] || treatmentSingle.replace(/_/g, " "))
      : null

  const hasMedicalFlags = (painScore !== undefined && painScore > 0) || hasSwelling || hasBleeding

  const anxietyConfig: Record<string, { label: string; color: string }> = {
    comfortable: { label: "Comfortable", color: "bg-green-100 text-green-700" },
    slightly_anxious: { label: "Slightly anxious", color: "bg-yellow-100 text-yellow-700" },
    quite_anxious: { label: "Quite anxious", color: "bg-orange-100 text-orange-700" },
    very_anxious: { label: "Very anxious", color: "bg-red-100 text-red-700" },
    none: { label: "Comfortable", color: "bg-green-100 text-green-700" },
    mild: { label: "Slightly anxious", color: "bg-yellow-100 text-yellow-700" },
    moderate: { label: "Quite anxious", color: "bg-orange-100 text-orange-700" },
    severe: { label: "Very anxious", color: "bg-red-100 text-red-700" },
    high: { label: "Very anxious", color: "bg-red-100 text-red-700" },
  }

  const costLabels: Record<string, string> = {
    best_outcome: "Best outcome regardless of cost",
    understand_value: "Wants to understand value first",
    comfort_range: "Has a budget range in mind",
    strict_budget: "Strict budget constraints",
    options_first: "Wants to explore options first",
    upfront_pricing: "Prefers upfront pricing",
    finance_preferred: "Prefers finance / payment plans",
  }

  const urgencyLabels: Record<string, string> = {
    today: "Needs to be seen today",
    tomorrow: "Needs to be seen tomorrow",
    next_few_days: "Within the next few days",
    asap: "As soon as possible",
    within_week: "Within a week",
    few_weeks: "Within a few weeks",
    exploring: "Just exploring options",
  }

  const blockerCodeLabels: Record<string, string> = {
    NOT_WORTH_COST: "Unsure about cost",
    NEED_MORE_TIME: "Needs time to decide",
    UNSURE_OPTION: "Not sure which treatment",
    WORRIED_COMPLEX: "Worried about complexity",
    BAD_EXPERIENCE: "Past bad experience",
    NO_CONCERN: "No concerns",
  }

  const rows: Array<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = []

  if (treatmentDisplay) {
    rows.push({
      icon: <Sparkles className="w-3.5 h-3.5" />,
      label: "Treatment",
      value: <span className="text-xs">{treatmentDisplay}</span>,
    })
  }

  if (urgency || isEmergency) {
    rows.push({
      icon: <Clock className="w-3.5 h-3.5" />,
      label: "Urgency",
      value: (
        <span className="text-xs">
          {isEmergency && !urgency ? "Emergency" : urgencyLabels[urgency!] || urgency?.replace(/_/g, " ")}
        </span>
      ),
    })
  }

  if (anxietyLevel) {
    const config = anxietyConfig[anxietyLevel]
    rows.push({
      icon: <Brain className="w-3.5 h-3.5" />,
      label: "Anxiety",
      value: (
        <span className="text-xs">
          {config?.label || anxietyLevel.replace(/_/g, " ")}
        </span>
      ),
    })
  }

  if (budgetRange || costApproach) {
    rows.push({
      icon: <DollarSign className="w-3.5 h-3.5" />,
      label: "Budget",
      value: (
        <span className="text-xs">
          {costApproach ? (costLabels[costApproach] || costApproach.replace(/_/g, " ")) : (budgetRange?.replace(/_/g, " "))}
        </span>
      ),
    })
  }

  if (hasMedicalFlags) {
    const flags: string[] = []
    if (painScore !== undefined && painScore > 0) flags.push(`Pain ${painScore}/10`)
    if (hasSwelling) flags.push("Swelling")
    if (hasBleeding) flags.push("Bleeding")
    rows.push({
      icon: <Activity className="w-3.5 h-3.5" />,
      label: "Medical",
      value: <span className="text-xs">{flags.join(", ")}</span>,
    })
  }

  if (decisionValues && decisionValues.length > 0) {
    rows.push({
      icon: <Star className="w-3.5 h-3.5" />,
      label: "Values",
      value: <span className="text-xs">{decisionValues.join(", ")}</span>,
    })
  }

  if (blockers && blockers.length > 0 && blockers[0] !== "NO_CONCERN") {
    const labels = (blockerLabels || blockers).map((b) =>
      blockerLabels ? b : (blockerCodeLabels[b] || (typeof b === "string" ? b.replace(/_/g, " ") : b))
    )
    rows.push({
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      label: "Concerns",
      value: <span className="text-xs">{labels.join(", ")}</span>,
    })
  }

  if (outcomePriority) {
    rows.push({
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      label: "Priority",
      value: <span className="text-xs">{outcomePriority}</span>,
    })
  }

  if (preferredTimes && preferredTimes.length > 0) {
    rows.push({
      icon: <Calendar className="w-3.5 h-3.5" />,
      label: "Times",
      value: <span className="text-xs capitalize">{preferredTimes.join(", ")}</span>,
    })
  }

  if (locationPref) {
    rows.push({
      icon: <MapPin className="w-3.5 h-3.5" />,
      label: "Location",
      value: <span className="text-xs capitalize">{locationPref.replace(/_/g, " ")}</span>,
    })
  }

  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">No patient intent data available</p>
  }

  return (
    <div className="space-y-2.5">
      {rows.map((row, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <div className="text-[#004443] mt-0.5 shrink-0">{row.icon}</div>
          <div className="min-w-0">
            <p className="text-[10px] text-[#004443] font-semibold uppercase tracking-wider">{row.label}</p>
            <div className="mt-0.5 text-foreground">{row.value}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

