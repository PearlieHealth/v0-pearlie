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
  Moon,
  Sun,
  MoreVertical,
  Lock,
  BellOff,
  Bell,
} from "lucide-react"
import Link from "next/link"
import { useChatChannel, usePatientConversationUpdates, type RealtimeMessage } from "@/hooks/use-chat-channel"
import { BookingCard } from "@/components/match/booking-card"
import { ClinicImage } from "@/components/match/clinic-image"
import { useIsMobile } from "@/components/ui/use-mobile"
import { AppointmentBanner } from "@/components/appointment-banner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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
  booking_date?: string | null
  booking_time?: string | null
  booking_clinic_id?: string | null
  booking_status?: string | null
  booking_decline_reason?: string | null
  booking_cancel_reason?: string | null
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
  conversation_state?: "open" | "booked" | "closed"
  muted_by_patient?: boolean
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

  // Conversation actions: close + mute
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isMuting, setIsMuting] = useState(false)

  // Mobile: chat drawer state
  const isMobile = useIsMobile()
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  // Mobile: full-screen inbox list (conversations overview)
  const [mobileInboxListOpen, setMobileInboxListOpen] = useState(false)

  // Desktop: collapsible right panel
  const [chatPanelCollapsed, setChatPanelCollapsed] = useState(false)

  // Dark mode toggle
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Sign out confirmation
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)

  // Mobile: sticky bar visibility — tracks when CTAs scroll out of view
  const ctaRef = useRef<HTMLDivElement | null>(null)
  const [showStickyBar, setShowStickyBar] = useState(false)

  // Derive which clinics have appointment requests from server-side conversation data.
  // This persists across sessions, devices, and logouts.
  // Map: clinicId -> appointment_requested_at timestamp
  const appointmentRequestedClinicsMap = new Map<string, string>(
    inboxConversations
      .filter((c) => c.appointment_requested_at)
      .map((c) => [c.clinic_id, c.appointment_requested_at!])
  )
  const appointmentRequestedClinics = new Set(appointmentRequestedClinicsMap.keys())

  // "Pending chat" — when user clicks message on a clinic with no conversation yet.
  // We show the chat UI with this clinicId+leadId so they can type, and the
  // conversation is created lazily when they actually send the first message.
  const [pendingChatClinic, setPendingChatClinic] = useState<{
    clinicId: string
    clinicName: string
    leadId: string
  } | null>(null)

  const selectedConv = inboxConversations.find((c) => c.id === selectedConvId) || null
  const isClosed = selectedConv?.conversation_state === "closed"
  const isMuted = selectedConv?.muted_by_patient === true

  // Derived: selected clinic and other clinics
  const selectedClinic = allClinics.find((c) => c.id === selectedClinicId) || null
  const otherClinics = allClinics.filter((c) => c.id !== selectedClinicId)
  const isTopMatch = selectedClinicId === allClinics[0]?.id
  const latestMatch = data?.matches?.[0] || null
  const latestMatchLead = latestMatch ? data?.leads?.find((l) => l.id === latestMatch.lead_id) : null
  const activeLeadId = latestMatch?.lead_id || null

  // Are we in a "pending chat" (no conversation yet)?
  const isInPendingChat = pendingChatClinic !== null && selectedConvId === null

  // ── Session expiry detection ──────────────────────────────────
  const [isSessionExpired, setIsSessionExpired] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setIsSessionExpired(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

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

  async function fetchInbox(opts?: { skipAutoSelect?: boolean }) {
    try {
      const res = await fetch("/api/patient/conversations")
      if (res.ok) {
        const { conversations } = await res.json()
        setInboxConversations(conversations || [])

        // Auto-select: most recent unread, or first conversation
        // Skip when called after creating a new conversation (selectedConvId
        // was just set synchronously but this closure still sees the old value).
        if (!opts?.skipAutoSelect && !selectedConvId && conversations?.length > 0) {
          const firstUnread = conversations.find((c: Conversation) => c.unread_by_patient)
          setSelectedConvId(firstUnread?.id || conversations[0].id)
        }
      } else if (res.status === 401) {
        // Session expired — redirect to login
        router.replace("/patient/login?next=/patient/dashboard")
      } else {
        console.warn("[Dashboard] fetchInbox failed:", res.status)
      }
    } catch (err) {
      console.warn("[Dashboard] fetchInbox error:", err)
    }
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
      setChatError(null) // Clear any previous chat errors
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

  // Re-fetch inbox when mobile inbox list opens to ensure fresh data
  useEffect(() => {
    if (mobileInboxListOpen) fetchInbox()
  }, [mobileInboxListOpen])

  // ── Send message ─────────────────────────────────────────────

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault()
    if (!newMessage.trim() || isSending || isClosed) return

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

    const messageText = newMessage.trim()

    // Optimistic: show user message immediately before API call
    const tempId = `temp-${Date.now()}`
    const optimisticMsg: Message = {
      id: tempId,
      content: messageText,
      sender_type: "patient",
      status: "sent",
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])
    setNewMessage("")
    setIsSending(true)

    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          clinicId,
          content: messageText,
          senderType: "patient",
        }),
      })
      if (res.ok) {
        const data = await res.json()
        // Replace optimistic message with server version
        setMessages((prev) => prev.map((m) => m.id === tempId ? data.message : m))

        // If this was a pending chat (first message), the backend created
        // the conversation. We need to update our state.
        if (pendingChatClinic && data.conversationId) {
          const newConvId = data.conversationId
          setPendingChatClinic(null)
          // Skip the auto-fetch — we already have the right messages in state
          skipNextConvFetch.current = true
          setSelectedConvId(newConvId)

          // Re-fetch inbox to include the new conversation.
          // skipAutoSelect: the closure still sees the old selectedConvId (null),
          // so auto-select would override the newConvId we just set.
          fetchInbox({ skipAutoSelect: true })
        }

        // Update inbox preview for existing conversations
        if (selectedConv) {
          setInboxConversations((prev) =>
            prev.map((c) =>
              c.id === selectedConv.id
                ? { ...c, latest_message: messageText.substring(0, 100), latest_message_sender: "patient", last_message_at: new Date().toISOString() }
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
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        const errData = await res.json().catch(() => ({}))
        if (res.status === 401) {
          setChatError("Your session has expired. Please log in again to continue chatting.")
        } else if (res.status === 403 && errData.reason === "conversation_closed") {
          // Update local state so banner shows and composer hides
          setInboxConversations((prev) =>
            prev.map((c) =>
              c.id === selectedConv?.id ? { ...c, conversation_state: "closed" as const } : c
            )
          )
        } else if (res.status === 403) {
          setChatError("Please verify your email before sending messages.")
        } else if (res.status === 429) {
          setChatError(errData.error || "Too many messages. Please wait a moment.")
        } else {
          setChatError(errData.error || "Failed to send message.")
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err)
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setChatError("Failed to send. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  // ── Close conversation ──────────────────────────────────────

  async function handleCloseConversation() {
    if (!selectedConv) return
    setIsClosing(true)
    try {
      const res = await fetch(`/api/patient/conversations/${selectedConv.id}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "closed" }),
      })
      if (res.ok) {
        setInboxConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConv.id ? { ...c, conversation_state: "closed" as const } : c
          )
        )
        // Refresh messages to show the bot "closed" message
        fetchConvMessages(selectedConv.id)
      }
    } catch (err) {
      console.error("Failed to close conversation:", err)
    } finally {
      setIsClosing(false)
      setShowCloseDialog(false)
    }
  }

  // ── Mute / Unmute notifications ────────────────────────────

  async function handleToggleMute() {
    if (!selectedConv) return
    const action = isMuted ? "unmute" : "mute"
    setIsMuting(true)
    try {
      const res = await fetch(`/api/patient/conversations/${selectedConv.id}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        setInboxConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConv.id ? { ...c, muted_by_patient: action === "mute" } : c
          )
        )
      }
    } catch (err) {
      console.error("Failed to toggle mute:", err)
    } finally {
      setIsMuting(false)
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
    window.location.href = "/patient/login"
  }

  function openConversationForClinic(clinicId: string, { openDrawer = true }: { openDrawer?: boolean } = {}) {
    // Clear any previous chat errors when switching conversations
    setChatError(null)

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

  async function handleRequestAppointment(message: string, opts?: { date?: string; time?: string }) {
    if (!selectedClinicId || !activeLeadId) return

    // Block if already requested (server-side check is also in the API)
    if (appointmentRequestedClinics.has(selectedClinicId)) return

    // Open the chat UI first so the user sees it
    openConversationForClinic(selectedClinicId)

    // Optimistic: show appointment message immediately
    const tempId = `temp-${Date.now()}`
    const optimisticMsg: Message = {
      id: tempId,
      content: message,
      sender_type: "patient",
      status: "sent",
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])

    // When we have structured date/time, use the full booking request API so the
    // lead's booking_* fields are set and the clinic gets confirm/decline buttons.
    // For generic "what times?" messages (no date/time), use chat/send.
    const useBookingApi = !!(opts?.date && opts?.time)

    try {
      const res = useBookingApi
        ? await fetch("/api/booking/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clinicId: selectedClinicId,
              leadId: activeLeadId,
              date: opts!.date,
              time: opts!.time,
            }),
          })
        : await fetch("/api/chat/send", {
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

        // Both APIs return the message (bookingMessage for booking/request, message for chat/send)
        const serverMessage = useBookingApi ? data.bookingMessage : data.message
        if (serverMessage) {
          setMessages((prev) => prev.map((m) => m.id === tempId ? serverMessage : m))
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== tempId))
        }

        // Mark the conversation locally as having an appointment request
        setInboxConversations((prev) =>
          prev.map((c) =>
            c.clinic_id === selectedClinicId
              ? { ...c, appointment_requested_at: new Date().toISOString() }
              : c
          )
        )

        // If new conversation was created, update state
        const convId = data.conversationId
        if (convId && !inboxConversations.find((c) => c.clinic_id === selectedClinicId)) {
          skipNextConvFetch.current = true
          setSelectedConvId(convId)
          setPendingChatClinic(null)
          fetchInbox({ skipAutoSelect: true })
        }

        // Update local lead data so booking status shows immediately
        if (useBookingApi && data.success) {
          setData((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              leads: prev.leads.map((l) =>
                l.id === activeLeadId
                  ? { ...l, booking_status: "pending", booking_date: opts!.date!, booking_time: opts!.time!, booking_clinic_id: selectedClinicId }
                  : l
              ),
            }
          })
        }

        // Handle bot auto-replies with typing indicator
        if (data.botMessages?.length) {
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
        // Already requested (server-side duplicate check) — remove optimistic, refresh inbox
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        fetchInbox()
      } else if (res.status === 429) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        const errData = await res.json().catch(() => ({}))
        setChatError(errData.error || "Too many requests. Please wait a moment.")
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        const errData = await res.json().catch(() => ({}))
        setChatError(errData.error || "Failed to send appointment request.")
      }
    } catch (err) {
      console.error("Failed to send appointment request:", err)
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
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
        <div className="rounded bg-primary p-2">
          <Heart className="w-4 h-4 text-white fill-white" />
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
    <div className={`min-h-screen lg:h-screen lg:overflow-hidden bg-background flex flex-col ${isDarkMode ? "dashboard-dark" : ""}`}>
      {/* Session expiry banner */}
      {isSessionExpired && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3 text-center text-sm">
          <span className="text-destructive font-medium">Your session has expired.</span>{" "}
          <Link href="/patient/login?next=/patient/dashboard" className="text-destructive underline hover:no-underline">
            Log in again
          </Link>
        </div>
      )}
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="rounded bg-primary p-1.5">
                <Heart className="w-3.5 h-3.5 text-white fill-white" />
              </div>
              <span className="font-semibold text-base text-primary">Pearlie</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors"
              title={isDarkMode ? "Light mode" : "Dark mode"}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {/* Sign out */}
            <div className="relative">
              <button
                onClick={() => setShowSignOutConfirm(!showSignOutConfirm)}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
              {showSignOutConfirm && (
                <div className="absolute right-0 top-11 z-50 w-56 rounded-lg border border-border bg-card shadow-lg p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                  <p className="text-xs font-medium text-foreground">Sign out of Pearlie?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSignOut}
                      className="flex-1 h-8 rounded-md text-xs font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors"
                    >
                      Sign out
                    </button>
                    <button
                      onClick={() => setShowSignOutConfirm(false)}
                      className="flex-1 h-8 rounded-md text-xs font-medium border border-border text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content: split view — clinic LEFT, chat RIGHT */}
      <div className="flex-1 max-w-[1400px] w-full mx-auto flex flex-col lg:flex-row lg:min-h-0">

        {/* ══════ RIGHT COLUMN: Messages / Chat ══════ */}
        <div className={`
          lg:order-3 lg:flex-shrink-0 lg:border-l lg:border-border/60 lg:flex lg:flex-col lg:bg-card lg:overflow-hidden
          ${chatPanelCollapsed ? "hidden lg:hidden" : "hidden lg:flex"}
          ${chatPanelCollapsed ? "" : "lg:w-[40%]"}
        `}>

          {/* Inbox list (top portion) */}
          <div className="border-b border-border/40 flex-shrink-0 max-h-[35%] overflow-y-auto">
            <div className="px-3 py-2 flex items-center justify-between sticky top-0 z-10 bg-card border-b border-border/20">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground text-sm">Messages</h2>
                {totalUnread > 0 && (
                  <span className="bg-primary text-white text-[9px] font-bold w-[18px] h-[18px] rounded-full inline-flex items-center justify-center">
                    {totalUnread}
                  </span>
                )}
              </div>
            </div>

            {inboxConversations.length === 0 && !isInPendingChat ? (
              <div className="px-3 pb-3 text-center py-4">
                <MessageCircle className="w-6 h-6 text-muted-foreground mx-auto mb-1.5" />
                <p className="text-xs text-muted-foreground">Questions before booking? Message the clinic here.</p>
              </div>
            ) : (
              <div className="px-2 pb-2 pt-1">
                {/* Show pending chat as a virtual conversation card */}
                {isInPendingChat && pendingChatClinic && (
                  <div
                    className="px-3 py-2 rounded border-2 border-primary bg-primary/5 flex gap-2.5 cursor-default mb-1"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-9 h-9 rounded bg-primary flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">
                          {pendingChatClinic.clinicName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">{pendingChatClinic.clinicName}</p>
                      <p className="text-[11px] text-primary font-medium">New conversation</p>
                    </div>
                  </div>
                )}

                {inboxConversations.map((conv) => {
                  const isActive = selectedConvId === conv.id && !isInPendingChat
                  const convLead = data?.leads?.find((l) => l.id === conv.lead_id)
                  const treatmentLabel = convLead?.treatment_interest

                  // Determine conversation status
                  const getConvStatus = () => {
                    if (conv.unread_by_patient && conv.unread_count_patient > 0) return { label: "Replied", color: "text-primary" }
                    if (conv.latest_message_sender === "patient") return { label: "Awaiting reply", color: "text-muted-foreground" }
                    if (conv.latest_message) return { label: "Chatting now", color: "text-primary" }
                    return null
                  }
                  const status = getConvStatus()

                  return (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setSelectedConvId(conv.id)
                        setPendingChatClinic(null)
                      }}
                      className={`w-full text-left px-3 py-2 rounded transition-all duration-150 flex gap-2.5 border-b border-border/20 last:border-b-0 hover:bg-muted/50 ${
                        isActive
                          ? "bg-primary/5 border-l-2 border-l-primary"
                          : ""
                      }`}
                    >
                      {/* Clinic image thumbnail */}
                      <div className="flex-shrink-0">
                        {conv.clinics?.images?.[0] ? (
                          <div className="relative w-9 h-9 rounded overflow-hidden bg-muted">
                            <ClinicImage src={conv.clinics.images[0]} alt={conv.clinics.name || "Clinic"} fill className="object-cover w-full h-full" fallbackClassName="w-full h-full bg-primary flex items-center justify-center" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded bg-primary flex items-center justify-center">
                            <span className="text-white text-xs font-semibold">
                              {(conv.clinics?.name || "C").charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-[13px] truncate ${conv.unread_by_patient ? "font-bold text-foreground" : "font-semibold text-foreground/80"}`}>
                            {conv.clinics?.name || "Clinic"}
                          </p>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {conv.last_message_at ? formatTime(conv.last_message_at) : ""}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-muted-foreground/70 truncate pr-2 leading-snug">
                            {conv.latest_message || "No messages yet"}
                          </p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {status && (
                              <span className={`text-[9px] font-medium ${status.color}`}>{status.label}</span>
                            )}
                            {conv.unread_by_patient && conv.unread_count_patient > 0 && (
                              <span className="bg-primary text-white text-[9px] font-bold w-[18px] h-[18px] rounded-full inline-flex items-center justify-center">
                                {conv.unread_count_patient}
                              </span>
                            )}
                          </div>
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
                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-medium">Select a conversation</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between flex-shrink-0 bg-card">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {chatHeaderImage ? (
                      <div className="relative w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-muted ring-1 ring-border/40">
                        <ClinicImage src={chatHeaderImage} alt={chatHeaderName || "Clinic"} fill className="object-cover w-full h-full" fallbackClassName="w-full h-full bg-primary flex items-center justify-center" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded bg-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-semibold">
                          {(chatHeaderName || "C").charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate leading-tight">{chatHeaderName || "Clinic"}</p>
                      <p className={`text-[10px] font-medium leading-tight ${isClosed ? "text-muted-foreground" : "text-primary"}`}>
                        {isClosed ? "Conversation closed" : isMuted ? "Notifications muted" : "Chatting now"}
                      </p>
                    </div>
                  </div>
                  {/* Three-dot menu */}
                  {selectedConv && !isInPendingChat && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-full hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {!isClosed && (
                          <DropdownMenuItem onClick={() => setShowCloseDialog(true)} className="text-red-600 focus:text-red-600">
                            <Lock className="w-4 h-4 mr-2" />
                            Close conversation
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={handleToggleMute} disabled={isMuting}>
                          {isMuted ? (
                            <>
                              <Bell className="w-4 h-4 mr-2" />
                              Unmute notifications
                            </>
                          ) : (
                            <>
                              <BellOff className="w-4 h-4 mr-2" />
                              Mute notifications
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Appointment banner for this conversation */}
                {selectedConv?.appointment_requested_at && latestMatchLead?.booking_clinic_id === selectedConv.clinic_id && (
                  <div className="px-3 pt-2 pb-0 flex-shrink-0">
                    <AppointmentBanner
                      bookingDate={latestMatchLead.booking_date}
                      bookingTime={latestMatchLead.booking_time}
                      requestedAt={selectedConv?.appointment_requested_at || null}
                      compact
                    />
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto min-h-0 px-3 py-2.5 bg-card" ref={scrollAreaRef}>
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-6 space-y-1.5">
                      <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center mx-auto">
                        <MessageCircle className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-foreground/70">
                        Chat with {chatHeaderName || "the clinic"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ask any questions or request an appointment.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_type === "patient" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-lg px-3 py-1.5 ${
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
                          <div className="bg-secondary border border-border rounded-lg rounded-bl-sm px-3.5 py-2">
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

                {/* Closed conversation banner */}
                {isClosed && (
                  <div className="px-3 py-2 border-t border-border/40 flex-shrink-0 bg-muted/50">
                    <p className="text-xs text-muted-foreground text-center">This conversation has been closed. Looking for a dentist? <Link href="/intake" className="underline text-primary hover:text-primary/80">Start a new search</Link> to get matched with clinics.</p>
                  </div>
                )}

                {/* Quick prompts */}
                {!isClosed && messages.length <= 2 && (
                <div className="flex gap-1.5 px-3 py-1.5 overflow-x-auto flex-shrink-0 border-t border-border/30">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setNewMessage(prompt)}
                      className="text-[11px] text-muted-foreground border border-border/60 rounded-md px-2.5 py-1 hover:border-primary/40 hover:text-primary transition-colors whitespace-nowrap flex-shrink-0"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                )}

                {/* Error feedback */}
                {chatError && (
                  <div className="px-3 py-1.5 flex-shrink-0">
                    {chatError.includes("session has expired") ? (
                      <p className="text-xs text-red-500">
                        {chatError}{" "}
                        <a href="/patient/login?next=/patient/dashboard" className="underline font-medium hover:text-red-700">
                          Log in
                        </a>
                      </p>
                    ) : (
                      <p className="text-xs text-red-500">{chatError}</p>
                    )}
                  </div>
                )}

                {/* Composer */}
                {!isClosed && (
                <form onSubmit={handleSend} className="flex gap-2 px-3 py-2.5 border-t border-border/40 flex-shrink-0 bg-card">
                  <Input
                    value={newMessage}
                    onChange={(e) => { setNewMessage(e.target.value); sendTyping(); setChatError(null) }}
                    placeholder="Type a message..."
                    className="flex-1 text-sm rounded-md border-border h-9 focus-visible:ring-primary/30"
                    disabled={isSending}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!newMessage.trim() || isSending}
                    className="bg-primary hover:bg-primary/90 text-white h-9 w-9 rounded-md"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
                )}
              </>
            )}
          </div>
        </div>

        {/* ══════ Desktop collapse/expand toggle ══════ */}
        <button
          type="button"
          onClick={() => setChatPanelCollapsed(!chatPanelCollapsed)}
          className="hidden lg:flex lg:order-2 items-center justify-center self-center h-8 w-5 flex-shrink-0 rounded bg-card border border-border shadow-sm hover:bg-muted transition-colors"
          title={chatPanelCollapsed ? "Open messages" : "Close messages"}
        >
          {chatPanelCollapsed ? (
            <ChevronLeft className="w-3.5 h-3.5 text-foreground/60" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-foreground/60" />
          )}
        </button>

        {/* ══════ LEFT COLUMN: Clinic (Primary) ══════ */}
        <div className={`lg:order-1 flex-1 min-w-0 ${chatPanelCollapsed ? "lg:max-w-full" : "lg:max-w-[60%]"} overflow-y-auto px-3 py-3 sm:px-3 sm:py-3 lg:px-5 lg:py-4 space-y-3 transition-all duration-300`}>

          {/* ─── Greeting ──── */}
          {data?.user && (
            <div className="flex items-baseline gap-2">
              <h1 className="text-lg font-bold text-foreground">
                Hi{data.user.name ? `, ${data.user.name.split(" ")[0]}` : ""}
              </h1>
              {data.user.email && (
                <span className="text-xs text-muted-foreground">{data.user.email}</span>
              )}
            </div>
          )}

          {/* ─── MOBILE: Message-first inbox preview (above clinic card) ──── */}
          {isMobile && (inboxConversations.length > 0 || isInPendingChat) && (
            <Card className="overflow-hidden border border-border/60 shadow-sm rounded-lg">
              {/* Inbox header */}
              <div className="px-3 py-2 bg-card flex items-center justify-between border-b border-border/30">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-foreground text-sm">Messages</h2>
                  {totalUnread > 0 && (
                    <span className="bg-primary text-white text-[9px] font-bold w-[18px] h-[18px] rounded-full inline-flex items-center justify-center">
                      {totalUnread}
                    </span>
                  )}
                </div>
              </div>

              {/* Compact conversation cards — show top 2 */}
              <div className="bg-card px-2 py-1.5 space-y-0.5">
                {isInPendingChat && pendingChatClinic && (
                  <button
                    onClick={() => setMobileChatOpen(true)}
                    className="w-full text-left px-2.5 py-2 rounded-md flex gap-2.5 bg-primary/5 border border-primary/30 active:scale-[0.99] transition-transform"
                  >
                    <div className="w-8 h-8 rounded bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[10px] font-semibold">
                        {pendingChatClinic.clinicName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-foreground truncate">{pendingChatClinic.clinicName}</p>
                      <p className="text-[10px] text-primary font-medium">New conversation — tap to chat</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 self-center flex-shrink-0" />
                  </button>
                )}

                {inboxConversations.slice(0, 2).map((conv) => {
                  const convStatus = (() => {
                    if (conv.unread_by_patient && conv.unread_count_patient > 0) return { label: "Replied", color: "text-primary" }
                    if (conv.latest_message_sender === "patient") return { label: "Awaiting reply", color: "text-muted-foreground" }
                    return null
                  })()

                  return (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setSelectedConvId(conv.id)
                        setPendingChatClinic(null)
                        setMobileChatOpen(true)
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-md flex gap-2.5 active:scale-[0.99] transition-all ${
                        conv.unread_by_patient ? "bg-primary/5" : "hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {conv.clinics?.images?.[0] ? (
                          <div className="relative w-8 h-8 rounded overflow-hidden bg-muted">
                            <ClinicImage src={conv.clinics.images[0]} alt={conv.clinics.name || "Clinic"} fill className="object-cover w-full h-full" fallbackClassName="w-full h-full bg-primary flex items-center justify-center" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
                            <span className="text-white text-[10px] font-semibold">
                              {(conv.clinics?.name || "C").charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-[13px] truncate ${conv.unread_by_patient ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>
                            {conv.clinics?.name || "Clinic"}
                          </p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {convStatus && (
                              <span className={`text-[9px] font-medium ${convStatus.color}`}>{convStatus.label}</span>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {conv.last_message_at ? formatTime(conv.last_message_at) : ""}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-[11px] text-muted-foreground/70 truncate pr-2 leading-snug">
                            {conv.latest_message || "No messages yet"}
                          </p>
                          {conv.unread_by_patient && conv.unread_count_patient > 0 && (
                            <span className="bg-primary text-white text-[9px] font-bold w-[18px] h-[18px] rounded-full inline-flex items-center justify-center flex-shrink-0">
                              {conv.unread_count_patient}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 self-center flex-shrink-0" />
                    </button>
                  )
                })}
              </div>

              {/* View full inbox button */}
              <button
                onClick={() => setMobileInboxListOpen(true)}
                className="w-full px-3 py-2.5 border-t border-border/30 bg-card flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/5 active:bg-primary/10 transition-colors"
              >
                <Inbox className="w-3.5 h-3.5" />
                View full inbox
                {totalUnread > 0 && (
                  <span className="bg-primary text-white text-[9px] font-bold w-[18px] h-[18px] rounded-full inline-flex items-center justify-center ml-0.5">
                    {totalUnread}
                  </span>
                )}
              </button>
            </Card>
          )}

          {/* ─── MOBILE: Compact nav for when no conversations exist yet ──── */}
          {isMobile && selectedClinic && inboxConversations.length === 0 && !isInPendingChat && (
            <div className="-mx-3 -mt-3 mb-2 px-3 py-2 bg-card border-b border-border/30">
              <button
                onClick={handleMessageClick}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-md bg-primary text-white text-sm font-semibold active:scale-[0.98] transition-transform"
              >
                <MessageCircle className="w-4 h-4" />
                Message Clinic
              </button>
            </div>
          )}

          {/* ─── Booking Card for selected clinic ──────────── */}
          {!latestMatch ? (
            <Card className="p-5 text-center rounded-lg border">
              <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <h2 className="font-semibold text-foreground text-sm mb-1">Find your perfect clinic</h2>
              <p className="text-muted-foreground mb-3 text-xs">
                Tell us what you need and we&apos;ll recommend the best clinic for you.
              </p>
              <Button asChild size="sm">
                <Link href="/intake">Get matched</Link>
              </Button>
            </Card>
          ) : loadingClinics && !selectedClinic ? (
            <Card className="p-6 flex flex-col items-center justify-center rounded-lg border">
              <Loader2 className="w-5 h-5 animate-spin text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Finding your best match...</p>
            </Card>
          ) : selectedClinic ? (
            <div className="space-y-2">
              <BookingCard
                clinic={selectedClinic}
                isTopMatch={isTopMatch}
                onMessageClick={handleMessageClick}
                onRequestAppointment={handleRequestAppointment}
                appointmentRequested={appointmentRequestedClinics.has(selectedClinic.id)}
                appointmentRequestedAt={appointmentRequestedClinicsMap.get(selectedClinic.id) || null}
                bookingDate={latestMatchLead?.booking_clinic_id === selectedClinic.id ? latestMatchLead?.booking_date : null}
                bookingTime={latestMatchLead?.booking_clinic_id === selectedClinic.id ? latestMatchLead?.booking_time : null}
                bookingStatus={latestMatchLead?.booking_clinic_id === selectedClinic.id ? latestMatchLead?.booking_status : null}
                bookingDeclineReason={latestMatchLead?.booking_clinic_id === selectedClinic.id ? latestMatchLead?.booking_decline_reason : null}
                bookingCancelReason={latestMatchLead?.booking_clinic_id === selectedClinic.id ? latestMatchLead?.booking_cancel_reason : null}
                ctaRef={ctaRef}
                providers={clinicProviders}
                treatmentInterest={latestMatchLead?.treatment_interest}
                postcode={latestMatchLead?.postcode}
              />
            </div>
          ) : latestMatch ? (
            <Link href={`/match/${latestMatch.id}`}>
              <Card className="p-4 hover:shadow-sm transition-shadow cursor-pointer border-border bg-card rounded-lg">
                <span className="text-[10px] font-medium text-white bg-primary px-2 py-0.5 rounded">Your latest match</span>
                <p className="font-semibold text-foreground text-sm mt-1.5">{latestMatchLead?.treatment_interest || "Dental enquiry"}</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">View your {latestMatch.clinic_ids?.length || 0} matched clinics &rarr;</p>
              </Card>
            </Link>
          ) : null}

          {/* ─── OTHER CLINICS — Netflix horizontal scroll ─────────────────── */}
          {otherClinics.length > 0 && latestMatch && (
            <section>
              <h2 className="text-xs font-semibold text-foreground mb-2">
                Other clinics for you
              </h2>

              <div className="-mx-3 px-3 lg:-mx-5 lg:px-5 overflow-x-auto scrollbar-hide">
                <div className="flex gap-2.5 lg:gap-3 pb-1" style={{ width: "max-content" }}>
                  {otherClinics.map((clinic) => (
                    <button
                      key={clinic.id}
                      onClick={() => handleSelectClinic(clinic.id)}
                      className="flex-shrink-0 w-[110px] lg:w-[150px] text-left active:scale-[0.97] transition-transform"
                    >
                      <div className={`relative w-[110px] h-[80px] lg:w-[150px] lg:h-[100px] rounded-lg overflow-hidden border-2 ${
                        clinic.id === selectedClinicId ? "border-primary shadow-md" : "border-border/30"
                      }`}>
                        {clinic.images && clinic.images.length > 0 ? (
                          <ClinicImage
                            src={clinic.images[0] || "/placeholder.svg"}
                            alt={clinic.name}
                            fill
                            className="object-cover w-full h-full"
                            fallbackClassName="w-full h-full bg-muted flex items-center justify-center"
                            sizes="(min-width: 1024px) 150px, 110px"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <span className="text-foreground text-xl font-bold">{clinic.name.charAt(0)}</span>
                          </div>
                        )}
                        {/* Match % badge */}
                        {clinic.match_percentage && clinic.tier !== "directory" && !clinic.is_directory_listing && (
                          <span className="absolute top-1 right-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            {clinic.match_percentage}%
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] lg:text-xs mt-1 leading-tight line-clamp-2 ${
                        clinic.id === selectedClinicId ? "font-bold text-primary" : "font-medium text-foreground/80"
                      }`}>
                        {clinic.name}
                      </p>
                      {clinic.distance_miles !== undefined && (
                        <p className="text-[9px] lg:text-[10px] text-muted-foreground mt-0.5">
                          ~{clinic.distance_miles.toFixed(1)} mi
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Start a new search */}
          {latestMatch && (
            <Link href="/intake" className="block">
              <div className="w-full bg-card rounded-lg border border-border/30 px-3 py-2.5 hover:border-[#0fbcb0]/40 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-foreground">Looking for another treatment?</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Start a new search</p>
                </div>
                <span className="text-xs font-semibold text-[#0fbcb0] flex-shrink-0">
                  New search &rarr;
                </span>
              </div>
            </Link>
          )}

          {/* ─── MATCH HISTORY ─────────────── */}
          {data?.matches && data.matches.length > 0 && (
            <section>
              <button
                onClick={() => setShowMatchHistory(!showMatchHistory)}
                className="flex items-center justify-between w-full text-left px-3 py-2.5 rounded-lg border border-border/30 bg-card hover:border-[#0fbcb0]/40 hover:shadow-sm transition-all"
              >
                <div>
                  <h2 className="text-xs font-semibold text-foreground">
                    Match history
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {data.matchesTotal || data.matches.length} previous {(data.matchesTotal || data.matches.length) === 1 ? "search" : "searches"}
                  </p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-foreground/50 transition-transform duration-200 ${showMatchHistory ? "rotate-180" : ""}`} />
              </button>

              {showMatchHistory && (
                <div className="mt-1.5 space-y-1">
                  {data.matches.map((match) => {
                    const lead = data.leads.find((l) => l.id === match.lead_id)
                    const isCurrent = match.id === activeMatchId
                    return (
                      <Card
                        key={match.id}
                        className={`px-2.5 py-2 hover:shadow-sm transition-all cursor-pointer active:scale-[0.99] rounded-lg ${isCurrent ? "border-primary bg-primary/5" : "border-border"}`}
                        onClick={() => {
                          if (!isCurrent) fetchClinicDetails(match.id)
                        }}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-muted-foreground text-[10px] w-11 flex-shrink-0">
                              {new Date(match.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </span>
                            <span className="text-foreground font-medium text-xs truncate">{lead?.treatment_interest || "Dental enquiry"}</span>
                            {isCurrent && <span className="text-[9px] text-[#0fbcb0] font-semibold flex-shrink-0">Current</span>}
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        </div>
                      </Card>
                    )
                  })}
                  {hasMoreMatches && (
                    <button onClick={loadMoreMatches} disabled={loadingMoreMatches} className="text-[11px] text-muted-foreground hover:underline mt-1 font-medium">
                      {loadingMoreMatches ? "Loading..." : "Load more"}
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Bottom padding */}
          <div className={`${isMobile && showStickyBar ? "pb-16" : "pb-2"}`} />
        </div>

        {/* Columns reordered via CSS order: clinic=1, toggle=2, chat=3 */}
      </div>

      {/* ══════ MOBILE: Chat Full-Screen Overlay ══════ */}
      {isMobile && mobileChatOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-card"
          style={{ height: "100dvh" }}
        >
          {/* Header */}
          <div className="flex-shrink-0 border-b border-border/30 bg-card px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                {chatHeaderImage ? (
                  <div className="relative w-9 h-9 rounded overflow-hidden flex-shrink-0 bg-muted ring-1 ring-border/40">
                    <ClinicImage src={chatHeaderImage} alt={chatHeaderName || "Clinic"} fill className="object-cover w-full h-full" fallbackClassName="w-full h-full bg-primary flex items-center justify-center" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-semibold">
                      {(chatHeaderName || "C").charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate text-left">{chatHeaderName || "Clinic"}</p>
                  <p className={`text-[10px] font-medium ${isClosed ? "text-muted-foreground" : isMuted ? "text-muted-foreground" : "text-primary"}`}>
                    {isClosed ? "Conversation closed" : isMuted ? "Notifications muted" : "Chatting now"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Three-dot menu (mobile) */}
                {selectedConv && !isInPendingChat && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-full hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {!isClosed && (
                        <DropdownMenuItem onClick={() => setShowCloseDialog(true)} className="text-red-600 focus:text-red-600">
                          <Lock className="w-4 h-4 mr-2" />
                          Close conversation
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={handleToggleMute} disabled={isMuting}>
                        {isMuted ? (
                          <>
                            <Bell className="w-4 h-4 mr-2" />
                            Unmute notifications
                          </>
                        ) : (
                          <>
                            <BellOff className="w-4 h-4 mr-2" />
                            Mute notifications
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <button
                  onClick={() => {
                    setMobileChatOpen(false)
                    if (mobileInboxListOpen) return
                  }}
                  className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile appointment banner */}
          {selectedConv?.appointment_requested_at && latestMatchLead?.booking_clinic_id === selectedConv.clinic_id && (
            <div className="px-3 pt-2 pb-0 flex-shrink-0">
              <AppointmentBanner
                bookingDate={latestMatchLead.booking_date}
                bookingTime={latestMatchLead.booking_time}
                requestedAt={selectedConv.appointment_requested_at}
                compact
              />
            </div>
          )}

          {/* Messages */}
          <div
            ref={mobileMessagesRef}
            className="flex-1 overflow-y-auto overscroll-contain px-3 py-2 min-h-0 bg-card"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {loadingMessages ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center mx-auto">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground/80">
                    Chat with {chatHeaderName || "the clinic"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
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
                      className={`max-w-[82%] rounded-lg px-3 py-1.5 ${
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
                      <p className={`text-[14px] leading-relaxed whitespace-pre-wrap ${msg.sender_type === "bot" ? "text-foreground/70" : ""}`}>
                        {msg.content}
                      </p>
                      <p className={`text-[10px] mt-0.5 ${
                        msg.sender_type === "patient" ? "text-white/50 text-right" : "text-muted-foreground/60"
                      }`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                {(otherTyping || botTyping) && (
                  <div className="flex justify-start">
                    <div className="bg-secondary border border-border rounded-lg rounded-bl-sm px-3.5 py-2">
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

          {/* Closed conversation banner (mobile) */}
          {isClosed && (
            <div className="px-3 py-2 border-t border-border/30 flex-shrink-0 bg-muted/50">
              <p className="text-xs text-muted-foreground text-center">This conversation has been closed. Looking for a dentist? <Link href="/intake" className="underline text-primary hover:text-primary/80">Start a new search</Link> to get matched with clinics.</p>
            </div>
          )}

          {/* Quick prompts */}
          {!isClosed && messages.length <= 2 && (
            <div className="flex gap-1.5 px-3 py-2 overflow-x-auto flex-shrink-0 border-t border-border/30 bg-card">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setNewMessage(prompt)}
                  className="text-[11px] text-muted-foreground border border-border/60 rounded-md px-2.5 py-1 hover:border-primary/40 hover:text-primary active:bg-primary/10 transition-colors whitespace-nowrap flex-shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Error feedback */}
          {chatError && (
            <div className="px-3 py-1.5 flex-shrink-0 bg-card">
              {chatError.includes("session has expired") ? (
                <p className="text-xs text-red-500">
                  {chatError}{" "}
                  <a href="/patient/login?next=/patient/dashboard" className="underline font-medium hover:text-red-700">
                    Log in
                  </a>
                </p>
              ) : (
                <p className="text-xs text-red-500">{chatError}</p>
              )}
            </div>
          )}

          {/* Composer */}
          {!isClosed && (
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 px-3 py-2.5 border-t border-border/30 flex-shrink-0 bg-card"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom, 12px), 12px)" }}
          >
            <Input
              value={newMessage}
              onChange={(e) => { setNewMessage(e.target.value); sendTyping(); setChatError(null) }}
              placeholder="Type a message..."
              className="flex-1 text-base rounded-md border border-border h-10 focus-visible:ring-ring/30"
              disabled={isSending}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newMessage.trim() || isSending}
              className="bg-primary hover:bg-primary/90 text-white h-10 w-10 rounded-md shrink-0 active:scale-95 transition-transform"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
          )}
        </div>
      )}

      {/* ══════ MOBILE: Full-Screen Inbox List ══════ */}
      {isMobile && mobileInboxListOpen && !mobileChatOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-card"
          style={{ height: "100dvh" }}
        >
          {/* Header */}
          <div className="flex-shrink-0 border-b border-border/30 bg-card px-3 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground text-sm">Inbox</h2>
                {totalUnread > 0 && (
                  <span className="bg-primary text-white text-[9px] font-bold w-[18px] h-[18px] rounded-full inline-flex items-center justify-center">
                    {totalUnread}
                  </span>
                )}
              </div>
              <button
                onClick={() => setMobileInboxListOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            {inboxConversations.length === 0 && !isInPendingChat ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center mb-3">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground/70 mb-1">No conversations yet</p>
                <p className="text-xs text-muted-foreground">Message a clinic to start a conversation</p>
              </div>
            ) : (
              <div className="px-3 py-2 space-y-1.5">
                {/* Pending chat card */}
                {isInPendingChat && pendingChatClinic && (
                  <button
                    onClick={() => {
                      setMobileChatOpen(true)
                    }}
                    className="w-full text-left p-2.5 rounded border-2 border-primary bg-primary/5 flex gap-2.5 active:scale-[0.99] transition-transform"
                  >
                    <div className="w-9 h-9 rounded bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-semibold">
                        {pendingChatClinic.clinicName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">{pendingChatClinic.clinicName}</p>
                      <p className="text-[11px] text-primary font-medium">New conversation</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 self-center flex-shrink-0" />
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
                    className={`w-full text-left p-2.5 rounded flex gap-2.5 active:scale-[0.99] transition-all border-b border-border/20 last:border-b-0 ${
                      conv.unread_by_patient
                        ? "bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    {/* Clinic image */}
                    <div className="flex-shrink-0">
                      {conv.clinics?.images?.[0] ? (
                        <div className="relative w-9 h-9 rounded overflow-hidden bg-muted">
                          <ClinicImage src={conv.clinics.images[0]} alt={conv.clinics.name || "Clinic"} fill className="object-cover w-full h-full" fallbackClassName="w-full h-full bg-primary flex items-center justify-center" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded bg-primary flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {(conv.clinics?.name || "C").charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[13px] truncate ${conv.unread_by_patient ? "font-bold text-foreground" : "font-semibold text-foreground/80"}`}>
                          {conv.clinics?.name || "Clinic"}
                        </p>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {conv.last_message_at ? formatTime(conv.last_message_at) : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted-foreground/70 truncate pr-2 leading-snug">
                          {conv.latest_message || "No messages yet"}
                        </p>
                        {conv.unread_by_patient && conv.unread_count_patient > 0 && (
                          <span className="bg-primary text-white text-[9px] font-bold w-[18px] h-[18px] rounded-full inline-flex items-center justify-center flex-shrink-0">
                            {conv.unread_count_patient}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 self-center flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sticky "See Dashboard" button at bottom */}
          <div
            className="flex-shrink-0 border-t border-border/30 bg-card/95 backdrop-blur-md px-3 py-2.5 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom, 12px), 12px)" }}
          >
            <button
              onClick={() => setMobileInboxListOpen(false)}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-[#004443] text-white text-sm font-semibold active:scale-[0.98] transition-transform"
            >
              <Search className="w-4 h-4" />
              See Dashboard
            </button>
          </div>
        </div>
      )}

      {/* ══════ MOBILE: Sticky Bottom Action Bar ══════ */}
      {isMobile && selectedClinic && !mobileChatOpen && !mobileInboxListOpen && stickyBarDeferred && (
        <div
          className={`fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur-md border-t border-border/40 shadow-[0_-2px_10px_rgba(0,0,0,0.04)] px-3 py-2.5 pb-5 transition-all duration-300 ${
            showStickyBar ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
          }`}
        >
          <div className="flex gap-2">
            <Button
              className="flex-1 h-9 bg-primary text-white border-0 font-semibold text-sm rounded-md active:scale-[0.98] transition-transform"
              onClick={handleMessageClick}
            >
              <MessageCircle className="w-4 h-4 mr-1.5 flex-shrink-0" />
              Message
              {totalUnread > 0 && (
                <span className="ml-1.5 bg-white/20 text-white text-[9px] font-bold w-[18px] h-[18px] rounded-full inline-flex items-center justify-center">
                  {totalUnread}
                </span>
              )}
            </Button>
            {!appointmentRequestedClinics.has(selectedClinic.id) && (
              <Button
                className="flex-1 h-9 rounded-md text-sm font-semibold bg-[var(--dark-teal-bg)] hover:bg-[var(--dark-teal-bg)]/90 text-white border-0 active:scale-[0.98] transition-transform"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                <CalendarCheck className="w-4 h-4 mr-1.5 flex-shrink-0" />
                Book
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Close conversation confirmation dialog */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently close the conversation with {chatHeaderName || "this clinic"}. Neither you nor the clinic will be able to send further messages. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloseConversation}
              disabled={isClosing}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isClosing ? "Closing…" : "Close conversation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
