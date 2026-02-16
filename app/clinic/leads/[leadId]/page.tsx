"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { ClinicNav } from "@/components/clinic/clinic-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Mail, Phone, Calendar, MapPin, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
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
  updated_at: string
}

interface Booking {
  id: string
  appointment_datetime: string
  booking_method: string
  expected_value_gbp: number | null
  booking_reference: string | null
  booked_at: string
}

interface LeadEvent {
  id: string
  event_type: string
  event_meta: Record<string, unknown>
  created_at: string
}

interface MatchResult {
  reasons: string[]
  rank: number
}

interface Clinic {
  id: string
  name: string
}

const STATUS_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "BOOKED_CONFIRMED", label: "Booked & Confirmed" },
  { value: "NOT_SUITABLE", label: "Not Suitable" },
  { value: "NO_RESPONSE", label: "No Response" },
  { value: "CLOSED", label: "Closed" },
]

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  BOOKED_CONFIRMED: "bg-green-100 text-green-800",
  NOT_SUITABLE: "bg-gray-100 text-gray-800",
  NO_RESPONSE: "bg-orange-100 text-orange-800",
  CLOSED: "bg-gray-100 text-gray-800",
}

const TREATMENT_LABELS: Record<string, string> = {
  dental_implants: "Dental Implants",
  composite_bonding: "Composite Bonding",
  invisalign: "Invisalign",
  veneers: "Veneers",
  teeth_whitening: "Teeth Whitening",
  crowns_bridges: "Crowns & Bridges",
  general_checkup: "General Checkup",
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.leadId as string

  const [lead, setLead] = useState<Lead | null>(null)
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [status, setStatus] = useState<LeadStatus | null>(null)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [events, setEvents] = useState<LeadEvent[]>([])
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showBookingDialog, setShowBookingDialog] = useState(false)

  const [editStatus, setEditStatus] = useState("")
  const [editNote, setEditNote] = useState("")

  const fetchData = useCallback(async () => {
    const supabase = createBrowserClient()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Get clinic info
    const { data: clinicUser } = await supabase
      .from("clinic_users")
      .select("clinic_id, clinics(id, name)")
      .eq("user_id", session.user.id)
      .single()

    if (!clinicUser) return
    const clinicData = clinicUser.clinics as unknown as Clinic
    setClinic(clinicData)

    // AUTHORIZATION: Verify this lead is matched to the user's clinic BEFORE fetching lead data
    const { data: matchData } = await supabase
      .from("match_results")
      .select("reasons, rank")
      .eq("lead_id", leadId)
      .eq("clinic_id", clinicData.id)
      .single()

    if (!matchData) {
      // This clinic is not authorized to view this lead
      setLead(null)
      setIsLoading(false)
      return
    }

    setMatchResult(matchData as MatchResult)

    // Only fetch lead details after authorization is confirmed
    const { data: leadData } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single()

    if (leadData) {
      setLead(leadData)
    }

    // Get status
    const { data: statusData } = await supabase
      .from("lead_clinic_status")
      .select("*")
      .eq("lead_id", leadId)
      .eq("clinic_id", clinicData.id)
      .single()

    if (statusData) {
      setStatus(statusData)
      setEditStatus(statusData.status)
      setEditNote(statusData.note || "")
    } else {
      setEditStatus("NEW")
    }

    // Get booking
    const { data: bookingData } = await supabase
      .from("bookings")
      .select("*")
      .eq("lead_id", leadId)
      .eq("clinic_id", clinicData.id)
      .single()

    if (bookingData) {
      setBooking(bookingData)
    }

    // Get events
    const { data: eventsData } = await supabase
      .from("lead_events")
      .select("*")
      .eq("lead_id", leadId)
      .or(`clinic_id.eq.${clinicData.id},clinic_id.is.null`)
      .order("created_at", { ascending: false })

    if (eventsData) {
      setEvents(eventsData)
    }

    setIsLoading(false)
  }, [leadId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSaveStatus = async () => {
    if (!clinic) return
    setIsSaving(true)

    const supabase = createBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (status) {
      await supabase
        .from("lead_clinic_status")
        .update({
          status: editStatus,
          note: editNote || null,
          updated_by: session?.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", status.id)
    } else {
      await supabase
        .from("lead_clinic_status")
        .insert({
          lead_id: leadId,
          clinic_id: clinic.id,
          status: editStatus,
          note: editNote || null,
          updated_by: session?.user.id,
        })
    }

    await fetchData()
    setIsSaving(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ClinicNav clinicName="Loading..." />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-background">
        <ClinicNav clinicName={clinic?.name || "Clinic Portal"} />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => router.push("/clinic")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leads
          </Button>
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h2 className="text-lg font-semibold mb-1">Lead not found</h2>
              <p className="text-sm text-muted-foreground">
                This lead does not exist or is not matched to your clinic.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const treatment = lead.raw_answers?.treatment as string
  const treatmentLabel = TREATMENT_LABELS[treatment] || treatment || "Dental treatment"
  const urgency = lead.raw_answers?.urgency as string
  const concerns = lead.raw_answers?.blocker as string[] || []

  return (
    <div className="min-h-screen bg-background">
      <ClinicNav clinicName={clinic?.name || "Clinic Portal"} />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => router.push("/clinic")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leads
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {lead.first_name} {lead.last_name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Lead received {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
            </p>
          </div>
          <Badge className={`${STATUS_COLORS[editStatus]} text-sm px-3 py-1`}>
            {STATUS_OPTIONS.find(s => s.value === editStatus)?.label || editStatus}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <a href={`mailto:${lead.email}`} className="font-medium hover:underline">
                        {lead.email}
                      </a>
                    </div>
                  </div>
                  {lead.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <a href={`tel:${lead.phone}`} className="font-medium hover:underline">
                          {lead.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {lead.postcode && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Postcode</p>
                        <p className="font-medium">{lead.postcode}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Enquiry Date</p>
                      <p className="font-medium">
                        {format(new Date(lead.created_at), "d MMM yyyy, HH:mm")}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Treatment Interest */}
            <Card>
              <CardHeader>
                <CardTitle>Treatment Interest</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Treatment Type</p>
                  <p className="font-medium text-lg">{treatmentLabel}</p>
                </div>
                
                {urgency && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Timeline</p>
                    <p className="font-medium">{urgency}</p>
                  </div>
                )}

                {concerns.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Concerns</p>
                    <div className="flex flex-wrap gap-2">
                      {concerns.map(concern => (
                        <Badge key={concern} variant="secondary">
                          {concern.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {matchResult?.reasons && matchResult.reasons.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Why They Were Matched to You</p>
                    <ul className="space-y-1">
                      {matchResult.reasons.map((reason, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Booking Info */}
            {booking && (
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <CheckCircle2 className="w-5 h-5" />
                    Booking Confirmed
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Appointment</p>
                      <p className="font-medium">
                        {format(new Date(booking.appointment_datetime), "EEEE, d MMMM yyyy 'at' HH:mm")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Booking Method</p>
                      <p className="font-medium">{booking.booking_method.replace(/_/g, " ")}</p>
                    </div>
                    {booking.booking_reference && (
                      <div>
                        <p className="text-sm text-muted-foreground">Reference</p>
                        <p className="font-medium">{booking.booking_reference}</p>
                      </div>
                    )}
                    {booking.expected_value_gbp && (
                      <div>
                        <p className="text-sm text-muted-foreground">Expected Value</p>
                        <p className="font-medium">£{booking.expected_value_gbp.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activity Timeline */}
            {events.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {events.slice(0, 10).map(event => (
                      <div key={event.id} className="flex gap-3">
                        <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {event.event_type.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Update */}
            <Card>
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
                <CardDescription>Track this lead's progress</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Internal Notes</Label>
                  <Textarea
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Add notes about this lead..."
                    rows={4}
                  />
                </div>

                <Button 
                  onClick={handleSaveStatus} 
                  className="w-full"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>

                <Separator />

                {!booking && (
                  <Button 
                    variant="outline" 
                    className="w-full bg-transparent"
                    onClick={() => setShowBookingDialog(true)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Log Booking
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                  <a href={`mailto:${lead.email}`}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </a>
                </Button>
                {lead.phone && (
                  <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                    <a href={`tel:${lead.phone}`}>
                      <Phone className="w-4 h-4 mr-2" />
                      Call Patient
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

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
