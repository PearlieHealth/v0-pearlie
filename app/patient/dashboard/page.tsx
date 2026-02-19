"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
// ScrollArea removed — desktop messages use plain overflow-y-auto div for reliable scroll
import {
  Heart,
  Loader2,
  MessageCircle,
  LogOut,
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Send,
  ArrowLeft,
  X,
  CalendarCheck,
  Inbox,
  MapPin,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useChatChannel, usePatientConversationUpdates, type RealtimeMessage } from "@/hooks/use-chat-channel"
import { BookingCard } from "@/components/match/booking-card"
import { OtherClinicCard } from "@/components/match/other-clinic-card"
import { useIsMobile } from "@/components/ui/use-mobile"

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
  appointment_requested_at?: string | null
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
  "How much is a checkup and hygiene?",
  "Do you offer payment plans?",
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
  const [clinicProviders, setClinicProviders] = useState<Array<{ id: string; name: string; photo_url: string | null; bio?: string | null; education?: { degree: string; institution: string }[]; certifications?: { name: string; date?: string }[] }>>([])

  // Inbox state
  const [inboxConversations, setInboxConversations] = useState<Conversation[]>([])
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [botTyping, setBotTyping] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [mobileInboxOpen, setMobileInboxOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const mobileMessagesRef = useRef<HTMLDivElement>(null)
  // Bot message IDs that are queued for delayed display — realtime should ignore these
  const delayedBotMsgIds = useRef<Set<string>>(new Set())
  // Skip the next auto-fetch when we just created the conversation ourselves
  const skipNextConvFetch = useRef(false)

  // Mobile: chat drawer state
  const isMobile = useIsMobile()
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  // Mobile: full-screen inbox list (conversations overview)
  const [mobileInboxListOpen, setMobileInboxListOpen] = useState(false)

  // Desktop: collapsible right panel
  const [chatPanelCollapsed, setChatPanelCollapsed] = useState(false)

  // Mobile: sticky bar visibility — tracks when CTAs scroll out of view
  const ctaRef = useRef<HTMLDivElement | null>(null)
  const [showStickyBar, setShowStickyBar] = useState(false)

  // Derive which clinics have appointment requests from server-side conversation data.
  // This persists across sessions, devices, and logouts.
  const appointmentRequestedClinics = new Set<string>(
    inboxConversations
      .filter((c) => c.appointment_requested_at)
      .map((c) => c.clinic_id)
  )

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

      // On mobile browsers, auth cookies may still be propagating after OTP
      // verification. Retry a few times with short delays before giving up.
      let user = null
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: { user: u } } = await supabase.auth.getUser()
        if (u) { user = u; break }
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000))
        }
      }
      if (!user) { router.replace("/patient/login?next=/patient/dashboard"); return }

      // Prevent clinic users from accessing patient dashboard
      if (user.user_metadata?.role === "clinic") {
        router.replace("/clinic")
        return
      }

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
          // Fetch providers for the top clinic
          const topClinicId = clinicsToUse[0]?.id
          if (topClinicId) {
            fetch(`/api/clinic/providers?clinicId=${topClinicId}`)
              .then((r) => r.ok ? r.json() : null)
              .then((d) => { if (d?.providers) setClinicProviders(d.providers) })
              .catch(() => {})
          }
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
        const allMsgs: Message[] = data.messages || []
        // Filter out bot messages queued for delayed typing animation —
        // without this, a server re-fetch would show them instantly and
        // bypass the 3-second typing delay.
        const visible = delayedBotMsgIds.current.size > 0
          ? allMsgs.filter((m) => !delayedBotMsgIds.current.has(m.id))
          : allMsgs
        setMessages(visible)
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
      // Skip fetch when we just sent a message that created this conversation —
      // we already have the correct messages in state and a fetch would
      // replace them (including bot messages queued for delayed display).
      if (skipNextConvFetch.current) {
        skipNextConvFetch.current = false
        return
      }
      fetchConvMessages(selectedConvId)
    }
  }, [selectedConvId, fetchConvMessages])

  // Scroll chat to bottom — uses the container's scrollTop to stay within the drawer
  const scrollChatToBottom = useCallback((smooth = true) => {
    // Mobile drawer
    if (mobileMessagesRef.current) {
      const el = mobileMessagesRef.current
      if (smooth) {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
      } else {
        el.scrollTop = el.scrollHeight
      }
    }
    // Desktop sidebar
    if (scrollAreaRef.current) {
      const el = scrollAreaRef.current
      if (smooth) {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
      } else {
        el.scrollTop = el.scrollHeight
      }
    }
  }, [])

  // Auto-scroll to bottom when messages change or typing indicator shows
  useEffect(() => {
    // Small delay so DOM has rendered the new message
    const timer = setTimeout(() => scrollChatToBottom(true), 50)
    return () => clearTimeout(timer)
  }, [messages, botTyping, scrollChatToBottom])

  // Scroll to bottom when mobile drawer opens (instant, no animation)
  useEffect(() => {
    if (mobileChatOpen && messages.length > 0) {
      // Wait for drawer open animation to settle
      const timer = setTimeout(() => scrollChatToBottom(false), 200)
      return () => clearTimeout(timer)
    }
  }, [mobileChatOpen, scrollChatToBottom])

  // Lock body scroll when mobile chat is open
  useEffect(() => {
    if (!mobileChatOpen) return
    // Prevent body scroll behind the chat overlay
    const scrollY = window.scrollY
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
      window.scrollTo(0, scrollY)
    }
  }, [mobileChatOpen])

  // Mobile: observe CTA buttons to show/hide sticky bottom bar
  // Delay showing sticky bar after drawer closes to avoid overlap animation
  const [stickyBarDeferred, setStickyBarDeferred] = useState(false)
  useEffect(() => {
    if (mobileChatOpen) {
      setStickyBarDeferred(false)
      return
    }
    // Wait for drawer close animation to finish before showing sticky bar
    const timer = setTimeout(() => setStickyBarDeferred(true), 350)
    return () => clearTimeout(timer)
  }, [mobileChatOpen])

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
    // Skip bot messages that are queued for delayed display (typing animation)
    if (delayedBotMsgIds.current.has(msg.id)) return
    // Clear bot typing when a bot/clinic message arrives via realtime
    if (msg.sender_type === "bot" || msg.sender_type === "clinic") {
      setBotTyping(false)
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

  const { otherTyping, sendTyping } = useChatChannel({
    conversationId: selectedConvId,
    userType: "patient",
    onNewMessage: handleNewRealtimeMessage,
    onStatusChange: handleStatusChange,
    enabled: !!selectedConvId,
  })

  // Realtime: re-fetch inbox when any conversation for this patient changes
  usePatientConversationUpdates({
    leadId: activeLeadId,
    onUpdate: fetchInbox,
    enabled: !!activeLeadId,
  })

  // Fallback polling: re-fetch messages every 30s in case Realtime disconnects
  useEffect(() => {
    if (!selectedConvId) return
    const interval = setInterval(() => {
      fetchConvMessages(selectedConvId)
    }, 30000)
    return () => clearInterval(interval)
  }, [selectedConvId, fetchConvMessages])

  // Fallback polling: re-fetch inbox conversations every 30s so new conversations
  // and updated previews/unread counts appear without a full page refresh.
  useEffect(() => {
    const interval = setInterval(() => {
      fetchInbox()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

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
          // Skip the auto-fetch — we already have the right messages in state
          skipNextConvFetch.current = true
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

        // Handle bot auto-replies with typing indicator then message
        if (data.botMessages?.length) {
          // Register IDs so realtime handler ignores these (they'd bypass the delay)
          data.botMessages.forEach((botMsg: Message) => delayedBotMsgIds.current.add(botMsg.id))

          setBotTyping(true)
          let cumulativeDelay = 0
          data.botMessages.forEach((botMsg: Message, i: number) => {
            const typingDuration = 3000
            const gapBetween = 500
            const showAt = cumulativeDelay + typingDuration
            cumulativeDelay = showAt + gapBetween

            setTimeout(() => {
              delayedBotMsgIds.current.delete(botMsg.id)
              setBotTyping(false)
              setMessages((prev) => {
                if (prev.some((m) => m.id === botMsg.id)) return prev
                return [...prev, botMsg].sort(
                  (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )
              })
              if (i < data.botMessages.length - 1) {
                setTimeout(() => setBotTyping(true), gapBetween)
              }
            }, showAt)
          })
        }
      } else {
        const errData = await res.json().catch(() => ({}))
        if (res.status === 403) {
          setChatError("Please verify your email before sending messages.")
        } else if (res.status === 429) {
          setChatError(errData.error || "Too many messages. Please wait a moment.")
        } else {
          setChatError(errData.error || "Failed to send message.")
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err)
      setChatError("Failed to send. Please try again.")
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

  function openConversationForClinic(clinicId: string, { openDrawer = true }: { openDrawer?: boolean } = {}) {
    // Match by both clinic_id AND lead_id so we pick the right conversation
    // when a patient has multiple leads/searches with the same clinic.
    const conv = inboxConversations.find(
      (c) => c.clinic_id === clinicId && (!activeLeadId || c.lead_id === activeLeadId)
    ) || inboxConversations.find((c) => c.clinic_id === clinicId) // fallback
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

    if (openDrawer) {
      if (isMobile) {
        setMobileChatOpen(true)
      } else {
        // Desktop: expand the chat panel if it was collapsed
        setChatPanelCollapsed(false)
      }
    }
  }

  function handleSelectClinic(clinicId: string) {
    setSelectedClinicId(clinicId)
    // Sync chat state to the selected clinic. On mobile, don't auto-open
    // the chat drawer — the patient is just browsing other clinics.
    openConversationForClinic(clinicId, { openDrawer: !isMobile })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function handleMessageClick() {
    if (selectedClinicId) openConversationForClinic(selectedClinicId)
  }

  async function handleRequestAppointment(message: string) {
    if (!selectedClinicId || !activeLeadId) return

    // Block if already requested (server-side check is also in the API)
    if (appointmentRequestedClinics.has(selectedClinicId)) return

    // Open the chat UI first so the user sees it
    openConversationForClinic(selectedClinicId)

    // Send appointment request via API with messageType for server-side tracking
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: activeLeadId,
          clinicId: selectedClinicId,
          content: message,
          senderType: "patient",
          messageType: "appointment_request",
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [...prev, data.message])

        // Mark the conversation locally as having an appointment request
        // so the UI updates immediately without waiting for a re-fetch.
        setInboxConversations((prev) =>
          prev.map((c) =>
            c.clinic_id === selectedClinicId
              ? { ...c, appointment_requested_at: new Date().toISOString() }
              : c
          )
        )

        // If new conversation was created, update state
        if (data.conversationId && !inboxConversations.find((c) => c.clinic_id === selectedClinicId)) {
          // Skip the auto-fetch — we already have the right messages in state
          skipNextConvFetch.current = true
          setSelectedConvId(data.conversationId)
          setPendingChatClinic(null)
          fetchInbox() // re-fetch includes appointment_requested_at from server
        }

        // Handle bot auto-replies with typing indicator
        if (data.botMessages?.length) {
          // Register IDs so realtime handler ignores these (they'd bypass the delay)
          data.botMessages.forEach((botMsg: Message) => delayedBotMsgIds.current.add(botMsg.id))

          setBotTyping(true)
          let cumulativeDelay = 0
          data.botMessages.forEach((botMsg: Message, i: number) => {
            const typingDuration = 3000
            const gapBetween = 500
            const showAt = cumulativeDelay + typingDuration
            cumulativeDelay = showAt + gapBetween

            setTimeout(() => {
              delayedBotMsgIds.current.delete(botMsg.id)
              setBotTyping(false)
              setMessages((prev) => {
                if (prev.some((m) => m.id === botMsg.id)) return prev
                return [...prev, botMsg].sort(
                  (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )
              })
              if (i < data.botMessages.length - 1) {
                setTimeout(() => setBotTyping(true), gapBetween)
              }
            }, showAt)
          })
        }
      } else if (res.status === 409) {
        // Already requested (server-side duplicate check) — refresh inbox to sync
        fetchInbox()
      }
    } catch (err) {
      console.error("Failed to send appointment request:", err)
      setChatError("Failed to send appointment request. Please try again.")
    }
  }

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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <div className="rounded-full bg-primary p-2.5">
          <Heart className="w-5 h-5 text-white fill-white" />
        </div>
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchDashboard}>Try again</Button>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="rounded-full bg-primary p-1.5 sm:p-2">
                <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white fill-white" />
              </div>
              <span className="font-semibold text-lg sm:text-xl text-primary">Pearlie</span>
            </Link>
            <div className="hidden sm:block text-sm text-muted-foreground">
              Hi{data?.user?.name ? `, ${data.user.name.split(" ")[0]}` : ""} <span className="text-muted-foreground/50 mx-1">&middot;</span> {data?.user?.email}
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-3">
            {/* Mobile inbox toggle */}
            <button
              onClick={() => {
                if (isMobile) {
                  setMobileInboxListOpen(true)
                } else {
                  setMobileInboxOpen(!mobileInboxOpen)
                }
              }}
              className="lg:hidden relative flex items-center justify-center h-9 w-9 rounded-full hover:bg-muted/60 active:bg-muted transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-foreground/60" />
              {totalUnread > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full inline-flex items-center justify-center">
                  {totalUnread}
                </span>
              )}
            </button>
            {/* Sign out — desktop: icon + text, mobile: avatar */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="sm:hidden h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform">
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
      <div className="flex-1 max-w-[1400px] w-full mx-auto flex lg:min-h-0">

        {/* ══════ LEFT COLUMN: Your Match ══════ */}
        <div className={`flex-1 min-w-0 ${chatPanelCollapsed ? "lg:max-w-full" : "lg:max-w-[58%]"} overflow-y-auto px-3 py-4 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 transition-all duration-300`}>

          {/* ─── MOBILE: Persistent navigation buttons ──────────── */}
          {isMobile && selectedClinic && (
            <div className="sticky top-0 z-20 -mx-3 -mt-4 px-3 pt-3 pb-2 bg-background/95 backdrop-blur-sm border-b border-border/30">
              <div className="flex gap-2">
                <button
                  onClick={() => setMobileInboxListOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-white text-sm font-semibold active:scale-[0.98] transition-transform relative"
                >
                  <Inbox className="w-4 h-4" />
                  Check Inbox
                  {totalUnread > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full inline-flex items-center justify-center">
                      {totalUnread}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ─── HERO: Booking Card for selected clinic ──────────── */}
          {!latestMatch ? (
            <Card className="p-8 text-center">
              <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h2 className="font-semibold text-foreground text-lg mb-2">Find your perfect clinic</h2>
              <p className="text-muted-foreground mb-5 text-sm">
                Tell us what you need and we&apos;ll recommend the best clinic for you.
              </p>
              <Button asChild>
                <Link href="/intake">Get matched</Link>
              </Button>
            </Card>
          ) : loadingClinics && !selectedClinic ? (
            <Card className="p-10 flex flex-col items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Finding your best match...</p>
            </Card>
          ) : selectedClinic ? (
            <div className="space-y-2 sm:space-y-3">
              <BookingCard
                clinic={selectedClinic}
                isTopMatch={isTopMatch}
                onMessageClick={handleMessageClick}
                onRequestAppointment={handleRequestAppointment}
                appointmentRequested={appointmentRequestedClinics.has(selectedClinic.id)}
                ctaRef={ctaRef}
                providers={clinicProviders}
                treatmentInterest={latestMatchLead?.treatment_interest}
                postcode={latestMatchLead?.postcode}
              />
            </div>
          ) : latestMatch ? (
            <Link href={`/match/${latestMatch.id}`}>
              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer border-border bg-card">
                <span className="text-xs font-medium text-muted-foreground bg-primary px-2 py-0.5 rounded-full">Your latest match</span>
                <p className="font-semibold text-foreground text-lg mt-2">{latestMatchLead?.treatment_interest || "Dental enquiry"}</p>
                <p className="text-sm text-muted-foreground font-medium mt-1">View your {latestMatch.clinic_ids?.length || 0} matched clinics &rarr;</p>
              </Card>
            </Link>
          ) : null}

          {/* ─── OTHER CLINICS (click to swap) ─────────────────── */}
          {otherClinics.length > 0 && latestMatch && (
            <section>
              <button
                onClick={() => setShowOtherClinics(!showOtherClinics)}
                className="flex items-center justify-between w-full text-left py-2.5 px-4 rounded-xl bg-[#F8F1E7] hover:bg-[#F8F1E7]/80 transition-colors"
              >
                <h2 className="text-xs sm:text-sm font-semibold text-[#004443] uppercase tracking-wide">
                  Other clinics ({otherClinics.length})
                </h2>
                <ChevronDown className={`w-4 h-4 text-[#004443]/50 transition-transform duration-200 ${showOtherClinics ? "rotate-180" : ""}`} />
              </button>

              {!showOtherClinics ? (
                <div className="mt-2 sm:mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                <div className="mt-2 sm:mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                <button onClick={() => setShowOtherClinics(true)} className="mt-2 text-xs sm:text-sm text-muted-foreground hover:underline font-medium">
                  View all {otherClinics.length} clinics
                </button>
              )}
            </section>
          )}

          {/* Start a new search — full-width rectangle with dark teal outline */}
          {latestMatch && (
            <Link href="/intake" className="block">
              <div className="w-full bg-white rounded-2xl border border-border/30 px-5 py-4 hover:border-[#0fbcb0]/40 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#004443]">Looking for another treatment?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Start a new search to find the best clinic</p>
                </div>
                <span className="text-sm font-semibold text-[#0fbcb0] flex-shrink-0">
                  New search &rarr;
                </span>
              </div>
            </Link>
          )}

          {/* ─── MATCH HISTORY — after new search ─────────────── */}
          {data?.matches && data.matches.length > 0 && (
            <section>
              <button
                onClick={() => setShowMatchHistory(!showMatchHistory)}
                className="flex items-center justify-between w-full text-left px-5 py-3.5 rounded-2xl border border-border/30 bg-white hover:border-[#0fbcb0]/40 hover:shadow-sm transition-all"
              >
                <div>
                  <h2 className="text-sm font-semibold text-[#004443]">
                    Match history
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {data.matchesTotal || data.matches.length} previous {(data.matchesTotal || data.matches.length) === 1 ? "search" : "searches"}
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-[#004443]/50 transition-transform duration-200 ${showMatchHistory ? "rotate-180" : ""}`} />
              </button>

              {showMatchHistory && (
                <div className="mt-2 space-y-1.5">
                  {data.matches.map((match) => {
                    const lead = data.leads.find((l) => l.id === match.lead_id)
                    const isCurrent = match.id === activeMatchId
                    return (
                      <Card
                        key={match.id}
                        className={`px-3 py-2.5 hover:shadow-sm transition-all cursor-pointer active:scale-[0.99] ${isCurrent ? "border-primary bg-primary/5" : "border-border"}`}
                        onClick={() => {
                          if (!isCurrent) fetchClinicDetails(match.id)
                        }}
                      >
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <span className="text-muted-foreground text-[11px] sm:text-xs w-12 sm:w-14 flex-shrink-0">
                              {new Date(match.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </span>
                            <span className="text-foreground font-medium text-sm truncate">{lead?.treatment_interest || "Dental enquiry"}</span>
                            <span className="text-[11px] sm:text-xs text-muted-foreground flex-shrink-0">{match.clinic_ids?.length || 0} matched</span>
                            {isCurrent && <span className="text-[10px] text-[#0fbcb0] font-semibold flex-shrink-0">Current</span>}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </Card>
                    )
                  })}
                  {hasMoreMatches && (
                    <button onClick={loadMoreMatches} disabled={loadingMoreMatches} className="text-xs text-muted-foreground hover:underline mt-1 font-medium">
                      {loadingMoreMatches ? "Loading..." : "Load more"}
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Bottom padding */}
          <div className={`${isMobile && showStickyBar ? "pb-20" : "pb-4"}`} />
        </div>

        {/* ══════ Desktop collapse/expand toggle — sits between columns ══════ */}
        <button
          type="button"
          onClick={() => setChatPanelCollapsed(!chatPanelCollapsed)}
          className="hidden lg:flex items-center justify-center self-center h-8 w-5 flex-shrink-0 rounded-md bg-card border border-border shadow-sm hover:bg-muted transition-colors"
          title={chatPanelCollapsed ? "Open messages" : "Close messages"}
        >
          {chatPanelCollapsed ? (
            <ChevronLeft className="w-3.5 h-3.5 text-foreground/60" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-foreground/60" />
          )}
        </button>

        {/* ══════ RIGHT COLUMN: Inbox — collapsible on desktop ══════ */}
        <div className={`
          lg:w-[42%] lg:flex-shrink-0 lg:border-l lg:border-border/60 lg:flex lg:flex-col lg:bg-background lg:overflow-hidden
          ${mobileInboxOpen
            ? "fixed inset-0 z-40 bg-background flex flex-col"
            : chatPanelCollapsed
              ? "hidden"
              : "hidden lg:flex"
          }
        `} style={mobileInboxOpen ? { height: "100dvh", paddingTop: "57px" } : undefined}>

          {/* Mobile back button */}
          {mobileInboxOpen && (
            <div className="lg:hidden flex items-center gap-2 px-4 py-3 border-b">
              <button onClick={() => setMobileInboxOpen(false)} className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <span className="font-semibold text-foreground">Messages</span>
              {totalUnread > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full inline-flex items-center justify-center">
                  {totalUnread}
                </span>
              )}
            </div>
          )}

          {/* Inbox list (top portion) */}
          <div className="border-b border-border/60 flex-shrink-0 max-h-[35%] overflow-y-auto">
            <div className="px-4 py-3 flex items-center justify-between sticky top-0 z-10 bg-card">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground text-sm">Messages</h2>
                {totalUnread > 0 && (
                  <span className="bg-primary text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full inline-flex items-center justify-center">
                    {totalUnread}
                  </span>
                )}
              </div>
            </div>

            {inboxConversations.length === 0 && !isInPendingChat ? (
              <div className="px-4 pb-4 text-center">
                <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Questions before booking? Message the clinic here.</p>
              </div>
            ) : (
              <div className="px-3 pb-3 space-y-1.5">
                {/* Show pending chat as a virtual conversation card */}
                {isInPendingChat && pendingChatClinic && (
                  <div
                    className="p-2.5 rounded-lg border-2 border-primary bg-primary/5 flex gap-2.5 cursor-default"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">
                          {pendingChatClinic.clinicName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm font-semibold text-foreground truncate">{pendingChatClinic.clinicName}</p>
                      <p className="text-xs text-primary font-medium">New conversation</p>
                    </div>
                  </div>
                )}

                {inboxConversations.map((conv) => {
                  const isActive = selectedConvId === conv.id && !isInPendingChat
                  return (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setSelectedConvId(conv.id)
                        setPendingChatClinic(null)
                      }}
                      className={`w-full text-left p-2.5 rounded-lg transition-all duration-200 flex gap-2.5 ${
                        isActive
                          ? "border-2 border-primary bg-primary/5"
                          : "border border-border/40 hover:border-primary/40 hover:shadow-sm"
                      }`}
                    >
                      {/* Clinic image thumbnail — matches OtherClinicCard style */}
                      <div className="flex-shrink-0">
                        {conv.clinics?.images?.[0] ? (
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-muted">
                            <Image src={conv.clinics.images[0]} alt={conv.clinics.name || "Clinic"} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                            <span className="text-white text-sm font-semibold">
                              {(conv.clinics?.name || "C").charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Content */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-[13px] truncate ${conv.unread_by_patient ? "font-bold text-foreground" : "font-semibold text-foreground/80"}`}>
                            {conv.clinics?.name || "Clinic"}
                          </p>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {conv.last_message_at ? formatTime(conv.last_message_at) : ""}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground truncate pr-2 leading-snug">
                            {conv.latest_message || "No messages yet"}
                          </p>
                          {conv.unread_by_patient && conv.unread_count_patient > 0 && (
                            <span className="bg-primary text-white text-[9px] font-bold min-w-[14px] h-3.5 px-1 rounded-full inline-flex items-center justify-center flex-shrink-0">
                              {conv.unread_count_patient}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Chat thread (bottom portion) */}
          <div className="flex-1 flex flex-col min-h-0">
            {!selectedConv && !isInPendingChat ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-medium">Select a conversation</p>
              </div>
            ) : (
              <>
                {/* Chat header — shows which clinic is active */}
                <div className="px-4 py-2.5 border-b border-border/40 flex items-center justify-between flex-shrink-0 bg-card">
                  <div className="flex items-center gap-3 min-w-0">
                    {chatHeaderImage ? (
                      <div className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-muted ring-1 ring-border">
                        <Image src={chatHeaderImage} alt={chatHeaderName || "Clinic"} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-semibold">
                          {(chatHeaderName || "C").charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate leading-tight">{chatHeaderName || "Clinic"}</p>
                      <p className="text-[10px] text-primary font-medium leading-tight">Chatting now</p>
                    </div>
                  </div>
                </div>

                {/* Messages — plain scrollable div (not Radix ScrollArea,
                    which wraps content in an internal Viewport that breaks
                    ref-based scrollTo and flex height constraints) */}
                <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 bg-background" ref={scrollAreaRef}>
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
                        <MessageCircle className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-foreground/70">
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
                                ? "bg-primary text-white rounded-br-sm"
                                : msg.sender_type === "bot"
                                ? "bg-secondary border border-border rounded-bl-sm"
                                : "bg-muted rounded-bl-sm"
                            }`}
                          >
                            {msg.sender_type === "bot" && (
                              <p className="text-[9px] text-muted-foreground/60 mb-0.5 flex items-center gap-1">
                                <Heart className="w-2.5 h-2.5 fill-muted-foreground/40 text-muted-foreground/40" />
                                Pearlie AI
                              </p>
                            )}
                            <p className={`text-sm whitespace-pre-wrap ${msg.sender_type === "bot" ? "text-foreground/70" : ""}`}>
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
                      {(otherTyping || botTyping) && (
                        <div className="flex justify-start">
                          <div className="bg-secondary border border-border rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
                            <p className="text-[9px] text-muted-foreground/60 mb-1 flex items-center gap-1">
                              <Heart className="w-2.5 h-2.5 fill-muted-foreground/40 text-muted-foreground/40" />
                              Pearlie AI
                            </p>
                            <div className="flex gap-1">
                              <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                              <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                              <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
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
                      className="text-[11px] text-muted-foreground border border-border/60 rounded-full px-2.5 py-1 hover:border-primary/40 hover:text-primary transition-colors whitespace-nowrap flex-shrink-0"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* Error feedback */}
                {chatError && (
                  <div className="px-4 py-1.5 flex-shrink-0">
                    <p className="text-xs text-red-500">{chatError}</p>
                  </div>
                )}

                {/* Composer */}
                <form onSubmit={handleSend} className="flex gap-2 px-4 py-3 border-t border-border/40 flex-shrink-0">
                  <Input
                    value={newMessage}
                    onChange={(e) => { setNewMessage(e.target.value); sendTyping(); setChatError(null) }}
                    placeholder="Type a message..."
                    className="flex-1 text-sm rounded-lg border-border/60 focus-visible:ring-primary/30"
                    disabled={isSending}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!newMessage.trim() || isSending}
                    className="bg-primary hover:bg-primary/90 text-white h-9 w-9 rounded-lg"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══════ MOBILE: Chat Full-Screen Overlay ══════ */}
      {/* Plain fixed overlay instead of Vaul Drawer — avoids CSS transform
          context that breaks iOS Safari keyboard / fixed positioning */}
      {isMobile && mobileChatOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-card"
          style={{ height: "100dvh" }}
        >
          {/* Header — no transforms */}
          <div className="flex-shrink-0 border-b border-border/30 bg-card px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {chatHeaderImage ? (
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted ring-1 ring-border">
                    <Image src={chatHeaderImage} alt={chatHeaderName || "Clinic"} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-semibold">
                      {(chatHeaderName || "C").charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate text-left">{chatHeaderName || "Clinic"}</p>
                  <p className="text-[11px] text-primary font-medium">Chatting now</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileChatOpen(false)
                  // If opened from inbox list, go back to it
                  if (mobileInboxListOpen) return
                }}
                className="text-muted-foreground hover:text-foreground p-1.5 -mr-1 rounded-full hover:bg-muted/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages — flex-1 takes remaining space, scrollable */}
          <div
            ref={mobileMessagesRef}
            className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 min-h-0 bg-background"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {loadingMessages ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground/80">
                    Chat with {chatHeaderName || "the clinic"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ask any questions or request an appointment
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === "patient" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[82%] rounded-2xl px-3.5 py-2 ${
                        msg.sender_type === "patient"
                          ? "bg-primary text-white rounded-br-md"
                          : msg.sender_type === "bot"
                          ? "bg-secondary border border-border rounded-bl-md shadow-sm"
                          : "bg-muted rounded-bl-md shadow-sm"
                      }`}
                    >
                      {msg.sender_type === "bot" && (
                        <p className="text-[9px] text-muted-foreground/60 mb-0.5 flex items-center gap-1">
                          <Heart className="w-2.5 h-2.5 fill-muted-foreground/40 text-muted-foreground/40" />
                          Pearlie AI
                        </p>
                      )}
                      <p className={`text-[14px] leading-relaxed whitespace-pre-wrap ${msg.sender_type === "bot" ? "text-foreground/70" : ""}`}>
                        {msg.content}
                      </p>
                      <p className={`text-[10px] mt-1 ${
                        msg.sender_type === "patient" ? "text-white/50 text-right" : "text-muted-foreground/60"
                      }`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                {(otherTyping || botTyping) && (
                  <div className="flex justify-start">
                    <div className="bg-secondary border border-border rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
                      <p className="text-[9px] text-muted-foreground/60 mb-1 flex items-center gap-1">
                        <Heart className="w-2.5 h-2.5 fill-muted-foreground/40 text-muted-foreground/40" />
                        Pearlie AI
                      </p>
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Quick prompts — show until a couple of messages exchanged */}
          {messages.length <= 2 && (
            <div className="flex gap-2 px-3 py-2.5 overflow-x-auto flex-shrink-0 border-t border-border/30 bg-card">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setNewMessage(prompt)}
                  className="text-[12px] text-muted-foreground border border-border/60 rounded-full px-3 py-1.5 hover:border-primary/40 hover:text-primary active:bg-primary/10 transition-colors whitespace-nowrap flex-shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Error feedback */}
          {chatError && (
            <div className="px-3 py-1.5 flex-shrink-0 bg-card">
              <p className="text-xs text-red-500">{chatError}</p>
            </div>
          )}

          {/* Composer — flex-shrink-0 at bottom, safe area padding */}
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 px-3 py-3 border-t border-border/30 flex-shrink-0 bg-card"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom, 12px), 12px)" }}
          >
            <Input
              value={newMessage}
              onChange={(e) => { setNewMessage(e.target.value); sendTyping(); setChatError(null) }}
              placeholder="Type a message..."
              className="flex-1 text-base rounded-xl bg-muted/60 border-0 h-10 focus-visible:ring-ring/30"
              disabled={isSending}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newMessage.trim() || isSending}
              className="bg-primary hover:bg-primary/90 text-white h-10 w-10 rounded-xl shrink-0 active:scale-95 transition-transform"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      )}

      {/* ══════ MOBILE: Full-Screen Inbox List ══════ */}
      {isMobile && mobileInboxListOpen && !mobileChatOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-background"
          style={{ height: "100dvh" }}
        >
          {/* Header */}
          <div className="flex-shrink-0 border-b border-border/30 bg-card px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Inbox className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground text-base">Inbox</h2>
                {totalUnread > 0 && (
                  <span className="bg-primary text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full inline-flex items-center justify-center">
                    {totalUnread}
                  </span>
                )}
              </div>
              <button
                onClick={() => setMobileInboxListOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1.5 -mr-1 rounded-full hover:bg-muted/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* "Return to Clinic Profile" button */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-border/20 bg-card">
            <button
              onClick={() => setMobileInboxListOpen(false)}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-border/60 text-sm font-medium text-foreground/80 hover:bg-muted/40 active:scale-[0.98] transition-all"
            >
              <MapPin className="w-4 h-4" />
              Return to Clinic Profile
            </button>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            {inboxConversations.length === 0 && !isInPendingChat ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <MessageCircle className="w-7 h-7 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground/70 mb-1">No conversations yet</p>
                <p className="text-xs text-muted-foreground">Message a clinic to start a conversation</p>
              </div>
            ) : (
              <div className="px-3 py-3 space-y-2">
                {/* Pending chat card */}
                {isInPendingChat && pendingChatClinic && (
                  <button
                    onClick={() => {
                      setMobileChatOpen(true)
                    }}
                    className="w-full text-left p-3.5 rounded-xl border-2 border-primary bg-primary/5 flex gap-3 active:scale-[0.99] transition-transform"
                  >
                    <div className="w-11 h-11 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-semibold">
                        {pendingChatClinic.clinicName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{pendingChatClinic.clinicName}</p>
                      <p className="text-xs text-primary font-medium mt-0.5">New conversation</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 self-center flex-shrink-0" />
                  </button>
                )}

                {/* Existing conversations */}
                {inboxConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConvId(conv.id)
                      setPendingChatClinic(null)
                      setMobileChatOpen(true)
                    }}
                    className={`w-full text-left p-3.5 rounded-xl flex gap-3 active:scale-[0.99] transition-all ${
                      conv.unread_by_patient
                        ? "border-2 border-primary/40 bg-primary/5"
                        : "border border-border/40 hover:border-border"
                    }`}
                  >
                    {/* Clinic image */}
                    <div className="flex-shrink-0">
                      {conv.clinics?.images?.[0] ? (
                        <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-muted">
                          <Image src={conv.clinics.images[0]} alt={conv.clinics.name || "Clinic"} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-primary flex items-center justify-center">
                          <span className="text-white text-sm font-semibold">
                            {(conv.clinics?.name || "C").charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${conv.unread_by_patient ? "font-bold text-foreground" : "font-semibold text-foreground/80"}`}>
                          {conv.clinics?.name || "Clinic"}
                        </p>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {conv.last_message_at ? formatTime(conv.last_message_at) : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted-foreground truncate pr-2 leading-snug">
                          {conv.latest_message || "No messages yet"}
                        </p>
                        {conv.unread_by_patient && conv.unread_count_patient > 0 && (
                          <span className="bg-primary text-white text-[9px] font-bold min-w-[14px] h-3.5 px-1 rounded-full inline-flex items-center justify-center flex-shrink-0">
                            {conv.unread_count_patient}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 self-center flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════ MOBILE: Sticky Bottom Action Bar ══════ */}
      {isMobile && selectedClinic && !mobileChatOpen && !mobileInboxListOpen && stickyBarDeferred && (
        <div
          className={`fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur-md border-t border-border/40 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-4 py-3 pb-6 transition-all duration-300 ${
            showStickyBar ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
          }`}
        >
          <div className="flex gap-2">
            <Button
              className="flex-1 h-11 bg-primary text-white border-0 font-semibold text-sm rounded-xl shadow-sm active:scale-[0.98] transition-transform"
              onClick={handleMessageClick}
            >
              <MessageCircle className="w-4 h-4 mr-1.5 flex-shrink-0" />
              Message
            </Button>
            {!appointmentRequestedClinics.has(selectedClinic.id) && (
              <Button
                className="flex-1 h-11 rounded-xl text-sm font-semibold bg-[var(--dark-teal-bg)] hover:bg-[var(--dark-teal-bg)]/90 text-white border-0 active:scale-[0.98] transition-transform"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                <CalendarCheck className="w-4 h-4 mr-1.5 flex-shrink-0" />
                Book
              </Button>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
