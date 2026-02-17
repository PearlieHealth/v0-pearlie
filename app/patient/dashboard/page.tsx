"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  Calendar,
  LogOut,
  Search,
  ChevronRight,
  ChevronDown,
  Star,
  CheckCircle2,
  Clock,
  Sparkles,
  Send,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { BookingDialog } from "@/components/clinic/booking-dialog"
import { useChatChannel, type RealtimeMessage } from "@/hooks/use-chat-channel"
import { format } from "date-fns"

// ── Types ────────────────────────────────────────────────────────

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  treatment_interest: string
  postcode: string
  created_at: string
  is_verified: boolean
}

interface Match {
  id: string
  lead_id: string
  clinic_ids: string[]
  status: string
  created_at: string
}

interface Conversation {
  id: string
  clinic_id: string
  lead_id: string
  status: string
  last_message_at: string
  unread_by_patient: boolean
  unread_count_patient: number
  clinics: { id: string; name: string; images?: string[] } | null
  latest_message?: string | null
  latest_message_sender?: string | null
}

interface DashboardData {
  user: { id: string; email: string; name: string }
  leads: Lead[]
  matches: Match[]
  conversations: Conversation[]
  matchesTotal: number
  conversationsTotal: number
}

interface ClinicInfo {
  id: string
  slug?: string
  name: string
  address: string
  postcode: string
  phone: string
  rating: number
  review_count: number
  distance_miles?: number
  images?: string[]
  verified?: boolean
  match_percentage?: number
  match_reasons_composed?: string[]
  ai_headline?: string | null
  highlight_chips?: string[]
  available_this_week?: boolean
  offers_free_consultation?: boolean
  accepts_same_day?: boolean
  available_days?: string[]
}

interface Message {
  id: string
  content: string
  sender_type: "patient" | "clinic" | "bot"
  status?: "sent" | "delivered" | "read"
  created_at: string
}

const PAGE_SIZE = 10

const QUICK_PROMPTS = [
  "Do you have availability today?",
  "How much is an emergency appointment?",
  "Can I come after work?",
]

// ── Component ────────────────────────────────────────────────────

export default function PatientDashboard() {
  const router = useRouter()

  // Core data
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Clinic data for hero
  const [recommendedClinic, setRecommendedClinic] = useState<ClinicInfo | null>(null)
  const [otherClinics, setOtherClinics] = useState<ClinicInfo[]>([])
  const [showOtherClinics, setShowOtherClinics] = useState(false)
  const [loadingClinics, setLoadingClinics] = useState(false)
  const [showBookingDialog, setShowBookingDialog] = useState(false)
  const [showMatchHistory, setShowMatchHistory] = useState(false)
  const [loadingMoreMatches, setLoadingMoreMatches] = useState(false)

  // Inbox state
  const [inboxConversations, setInboxConversations] = useState<Conversation[]>([])
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [mobileInboxOpen, setMobileInboxOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const selectedConv = inboxConversations.find((c) => c.id === selectedConvId) || null

  // ── Data fetching ────────────────────────────────────────────

  useEffect(() => {
    fetchDashboard()
  }, [])

  async function fetchDashboard() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/patient/login"); return }

      const res = await fetch(`/api/patient/matches?matchesLimit=${PAGE_SIZE}&convsLimit=${PAGE_SIZE}`)
      if (!res.ok) {
        if (res.status === 401) { router.replace("/patient/login"); return }
        throw new Error("Failed to load dashboard")
      }

      const dashboardData = await res.json()
      setData(dashboardData)

      const latestMatch = dashboardData.matches?.[0]
      if (latestMatch) fetchClinicDetails(latestMatch.id)

      // Fetch inbox conversations (with message previews)
      fetchInbox()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function fetchClinicDetails(matchId: string) {
    setLoadingClinics(true)
    try {
      const res = await fetch(`/api/matches/${matchId}`)
      if (res.ok) {
        const matchData = await res.json()
        const clinics = matchData.clinics || []
        if (clinics.length > 0) {
          setRecommendedClinic(clinics[0])
          setOtherClinics(clinics.slice(1))
        }
      }
    } catch (err) {
      console.error("Failed to fetch clinic details:", err)
    } finally {
      setLoadingClinics(false)
    }
  }

  async function fetchInbox() {
    try {
      const res = await fetch("/api/patient/conversations")
      if (res.ok) {
        const { conversations } = await res.json()
        setInboxConversations(conversations || [])

        // Auto-select: most recent unread, or first conversation
        if (!selectedConvId && conversations?.length > 0) {
          const firstUnread = conversations.find((c: Conversation) => c.unread_by_patient)
          setSelectedConvId(firstUnread?.id || conversations[0].id)
        }
      }
    } catch {}
  }

  // ── Conversation messages ────────────────────────────────────

  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/patient/conversations/${convId}/messages`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
        // Update inbox to mark as read locally
        setInboxConversations((prev) =>
          prev.map((c) =>
            c.id === convId ? { ...c, unread_by_patient: false, unread_count_patient: 0 } : c
          )
        )
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err)
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    if (selectedConvId) fetchMessages(selectedConvId)
  }, [selectedConvId, fetchMessages])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── Real-time chat ───────────────────────────────────────────

  const handleNewRealtimeMessage = useCallback((msg: RealtimeMessage) => {
    if (msg.conversation_id !== selectedConvId) {
      // Update inbox unread count for other conversations
      setInboxConversations((prev) =>
        prev.map((c) =>
          c.id === msg.conversation_id
            ? {
                ...c,
                unread_by_patient: true,
                unread_count_patient: (c.unread_count_patient || 0) + 1,
                latest_message: msg.content?.substring(0, 100),
                latest_message_sender: msg.sender_type,
                last_message_at: msg.created_at,
              }
            : c
        )
      )
      return
    }
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev
      return [...prev, msg].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    })
  }, [selectedConvId])

  const handleStatusChange = useCallback((msgId: string, status: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, status: status as Message["status"] } : m))
    )
  }, [])

  const { otherTyping } = useChatChannel({
    conversationId: selectedConvId,
    userType: "patient",
    onNewMessage: handleNewRealtimeMessage,
    onStatusChange: handleStatusChange,
    enabled: !!selectedConvId,
  })

  // ── Send message ─────────────────────────────────────────────

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault()
    if (!newMessage.trim() || !selectedConv || isSending) return

    setIsSending(true)
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedConv.lead_id,
          clinicId: selectedConv.clinic_id,
          content: newMessage.trim(),
          senderType: "patient",
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [...prev, data.message])
        setNewMessage("")

        // Update inbox preview
        setInboxConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConv.id
              ? { ...c, latest_message: newMessage.trim().substring(0, 100), latest_message_sender: "patient", last_message_at: new Date().toISOString() }
              : c
          )
        )

        // Handle bot auto-replies with delay
        if (data.botMessages?.length) {
          data.botMessages.forEach((botMsg: Message, i: number) => {
            setTimeout(() => {
              setMessages((prev) => {
                if (prev.some((m) => m.id === botMsg.id)) return prev
                return [...prev, botMsg]
              })
            }, (i + 1) * 1500)
          })
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err)
    } finally {
      setIsSending(false)
    }
  }

  // ── Helpers ──────────────────────────────────────────────────

  async function loadMoreMatches() {
    if (!data) return
    setLoadingMoreMatches(true)
    try {
      const offset = data.matches.length
      const res = await fetch(`/api/patient/matches?matchesLimit=${PAGE_SIZE}&matchesOffset=${offset}&convsLimit=0`)
      if (res.ok) {
        const moreData = await res.json()
        setData({ ...data, matches: [...data.matches, ...(moreData.matches || [])] })
      }
    } catch {} finally { setLoadingMoreMatches(false) }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    try { localStorage.removeItem("pearlie_last_match") } catch {}
    router.replace("/patient/login")
  }

  function openConversationForClinic(clinicId: string) {
    const conv = inboxConversations.find((c) => c.clinic_id === clinicId)
    if (conv) {
      setSelectedConvId(conv.id)
      setMobileInboxOpen(true)
    }
  }

  const totalUnread = inboxConversations.reduce((sum, c) => sum + (c.unread_count_patient || 0), 0)
  const hasMoreMatches = data ? data.matches.length < (data.matchesTotal || 0) : false
  const latestMatch = data?.matches?.[0] || null
  const latestMatchLead = latestMatch ? data?.leads?.find((l) => l.id === latestMatch.lead_id) : null

  function getAvailabilityLabel(clinic: ClinicInfo): string | null {
    if (clinic.accepts_same_day) return "Today"
    if (clinic.available_this_week) return "This week"
    if (clinic.available_days && clinic.available_days.length > 0) return "Available"
    return null
  }

  // ── Loading / Error states ───────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#907EFF]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchDashboard}>Try again</Button>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="rounded-full bg-black p-1.5">
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="font-semibold text-lg">Pearlie</span>
            </Link>
            <div className="hidden sm:block text-sm text-[#323141]/50">
              Hi{data?.user?.name ? `, ${data.user.name.split(" ")[0]}` : ""} <span className="text-[#323141]/30 mx-1">·</span> {data?.user?.email}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Mobile inbox toggle */}
            <button
              onClick={() => setMobileInboxOpen(!mobileInboxOpen)}
              className="lg:hidden relative flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <div className="relative">
                <MessageCircle className="w-5 h-5" />
                {totalUnread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full inline-flex items-center justify-center">
                    {totalUnread}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content: split view */}
      <div className="flex-1 max-w-[1400px] w-full mx-auto flex">

        {/* ══════ LEFT COLUMN: Your Match ══════ */}
        <div className="flex-1 min-w-0 lg:max-w-[58%] overflow-y-auto p-4 lg:p-6 space-y-6">

          {/* Match context header */}
          {latestMatchLead && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#323141]/60">
                Latest search: <span className="font-medium text-[#323141]/80">{latestMatchLead.treatment_interest || "Dental enquiry"}</span>
                {latestMatchLead.postcode && <> <span className="text-[#323141]/30">·</span> {latestMatchLead.postcode}</>}
              </p>
              <Link href="/intake" className="text-xs text-[#907EFF] hover:underline flex-shrink-0">
                New search
              </Link>
            </div>
          )}

          {/* ─── HERO: Recommended clinic ──────────────────────── */}
          {!latestMatch ? (
            <Card className="p-8 text-center">
              <Search className="w-10 h-10 text-[#ccc] mx-auto mb-3" />
              <h2 className="font-semibold text-[#323141] text-lg mb-2">Find your perfect clinic</h2>
              <p className="text-muted-foreground mb-5 text-sm">
                Tell us what you need and we&apos;ll recommend the best clinic for you.
              </p>
              <Button asChild className="bg-gradient-to-r from-[#907EFF] to-[#ED64A6] text-white border-0">
                <Link href="/intake">Get matched</Link>
              </Button>
            </Card>
          ) : loadingClinics && !recommendedClinic ? (
            <Card className="p-10 flex flex-col items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#907EFF] mb-3" />
              <p className="text-sm text-muted-foreground">Finding your best match...</p>
            </Card>
          ) : recommendedClinic ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#907EFF]" />
                <h2 className="text-sm font-semibold text-[#323141]/70 uppercase tracking-wide">
                  Recommended for you
                </h2>
              </div>
              <p className="text-xs text-muted-foreground -mt-1">
                Chosen based on availability, distance, and fit for your needs
              </p>

              <Card className="overflow-hidden border-[#907EFF]/20 shadow-md">
                {recommendedClinic.images?.[0] && (
                  <div className="relative w-full h-40 bg-neutral-100">
                    <Image src={recommendedClinic.images[0]} alt={recommendedClinic.name} fill className="object-cover" />
                    <div className="absolute top-3 left-3">
                      <span className="bg-[#907EFF] text-white text-xs font-semibold px-2.5 py-1 rounded-full">Top match</span>
                    </div>
                    {recommendedClinic.match_percentage != null && recommendedClinic.match_percentage > 0 && (
                      <div className="absolute top-3 right-3">
                        <span className="bg-white/90 backdrop-blur-sm text-[#907EFF] text-xs font-bold px-2.5 py-1 rounded-full">
                          {recommendedClinic.match_percentage}% match
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-5 space-y-4">
                  {!recommendedClinic.images?.[0] && (
                    <span className="bg-[#907EFF] text-white text-xs font-semibold px-2.5 py-1 rounded-full">Top match</span>
                  )}

                  <h3 className="text-xl font-bold text-[#323141]">{recommendedClinic.name}</h3>

                  {/* Trust row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[#323141]/70">
                    {recommendedClinic.rating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-medium">{recommendedClinic.rating.toFixed(1)}</span>
                        {recommendedClinic.review_count > 0 && (
                          <span className="text-muted-foreground">({recommendedClinic.review_count})</span>
                        )}
                      </span>
                    )}
                    {recommendedClinic.distance_miles != null && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {recommendedClinic.distance_miles.toFixed(1)} miles
                      </span>
                    )}
                    {getAvailabilityLabel(recommendedClinic) && (
                      <span className="flex items-center gap-1 text-green-600">
                        <Clock className="w-3.5 h-3.5" />
                        {getAvailabilityLabel(recommendedClinic)}
                      </span>
                    )}
                    {recommendedClinic.verified && (
                      <span className="flex items-center gap-1 text-[#907EFF]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    )}
                  </div>

                  {/* Why matched */}
                  {recommendedClinic.match_reasons_composed && recommendedClinic.match_reasons_composed.length > 0 && (
                    <div className="bg-[#f8f5ff] rounded-xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-[#907EFF] uppercase tracking-wide">Why we matched you</p>
                      <ul className="space-y-1.5">
                        {recommendedClinic.match_reasons_composed.slice(0, 3).map((reason, i) => (
                          <li key={i} className="text-sm text-[#323141]/80 flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#907EFF] flex-shrink-0 mt-0.5" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Primary CTA */}
                  <Button
                    className="w-full bg-[#907EFF] hover:bg-[#7C6AE8] text-white h-11 text-base font-semibold rounded-xl"
                    onClick={() => setShowBookingDialog(true)}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Book appointment
                  </Button>

                  {/* Conversation preview / messaging prompt */}
                  {(() => {
                    const heroConv = inboxConversations.find((c) => c.clinic_id === recommendedClinic.id)
                    if (heroConv && heroConv.latest_message) {
                      const isClinicWaiting = heroConv.latest_message_sender === "clinic" || heroConv.latest_message_sender === "bot"
                      return (
                        <button
                          onClick={() => openConversationForClinic(recommendedClinic.id)}
                          className="w-full text-left"
                        >
                          <div className="bg-[#f8f7f4] rounded-xl p-3.5 space-y-2.5 hover:bg-[#f0eef4] transition-colors">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-[#323141]/70">
                                {isClinicWaiting ? "Waiting for your reply" : "Continue messaging"}
                              </p>
                              {heroConv.unread_count_patient > 0 && (
                                <span className="bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full inline-flex items-center justify-center">
                                  {heroConv.unread_count_patient}
                                </span>
                              )}
                            </div>
                            {/* Mini message preview */}
                            <div className="flex items-start gap-2.5">
                              <div className="h-6 w-6 rounded-full bg-[#907EFF]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-[9px] font-semibold text-[#907EFF]">
                                  {heroConv.latest_message_sender === "patient" ? "You" : (recommendedClinic.name.charAt(0))}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-[#323141]/50 mb-0.5">
                                  {heroConv.latest_message_sender === "patient" ? "You" : heroConv.latest_message_sender === "bot" ? "Pearlie" : recommendedClinic.name}
                                </p>
                                <p className="text-sm text-[#323141]/80 line-clamp-2">{heroConv.latest_message}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-0.5">
                              <span className="text-xs text-muted-foreground">
                                {heroConv.last_message_at ? format(new Date(heroConv.last_message_at), "h:mm a") : ""}
                              </span>
                              <span className="text-xs font-semibold text-[#907EFF] flex items-center gap-1">
                                Reply <ChevronRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        </button>
                      )
                    }
                    // No existing conversation — show start prompt
                    return (
                      <button
                        onClick={() => openConversationForClinic(recommendedClinic.id)}
                        className="w-full text-left"
                      >
                        <div className="bg-[#f8f7f4] rounded-xl p-3.5 hover:bg-[#f0eef4] transition-colors flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <MessageCircle className="w-4 h-4 text-[#907EFF]" />
                            <div>
                              <p className="text-sm font-medium text-[#323141]/80">Have a question first?</p>
                              <p className="text-xs text-muted-foreground">Message the clinic before booking</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#907EFF]" />
                        </div>
                      </button>
                    )
                  })()}

                  <Link
                    href={recommendedClinic.slug ? `/clinic/${recommendedClinic.slug}` : `/match/${latestMatch.id}`}
                    className="text-xs text-[#907EFF] hover:underline block text-center"
                  >
                    View full profile
                  </Link>
                </div>
              </Card>
            </div>
          ) : (
            <Link href={`/match/${latestMatch.id}`}>
              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer border-[#907EFF]/20 bg-gradient-to-br from-white to-[#f8f5ff]">
                <span className="text-xs font-medium text-[#907EFF] bg-[#907EFF]/10 px-2 py-0.5 rounded-full">Your latest match</span>
                <p className="font-semibold text-[#323141] text-lg mt-2">{latestMatchLead?.treatment_interest || "Dental enquiry"}</p>
                <p className="text-sm text-[#907EFF] font-medium mt-1">View your {latestMatch.clinic_ids?.length || 0} matched clinics →</p>
              </Card>
            </Link>
          )}

          {/* ─── OTHER CLINICS ────────────────────────────────── */}
          {otherClinics.length > 0 && latestMatch && (
            <section>
              <button
                onClick={() => setShowOtherClinics(!showOtherClinics)}
                className="flex items-center justify-between w-full text-left"
              >
                <h2 className="text-sm font-semibold text-[#323141]/70 uppercase tracking-wide">
                  Other suitable clinics ({otherClinics.length})
                </h2>
                <ChevronDown className={`w-4 h-4 text-[#323141]/50 transition-transform ${showOtherClinics ? "rotate-180" : ""}`} />
              </button>

              {!showOtherClinics ? (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {otherClinics.slice(0, 3).map((clinic) => (
                    <Link key={clinic.id} href={clinic.slug ? `/clinic/${clinic.slug}` : `/match/${latestMatch.id}`}>
                      <Card className="p-3 hover:shadow-sm transition-shadow cursor-pointer">
                        <p className="font-medium text-[#323141] text-sm truncate">{clinic.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {clinic.distance_miles != null ? `${clinic.distance_miles.toFixed(1)} miles` : clinic.postcode}
                        </p>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {otherClinics.map((clinic) => (
                    <Card key={clinic.id} className="p-3 hover:shadow-sm transition-shadow cursor-pointer">
                      <div className="flex items-center justify-between">
                        <Link href={clinic.slug ? `/clinic/${clinic.slug}` : `/match/${latestMatch.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                          {clinic.images?.[0] ? (
                            <div className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-100">
                              <Image src={clinic.images[0]} alt={clinic.name} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-[#907EFF]/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-[#907EFF]">{clinic.name.charAt(0)}</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-[#323141] text-sm truncate">{clinic.name}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              {clinic.distance_miles != null && <span>{clinic.distance_miles.toFixed(1)} mi</span>}
                              {clinic.rating > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{clinic.rating.toFixed(1)}
                                </span>
                              )}
                              {getAvailabilityLabel(clinic) && <span className="text-green-600">{getAvailabilityLabel(clinic)}</span>}
                            </div>
                          </div>
                        </Link>
                        <button
                          onClick={() => openConversationForClinic(clinic.id)}
                          className="text-xs text-[#907EFF] hover:underline flex-shrink-0 ml-2"
                        >
                          Message
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {otherClinics.length > 3 && !showOtherClinics && (
                <button onClick={() => setShowOtherClinics(true)} className="mt-2 text-sm text-[#907EFF] hover:underline">
                  View all {otherClinics.length} clinics
                </button>
              )}
            </section>
          )}

          {/* ─── MATCH HISTORY ────────────────────────────────── */}
          {data?.matches && data.matches.length > 0 && (
            <section>
              <button
                onClick={() => setShowMatchHistory(!showMatchHistory)}
                className="flex items-center justify-between w-full text-left"
              >
                <h2 className="text-sm font-semibold text-[#323141]/50 uppercase tracking-wide">Match history</h2>
                <ChevronDown className={`w-4 h-4 text-[#323141]/30 transition-transform ${showMatchHistory ? "rotate-180" : ""}`} />
              </button>

              {showMatchHistory && (
                <div className="mt-2 space-y-1">
                  {data.matches.map((match) => {
                    const lead = data.leads.find((l) => l.id === match.lead_id)
                    return (
                      <Link key={match.id} href={`/match/${match.id}`}>
                        <Card className="px-3 py-2 hover:shadow-sm transition-shadow cursor-pointer">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground text-xs w-14 flex-shrink-0">
                                {new Date(match.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                              </span>
                              <span className="text-[#323141] font-medium truncate">{lead?.treatment_interest || "Dental enquiry"}</span>
                              <span className="text-xs text-muted-foreground flex-shrink-0">{match.clinic_ids?.length || 0} matched</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        </Card>
                      </Link>
                    )
                  })}
                  {hasMoreMatches && (
                    <button onClick={loadMoreMatches} disabled={loadingMoreMatches} className="text-xs text-[#907EFF] hover:underline mt-1">
                      {loadingMoreMatches ? "Loading..." : "Load more"}
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {/* New search */}
          <div className="text-center pt-2 pb-4">
            <Button asChild variant="outline" size="sm" className="rounded-2xl text-sm">
              <Link href="/intake">
                <Search className="w-3.5 h-3.5 mr-1.5" />
                Start a new search
              </Link>
            </Button>
          </div>
        </div>

        {/* ══════ RIGHT COLUMN: Inbox ══════ */}
        {/* Desktop: always visible. Mobile: overlay when toggled. */}
        <div className={`
          lg:w-[42%] lg:border-l lg:flex lg:flex-col lg:relative lg:bg-white
          ${mobileInboxOpen
            ? "fixed inset-0 z-40 bg-white flex flex-col"
            : "hidden lg:flex"
          }
        `} style={{ height: "calc(100vh - 57px)" }}>

          {/* Mobile back button */}
          {mobileInboxOpen && (
            <div className="lg:hidden flex items-center gap-2 px-4 py-3 border-b">
              <button onClick={() => setMobileInboxOpen(false)} className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <span className="font-semibold text-[#323141]">Messages</span>
              {totalUnread > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full inline-flex items-center justify-center">
                  {totalUnread}
                </span>
              )}
            </div>
          )}

          {/* Inbox list (top portion) */}
          <div className="border-b flex-shrink-0 max-h-[35%] overflow-y-auto">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-[#323141] text-sm">Inbox</h2>
                {totalUnread > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full inline-flex items-center justify-center">
                    {totalUnread}
                  </span>
                )}
              </div>
              <Link href="/patient/messages" className="text-xs text-[#907EFF] hover:underline">
                Full inbox
              </Link>
            </div>

            {inboxConversations.length === 0 ? (
              <div className="px-4 pb-4 text-center">
                <MessageCircle className="w-8 h-8 text-[#ccc] mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Questions before booking? Message the clinic here.</p>
              </div>
            ) : (
              <div>
                {inboxConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full text-left px-4 py-2.5 hover:bg-[#f8f7f4] transition-colors flex items-center gap-2.5 ${
                      selectedConvId === conv.id ? "bg-[#f8f5ff] border-l-2 border-[#907EFF]" : ""
                    }`}
                  >
                    <div className="h-8 w-8 rounded-full bg-[#907EFF] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-semibold">
                        {(conv.clinics?.name || "C").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate ${conv.unread_by_patient ? "font-semibold text-[#323141]" : "font-medium text-[#323141]/80"}`}>
                          {conv.clinics?.name || "Clinic"}
                        </p>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                          {conv.last_message_at ? format(new Date(conv.last_message_at), "h:mm a") : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted-foreground truncate pr-2">
                          {conv.latest_message || "No messages yet"}
                        </p>
                        {conv.unread_by_patient && conv.unread_count_patient > 0 && (
                          <span className="bg-red-500 text-white text-[9px] font-bold min-w-[14px] h-3.5 px-1 rounded-full inline-flex items-center justify-center flex-shrink-0">
                            {conv.unread_count_patient}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chat thread (bottom portion) */}
          <div className="flex-1 flex flex-col min-h-0">
            {!selectedConv ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p className="text-sm">Select a conversation</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-[#907EFF] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[10px] font-semibold">
                        {(selectedConv.clinics?.name || "C").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <p className="font-semibold text-[#323141] text-sm truncate">{selectedConv.clinics?.name || "Clinic"}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/patient/messages?conversationId=${selectedConv.id}`}
                      className="text-xs text-[#907EFF] hover:underline"
                    >
                      Full view
                    </Link>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 px-4 py-3" ref={scrollAreaRef}>
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-[#907EFF]" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No messages yet. Send the first message!</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_type === "patient" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${
                              msg.sender_type === "patient"
                                ? "bg-[#907EFF] text-white rounded-br-sm"
                                : msg.sender_type === "bot"
                                ? "bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-100 rounded-bl-sm"
                                : "bg-[#f0f0f0] rounded-bl-sm"
                            }`}
                          >
                            <p className={`text-sm whitespace-pre-wrap ${msg.sender_type === "bot" ? "text-neutral-600" : ""}`}>
                              {msg.content}
                            </p>
                            {msg.sender_type === "bot" && (
                              <p className="text-[9px] text-purple-400/70 mt-0.5 italic">Automated</p>
                            )}
                            <p className={`text-[10px] mt-0.5 ${
                              msg.sender_type === "patient" ? "text-white/60" : "text-muted-foreground"
                            }`}>
                              {format(new Date(msg.created_at), "h:mm a")}
                            </p>
                          </div>
                        </div>
                      ))}
                      {otherTyping && (
                        <div className="flex justify-start">
                          <div className="bg-[#f0f0f0] rounded-2xl rounded-bl-sm px-4 py-2">
                            <span className="text-sm text-muted-foreground animate-pulse">typing...</span>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Quick prompts */}
                <div className="flex gap-1.5 px-4 py-2 overflow-x-auto flex-shrink-0 border-t">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setNewMessage(prompt)}
                      className="text-[11px] text-[#907EFF] border border-[#907EFF]/30 rounded-full px-2.5 py-1 hover:bg-[#907EFF]/5 transition-colors whitespace-nowrap flex-shrink-0"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* Composer */}
                <form onSubmit={handleSend} className="flex gap-2 px-4 py-3 border-t flex-shrink-0">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 text-sm"
                    disabled={isSending}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!newMessage.trim() || isSending}
                    className="bg-[#907EFF] hover:bg-[#7C6AE8] text-white h-9 w-9"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Booking dialog */}
      {showBookingDialog && recommendedClinic && latestMatchLead && (
        <BookingDialog
          leadId={latestMatch!.lead_id}
          clinicId={recommendedClinic.id}
          patientName={`${latestMatchLead.first_name} ${latestMatchLead.last_name}`}
          onClose={() => setShowBookingDialog(false)}
          onSuccess={() => {
            setShowBookingDialog(false)
            fetchDashboard()
          }}
        />
      )}
    </div>
  )
}
