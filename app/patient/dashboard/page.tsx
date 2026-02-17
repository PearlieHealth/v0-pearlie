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
  MessageCircle,
  LogOut,
  Search,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Send,
  ArrowLeft,
  X,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useChatChannel, type RealtimeMessage } from "@/hooks/use-chat-channel"
import { BookingCard } from "@/components/match/booking-card"
import { OtherClinicCard } from "@/components/match/other-clinic-card"
import { useIsMobile } from "@/components/ui/use-mobile"
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer"

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
  treatments: string[]
  price_range: string
  description: string
  website?: string
  latitude?: number
  longitude?: number
  images?: string[]
  verified?: boolean
  accepts_nhs?: boolean
  wheelchair_accessible?: boolean
  parking_available?: boolean
  distance_miles?: number
  match_percentage?: number
  match_reasons?: string[]
  match_reasons_composed?: string[]
  match_breakdown?: Array<{
    category: string
    points: number
    maxPoints: number
  }>
  tier?: string
  card_title?: string
  is_directory_listing?: boolean
  is_emergency?: boolean
  offers_free_consultation?: boolean
  highlight_chips?: string[]
  available_days?: string[]
  available_hours?: string[]
  accepts_same_day?: boolean
  languages_spoken?: string[]
  opening_hours?: Record<string, any>
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

  // Clinic data for booking card
  const [allClinics, setAllClinics] = useState<ClinicInfo[]>([])
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null)
  const [showOtherClinics, setShowOtherClinics] = useState(false)
  const [loadingClinics, setLoadingClinics] = useState(false)
  const [showMatchHistory, setShowMatchHistory] = useState(false)
  const [loadingMoreMatches, setLoadingMoreMatches] = useState(false)
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null)

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

  // Mobile: chat drawer state
  const isMobile = useIsMobile()
  const [mobileChatOpen, setMobileChatOpen] = useState(false)

  // Mobile: sticky bar visibility — tracks when CTAs scroll out of view
  const ctaRef = useRef<HTMLDivElement | null>(null)
  const [showStickyBar, setShowStickyBar] = useState(false)

  // "Pending chat" — when user clicks message on a clinic with no conversation yet.
  // We show the chat UI with this clinicId+leadId so they can type, and the
  // conversation is created lazily when they actually send the first message.
  const [pendingChatClinic, setPendingChatClinic] = useState<{
    clinicId: string
    clinicName: string
    leadId: string
  } | null>(null)

  const selectedConv = inboxConversations.find((c) => c.id === selectedConvId) || null

  // Derived: selected clinic and other clinics
  const selectedClinic = allClinics.find((c) => c.id === selectedClinicId) || null
  const otherClinics = allClinics.filter((c) => c.id !== selectedClinicId)
  const isTopMatch = selectedClinicId === allClinics[0]?.id
  const latestMatch = data?.matches?.[0] || null
  const latestMatchLead = latestMatch ? data?.leads?.find((l) => l.id === latestMatch.lead_id) : null
  const activeLeadId = latestMatch?.lead_id || null

  // Are we in a "pending chat" (no conversation yet)?
  const isInPendingChat = pendingChatClinic !== null && selectedConvId === null

  // ── Data fetching ────────────────────────────────────────────

  useEffect(() => {
    fetchDashboard()
  }, [])

  async function fetchDashboard() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/patient/login?next=/patient/dashboard"); return }

      const res = await fetch(`/api/patient/matches?matchesLimit=${PAGE_SIZE}&convsLimit=${PAGE_SIZE}`)
      if (!res.ok) {
        if (res.status === 401) { router.replace("/patient/login?next=/patient/dashboard"); return }
        throw new Error("Failed to load dashboard")
      }

      const dashboardData = await res.json()
      setData(dashboardData)

      const latest = dashboardData.matches?.[0]
      if (latest) fetchClinicDetails(latest.id)

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
          // Prefer verified matched clinics
          const verified = clinics.filter(
            (c: ClinicInfo) => c.tier !== "directory" && c.tier !== "nearby" && !c.is_directory_listing
          )
          const clinicsToUse = verified.length > 0 ? verified : clinics
          setAllClinics(clinicsToUse)
          setSelectedClinicId(clinicsToUse[0]?.id || null)
          setActiveMatchId(matchId)
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

  const fetchConvMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/patient/conversations/${convId}/messages`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
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
    if (selectedConvId) {
      setPendingChatClinic(null) // Clear pending state when a real conv is selected
      fetchConvMessages(selectedConvId)
    }
  }, [selectedConvId, fetchConvMessages])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Mobile: observe CTA buttons to show/hide sticky bottom bar
  useEffect(() => {
    if (!isMobile) { setShowStickyBar(false); return }
    const el = ctaRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [isMobile, selectedClinic])

  // ── Real-time chat ───────────────────────────────────────────

  const handleNewRealtimeMessage = useCallback((msg: RealtimeMessage) => {
    if (msg.conversation_id !== selectedConvId) {
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
    if (!newMessage.trim() || isSending) return

    // Determine clinicId and leadId for the send request.
    // Either from an existing conversation or from a pending chat.
    let clinicId: string | null = null
    let leadId: string | null = null

    if (selectedConv) {
      clinicId = selectedConv.clinic_id
      leadId = selectedConv.lead_id
    } else if (pendingChatClinic) {
      clinicId = pendingChatClinic.clinicId
      leadId = pendingChatClinic.leadId
    }

    if (!clinicId || !leadId) return

    setIsSending(true)
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          clinicId,
          content: newMessage.trim(),
          senderType: "patient",
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [...prev, data.message])
        setNewMessage("")

        // If this was a pending chat (first message), the backend created
        // the conversation. We need to update our state.
        if (pendingChatClinic && data.conversationId) {
          const newConvId = data.conversationId
          setPendingChatClinic(null)
          setSelectedConvId(newConvId)

          // Re-fetch inbox to include the new conversation
          fetchInbox()
        }

        // Update inbox preview for existing conversations
        if (selectedConv) {
          setInboxConversations((prev) =>
            prev.map((c) =>
              c.id === selectedConv.id
                ? { ...c, latest_message: newMessage.trim().substring(0, 100), latest_message_sender: "patient", last_message_at: new Date().toISOString() }
                : c
            )
          )
        }

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
      // Existing conversation — select it
      setSelectedConvId(conv.id)
      setPendingChatClinic(null)
    } else {
      // No conversation yet — enter pending chat mode.
      // Conversation will be created when they send their first message.
      const clinic = allClinics.find((c) => c.id === clinicId)
      if (clinic && activeLeadId) {
        setPendingChatClinic({
          clinicId: clinic.id,
          clinicName: clinic.name,
          leadId: activeLeadId,
        })
        setSelectedConvId(null)
        setMessages([])
      }
    }

    // Mobile: open chat drawer; Desktop: open sidebar inbox
    if (isMobile) {
      setMobileChatOpen(true)
    } else {
      setMobileInboxOpen(true)
    }
  }

  function handleSelectClinic(clinicId: string) {
    setSelectedClinicId(clinicId)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleMessageClick = useCallback(() => {
    if (selectedClinicId) openConversationForClinic(selectedClinicId)
  }, [selectedClinicId, inboxConversations, allClinics, activeLeadId, isMobile])

  const totalUnread = inboxConversations.reduce((sum, c) => sum + (c.unread_count_patient || 0), 0)
  const hasMoreMatches = data ? data.matches.length < (data.matchesTotal || 0) : false

  function formatTime(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    } catch { return "" }
  }

  // The name to show in the chat header
  const chatHeaderName = selectedConv
    ? (selectedConv.clinics?.name || "Clinic")
    : pendingChatClinic
      ? pendingChatClinic.clinicName
      : null

  const chatHeaderImage = selectedConv?.clinics?.images?.[0] || null

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
              Hi{data?.user?.name ? `, ${data.user.name.split(" ")[0]}` : ""} <span className="text-[#323141]/30 mx-1">&middot;</span> {data?.user?.email}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile inbox toggle */}
            <button
              onClick={() => {
                if (isMobile) {
                  // On mobile: open chat drawer. Select most recent conversation if none selected.
                  if (!selectedConvId && !pendingChatClinic && inboxConversations.length > 0) {
                    setSelectedConvId(inboxConversations[0].id)
                  }
                  setMobileChatOpen(true)
                } else {
                  setMobileInboxOpen(!mobileInboxOpen)
                }
              }}
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
            {/* Sign out — desktop: icon + text, mobile: avatar initial */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="sm:hidden h-7 w-7 rounded-full bg-[#907EFF] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-semibold">
                  {(data?.user?.name || data?.user?.email || "U").charAt(0).toUpperCase()}
                </span>
              </div>
              <LogOut className="w-4 h-4 hidden sm:block" />
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
                {latestMatchLead.postcode && <> <span className="text-[#323141]/30">&middot;</span> {latestMatchLead.postcode}</>}
              </p>
              <Link href="/intake" className="text-xs text-[#907EFF] hover:underline flex-shrink-0">
                New search
              </Link>
            </div>
          )}

          {/* ─── HERO: Booking Card for selected clinic ──────────── */}
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
          ) : loadingClinics && !selectedClinic ? (
            <Card className="p-10 flex flex-col items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#907EFF] mb-3" />
              <p className="text-sm text-muted-foreground">Finding your best match...</p>
            </Card>
          ) : selectedClinic ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#907EFF]" />
                <h2 className="text-sm font-semibold text-[#323141]/70 uppercase tracking-wide">
                  {isTopMatch ? "Recommended for you" : "Selected clinic"}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground -mt-1">
                {isTopMatch
                  ? "Chosen based on availability, distance, and fit for your needs"
                  : "Click another clinic below to switch back"}
              </p>

              <BookingCard
                clinic={selectedClinic}
                isTopMatch={isTopMatch}
                onMessageClick={handleMessageClick}
                ctaRef={ctaRef}
              />
            </div>
          ) : latestMatch ? (
            <Link href={`/match/${latestMatch.id}`}>
              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer border-[#907EFF]/20 bg-gradient-to-br from-white to-[#f8f5ff]">
                <span className="text-xs font-medium text-[#907EFF] bg-[#907EFF]/10 px-2 py-0.5 rounded-full">Your latest match</span>
                <p className="font-semibold text-[#323141] text-lg mt-2">{latestMatchLead?.treatment_interest || "Dental enquiry"}</p>
                <p className="text-sm text-[#907EFF] font-medium mt-1">View your {latestMatch.clinic_ids?.length || 0} matched clinics &rarr;</p>
              </Card>
            </Link>
          ) : null}

          {/* ─── OTHER CLINICS (click to swap) ─────────────────── */}
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
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {otherClinics.slice(0, 4).map((clinic) => (
                    <OtherClinicCard
                      key={clinic.id}
                      clinic={clinic}
                      isSelected={clinic.id === selectedClinicId}
                      onClick={() => handleSelectClinic(clinic.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {otherClinics.map((clinic) => (
                    <OtherClinicCard
                      key={clinic.id}
                      clinic={clinic}
                      isSelected={clinic.id === selectedClinicId}
                      onClick={() => handleSelectClinic(clinic.id)}
                    />
                  ))}
                </div>
              )}

              {otherClinics.length > 4 && !showOtherClinics && (
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
                <h2 className="text-sm font-semibold text-[#323141]/50 uppercase tracking-wide">
                  Match history ({data.matchesTotal || data.matches.length})
                </h2>
                <ChevronDown className={`w-4 h-4 text-[#323141]/30 transition-transform ${showMatchHistory ? "rotate-180" : ""}`} />
              </button>

              {showMatchHistory && (
                <div className="mt-2 space-y-1">
                  {data.matches.map((match) => {
                    const lead = data.leads.find((l) => l.id === match.lead_id)
                    const isCurrent = match.id === activeMatchId
                    return (
                      <Card
                        key={match.id}
                        className={`px-3 py-2 hover:shadow-sm transition-shadow cursor-pointer ${isCurrent ? "border-[#907EFF]/30 bg-[#f8f5ff]/50" : ""}`}
                        onClick={() => {
                          if (!isCurrent) fetchClinicDetails(match.id)
                        }}
                      >
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-muted-foreground text-xs w-14 flex-shrink-0">
                              {new Date(match.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </span>
                            <span className="text-[#323141] font-medium truncate">{lead?.treatment_interest || "Dental enquiry"}</span>
                            <span className="text-xs text-muted-foreground flex-shrink-0">{match.clinic_ids?.length || 0} matched</span>
                            {isCurrent && <span className="text-[10px] text-[#907EFF] font-medium flex-shrink-0">Current</span>}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </Card>
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
        <div className={`
          lg:w-[42%] lg:border-l lg:border-border/60 lg:flex lg:flex-col lg:relative lg:bg-[#f8f7f4]
          ${mobileInboxOpen
            ? "fixed inset-0 z-40 bg-[#f8f7f4] flex flex-col"
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
          <div className="border-b border-border/60 flex-shrink-0 max-h-[35%] overflow-y-auto">
            <div className="px-4 py-3 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#907EFF]" />
                <h2 className="font-semibold text-[#323141] text-sm">Messages</h2>
                {totalUnread > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full inline-flex items-center justify-center">
                    {totalUnread}
                  </span>
                )}
              </div>
            </div>

            {inboxConversations.length === 0 && !isInPendingChat ? (
              <div className="px-4 pb-4 text-center">
                <MessageCircle className="w-8 h-8 text-[#ccc] mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Questions before booking? Message the clinic here.</p>
              </div>
            ) : (
              <div>
                {/* Show pending chat as a virtual conversation entry */}
                {isInPendingChat && pendingChatClinic && (
                  <button
                    className="w-full text-left px-4 py-2.5 bg-[#f8f5ff] border-l-2 border-[#907EFF] flex items-center gap-2.5"
                  >
                    <div className="h-8 w-8 rounded-full bg-[#907EFF] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-semibold">
                        {pendingChatClinic.clinicName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#323141] truncate">{pendingChatClinic.clinicName}</p>
                      <p className="text-xs text-muted-foreground">New conversation</p>
                    </div>
                  </button>
                )}

                {inboxConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConvId(conv.id)
                      setPendingChatClinic(null)
                    }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-[#f8f7f4] transition-colors flex items-center gap-2.5 ${
                      selectedConvId === conv.id && !isInPendingChat ? "bg-[#f8f5ff] border-l-2 border-[#907EFF]" : ""
                    }`}
                  >
                    {conv.clinics?.images?.[0] ? (
                      <div className="relative h-8 w-8 rounded-full overflow-hidden flex-shrink-0 bg-neutral-100">
                        <Image src={conv.clinics.images[0]} alt={conv.clinics.name || "Clinic"} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-[#907EFF] flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-semibold">
                          {(conv.clinics?.name || "C").charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate ${conv.unread_by_patient ? "font-semibold text-[#323141]" : "font-medium text-[#323141]/80"}`}>
                          {conv.clinics?.name || "Clinic"}
                        </p>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                          {conv.last_message_at ? formatTime(conv.last_message_at) : ""}
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
            {!selectedConv && !isInPendingChat ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p className="text-sm">Select a conversation</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {chatHeaderImage ? (
                      <div className="relative h-7 w-7 rounded-full overflow-hidden flex-shrink-0 bg-neutral-100">
                        <Image src={chatHeaderImage} alt={chatHeaderName || "Clinic"} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-[#907EFF] flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[10px] font-semibold">
                          {(chatHeaderName || "C").charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <p className="font-semibold text-[#323141] text-sm truncate">{chatHeaderName || "Clinic"}</p>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 px-4 py-3" ref={scrollAreaRef}>
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-[#907EFF]" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                      <MessageCircle className="w-8 h-8 text-[#ccc] mx-auto" />
                      <p className="text-sm font-medium text-[#323141]/70">
                        Chat with {chatHeaderName || "the clinic"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ask any questions or request an appointment.
                      </p>
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
                                ? "bg-[#f5f3ff] border border-[#e9e5f5] rounded-bl-sm"
                                : "bg-[#f0f0f0] rounded-bl-sm"
                            }`}
                          >
                            {msg.sender_type === "bot" && (
                              <p className="text-[9px] text-[#907EFF]/60 mb-0.5 flex items-center gap-1">
                                <Heart className="w-2.5 h-2.5 fill-[#907EFF]/40 text-[#907EFF]/40" />
                                Pearlie
                              </p>
                            )}
                            <p className={`text-sm whitespace-pre-wrap ${msg.sender_type === "bot" ? "text-[#323141]/70" : ""}`}>
                              {msg.content}
                            </p>
                            <p className={`text-[10px] mt-0.5 ${
                              msg.sender_type === "patient" ? "text-white/60" : "text-muted-foreground"
                            }`}>
                              {formatTime(msg.created_at)}
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
                <div className="flex gap-1.5 px-4 py-2 overflow-x-auto flex-shrink-0 border-t border-border/40">
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
                <form onSubmit={handleSend} className="flex gap-2 px-4 py-3 border-t border-border/40 flex-shrink-0">
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

      {/* ══════ MOBILE: Chat Bottom Sheet Drawer ══════ */}
      {isMobile && (
        <Drawer open={mobileChatOpen} onOpenChange={setMobileChatOpen}>
          <DrawerContent className="!max-h-[80vh] !h-[80vh] !mt-0 flex flex-col rounded-t-2xl">
            {/* Drag handle is built into DrawerContent */}
            <DrawerTitle className="sr-only">Chat with {chatHeaderName || "clinic"}</DrawerTitle>

            {/* Header */}
            <div className="flex-shrink-0 border-b border-border/40 px-4 pt-1 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  {chatHeaderImage ? (
                    <div className="relative h-8 w-8 rounded-full overflow-hidden flex-shrink-0 bg-neutral-100">
                      <Image src={chatHeaderImage} alt={chatHeaderName || "Clinic"} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-[#907EFF] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-semibold">
                        {(chatHeaderName || "C").charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate text-left">{chatHeaderName || "Clinic"}</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileChatOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 -mr-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[#907EFF]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <MessageCircle className="w-8 h-8 text-[#ccc] mx-auto" />
                  <p className="text-sm font-medium text-[#323141]/70">
                    Chat with {chatHeaderName || "the clinic"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ask any questions or request an appointment.
                  </p>
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
                            ? "bg-[#f5f3ff] border border-[#e9e5f5] rounded-bl-sm"
                            : "bg-[#f0f0f0] rounded-bl-sm"
                        }`}
                      >
                        {msg.sender_type === "bot" && (
                          <p className="text-[9px] text-[#907EFF]/60 mb-0.5 flex items-center gap-1">
                            <Heart className="w-2.5 h-2.5 fill-[#907EFF]/40 text-[#907EFF]/40" />
                            Pearlie
                          </p>
                        )}
                        <p className={`text-sm whitespace-pre-wrap ${msg.sender_type === "bot" ? "text-[#323141]/70" : ""}`}>
                          {msg.content}
                        </p>
                        <p className={`text-[10px] mt-0.5 ${
                          msg.sender_type === "patient" ? "text-white/60" : "text-muted-foreground"
                        }`}>
                          {formatTime(msg.created_at)}
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
            </div>

            {/* Quick prompts */}
            <div className="flex gap-1.5 px-4 py-2 overflow-x-auto flex-shrink-0 border-t border-border/40">
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
            <form onSubmit={handleSend} className="flex gap-2 px-4 py-3 border-t border-border/40 flex-shrink-0 pb-6">
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
          </DrawerContent>
        </Drawer>
      )}

      {/* ══════ MOBILE: Sticky Bottom Action Bar ══════ */}
      {isMobile && showStickyBar && selectedClinic && !mobileChatOpen && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-sm border-t border-border/60 px-4 py-3 pb-6">
          <Button
            className="w-full h-10 bg-gradient-to-r from-[#907EFF] to-[#ED64A6] text-white border-0 font-semibold text-sm"
            onClick={handleMessageClick}
          >
            <MessageCircle className="w-4 h-4 mr-1.5" />
            Message clinic
          </Button>
        </div>
      )}

    </div>
  )
}
