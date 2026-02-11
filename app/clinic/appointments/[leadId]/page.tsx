"use client"

import React from "react"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { BookingDialog } from "@/components/clinic/booking-dialog"

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  postcode: string
  created_at: string
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
  sender_type: "patient" | "clinic"
  created_at: string
}

const STATUS_OPTIONS = [
  { value: "NEW", label: "New Request" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "BOOKED_PENDING", label: "Booked - Pending" },
  { value: "BOOKED_CONFIRMED", label: "Booked - Confirmed" },
  { value: "NOT_SUITABLE", label: "Not Suitable" },
  { value: "NO_RESPONSE", label: "No Response" },
  { value: "CLOSED", label: "Closed" },
]

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

const FORM_FIELD_LABELS: Record<string, string> = {
  treatment: "Treatment Interest",
  urgency: "Urgency / Timeline",
  blocker: "Concerns / Barriers",
  budget: "Budget Range",
  location: "Preferred Location",
  insurance: "Insurance",
  age: "Age Range",
  preferred_contact: "Contact Preference",
  availability: "Availability",
  previous_dentist: "Previous Dentist",
  dental_anxiety: "Dental Anxiety",
  special_requirements: "Special Requirements",
  payment_preference: "Payment Preference",
  language_preference: "Language Preference",
}

// Progress stepper steps
const PROGRESS_STEPS = [
  { key: "new", label: "New Request" },
  { key: "scheduled", label: "Scheduled" },
  { key: "completed", label: "Completed" },
]

function getProgressIndex(status: string, hasBooking: boolean) {
  if (status === "CLOSED" || status === "BOOKED_CONFIRMED") return 2
  if (
    status === "BOOKED_PENDING" ||
    hasBooking ||
    status === "IN_PROGRESS" ||
    status === "CONTACTED"
  )
    return 1
  return 0
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

  const [editStatus, setEditStatus] = useState("NEW")
  const [newMessage, setNewMessage] = useState("")
  const [newNote, setNewNote] = useState("")
  const [showNoteInput, setShowNoteInput] = useState(false)

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
        .select("reasons, rank")
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
      setEditStatus(statusData.status)
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

  const handleSaveStatus = async () => {
    if (!clinic) return
    setIsSaving(true)
    const supabase = createBrowserClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (status) {
      await supabase
        .from("lead_clinic_status")
        .update({
          status: editStatus,
          updated_by: session?.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", status.id)
    } else {
      await supabase.from("lead_clinic_status").insert({
        lead_id: leadId,
        clinic_id: clinic.id,
        status: editStatus,
        updated_by: session?.user.id,
      })
    }

    await fetchData()
    setIsSaving(false)
  }

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C3AED]" />
      </div>
    )
  }

  const treatment =
    TREATMENT_LABELS[lead.raw_answers?.treatment as string] ||
    (lead.raw_answers?.treatment as string) ||
    "Dental Treatment"
  const progressIndex = getProgressIndex(
    editStatus,
    !!booking
  )
  const contactPreference = lead.raw_answers?.preferred_contact as string

  return (
    <div className="p-6 flex flex-col min-h-full">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="w-fit mb-4 text-[#7C3AED] hover:text-[#6D28D9] hover:bg-[#F5F0FF] shrink-0"
        onClick={() => router.push("/clinic/appointments")}
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to appointments
      </Button>

      {/* Three-column layout */}
      <div className="flex-1 grid grid-cols-[300px_1fr_380px] gap-6">
        {/* LEFT COLUMN - Patient Info */}
        <ScrollArea className="pr-4">
          <div className="space-y-6">
            {/* Patient header */}
            <div>
              <h1 className="text-2xl font-bold">
                {lead.first_name} {lead.last_name}
              </h1>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${lead.email}`} className="hover:underline">
                    {lead.email}
                  </a>
                </div>
                {lead.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${lead.phone}`} className="hover:underline">
                      {lead.phone}
                    </a>
                  </div>
                )}
                {lead.postcode && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {lead.postcode}
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(lead.created_at), "d MMM yyyy")}
                </div>
              </div>
            </div>

            <Separator />

            {/* Request Details - Form Answers */}
            <div>
              <h3 className="font-semibold text-sm mb-3">Request Details</h3>
              <div className="space-y-4">
                {Object.entries(lead.raw_answers || {}).map(([key, value]) => {
                  if (!value || key === "step") return null
                  const label = FORM_FIELD_LABELS[key] || key.replace(/_/g, " ")
                  let displayValue: string

                  if (Array.isArray(value)) {
                    displayValue = value
                      .map((v) =>
                        typeof v === "string" ? v.replace(/_/g, " ") : String(v)
                      )
                      .join(", ")
                  } else if (typeof value === "string") {
                    displayValue =
                      TREATMENT_LABELS[value] || value.replace(/_/g, " ")
                  } else {
                    displayValue = String(value)
                  }

                  return (
                    <div key={key}>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {label}
                      </p>
                      <p className="text-sm mt-0.5">{displayValue}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Why Matched */}
            {matchResult?.reasons && matchResult.reasons.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-3">
                  Why They Were Matched
                </h3>
                <ul className="space-y-2">
                  {matchResult.reasons.map((reason, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* CENTER COLUMN - Appointment Management */}
        <ScrollArea className="pr-4">
          <div className="space-y-6">
            {/* Progress Stepper */}
            <div className="flex items-center gap-0">
              {PROGRESS_STEPS.map((step, i) => (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2",
                        i <= progressIndex
                          ? "bg-[#7C3AED] border-[#7C3AED] text-white"
                          : "border-muted-foreground/30 text-muted-foreground"
                      )}
                    >
                      {i < progressIndex ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <p
                      className={cn(
                        "text-xs mt-1.5 text-center",
                        i <= progressIndex
                          ? "text-[#7C3AED] font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </p>
                  </div>
                  {i < PROGRESS_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 -mt-5",
                        i < progressIndex ? "bg-[#7C3AED]" : "bg-muted-foreground/20"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Schedule / Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[#7C3AED]">
                  {booking ? "Appointment Details" : "Schedule Appointment"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Treatment Type
                  </p>
                  <p className="font-medium mt-0.5">{treatment}</p>
                </div>

                {booking && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Appointment Date
                    </p>
                    <p className="font-medium mt-0.5">
                      {format(
                        new Date(booking.appointment_datetime),
                        "EEEE, d MMMM yyyy 'at' h:mm a"
                      )}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    Status
                  </p>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  {!booking && (
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => setShowBookingDialog(true)}
                    >
                      <Calendar className="w-4 h-4 mr-1.5" />
                      Confirm Appointment
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleSaveStatus}
                    disabled={isSaving}
                    className="bg-transparent"
                  >
                    {isSaving ? "Saving..." : "Save Status"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Staff Notes */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <StickyNote className="w-5 h-5" />
                    Staff Notes
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {(!status?.staff_notes || status.staff_notes.length === 0) &&
                !showNoteInput ? (
                  <p className="text-sm text-muted-foreground mb-3">
                    No internal staff notes added
                  </p>
                ) : (
                  <div className="space-y-3 mb-3">
                    {(status?.staff_notes || []).map((note, i) => (
                      <div
                        key={i}
                        className="bg-muted/50 rounded-lg p-3"
                      >
                        <p className="text-sm">{note.text}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                          <span>{note.created_by}</span>
                          <span>-</span>
                          <span>
                            {format(new Date(note.created_at), "d MMM, h:mm a")}
                          </span>
                        </div>
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
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleAddNote}
                        disabled={!newNote.trim() || isSaving}
                        className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                      >
                        Save Note
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
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
                    className="w-full bg-transparent"
                    onClick={() => setShowNoteInput(true)}
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Note
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* RIGHT COLUMN - Chat */}
        <Card className="flex flex-col min-h-0 max-h-[calc(100vh-8rem)] sticky top-6">
          <CardHeader className="border-b pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  Chat with {lead.first_name}
                </CardTitle>
                {contactPreference && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Contact preference: {contactPreference}
                  </p>
                )}
              </div>
              {lead.phone && (
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-full bg-transparent"
                  asChild
                >
                  <a href={`tel:${lead.phone}`}>
                    <Phone className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
          </CardHeader>

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full p-4" ref={scrollRef}>
              {!conversation ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                  <MessageSquare className="w-10 h-10 mb-2 text-muted-foreground/40" />
                  <p className="text-sm">No conversation started yet</p>
                  <p className="text-xs">
                    Messages will appear when the patient reaches out
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                  <MessageSquare className="w-10 h-10 mb-2 text-muted-foreground/40" />
                  <p className="text-sm">No messages yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.sender_type === "clinic"
                          ? "justify-end"
                          : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-2.5",
                          msg.sender_type === "clinic"
                            ? "bg-[#7C3AED] text-white rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {msg.content}
                        </p>
                        <p
                          className={cn(
                            "text-xs mt-1",
                            msg.sender_type === "clinic"
                              ? "text-white/60"
                              : "text-muted-foreground"
                          )}
                        >
                          {format(new Date(msg.created_at), "h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Quick actions + input */}
          <div className="border-t flex-shrink-0">
            {conversation && (
              <>
                <div className="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto">
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
                        `Great news! Your appointment has been confirmed. We look forward to seeing you.`
                      )
                    }
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Confirm booking
                  </Button>
                </div>
                <form
                  onSubmit={handleSendMessage}
                  className="flex gap-2 px-4 pb-4"
                >
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type message to patient..."
                    className="flex-1"
                    disabled={isSending}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!newMessage.trim() || isSending}
                    className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </Card>
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
