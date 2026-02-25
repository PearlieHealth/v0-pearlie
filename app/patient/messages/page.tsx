"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useChatChannel, type RealtimeMessage } from "@/hooks/use-chat-channel"
import {
  Heart,
  Loader2,
  MessageCircle,
  Send,
  LogOut,
  Check,
  CheckCheck,
  ChevronLeft,
  MoreVertical,
  CalendarCheck,
  XCircle,
  BellOff,
  Bell,
  Lock,
} from "lucide-react"
import Link from "next/link"
import { AppointmentBanner } from "@/components/appointment-banner"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"

type ConversationState = "open" | "booked" | "closed"

interface Conversation {
  id: string
  clinic_id: string
  lead_id: string
  status: string
  last_message_at: string
  unread_by_patient: boolean
  unread_count_patient: number
  clinics: { id: string; name: string; images?: string[] } | null
  latest_message: string | null
  latest_message_sender: string | null
  appointment_requested_at?: string | null
  conversation_state?: ConversationState
  booked_at?: string | null
  closed_at?: string | null
  closed_reason?: string | null
  muted_by_patient?: boolean
}

interface Message {
  id: string
  content: string
  sender_type: "patient" | "clinic" | "bot"
  status?: "sent" | "delivered" | "read"
  created_at: string
}

type TabFilter = "active" | "booked" | "closed"

export default function PatientMessagesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const conversationIdParam = searchParams?.get("conversationId")
  const isValidConversationId = conversationIdParam && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationIdParam)
  const [isMobile, setIsMobile] = useState(false)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const autoSelectedRef = useRef(false)
  const [activeClinicId, setActiveClinicId] = useState<string | null>(null)
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null)
  const [bookingInfo, setBookingInfo] = useState<{ date: string | null; time: string | null; requestedAt: string | null }>({ date: null, time: null, requestedAt: null })

  // Messaging controls state
  const [activeTab, setActiveTab] = useState<TabFilter>("active")
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [isUpdatingState, setIsUpdatingState] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const actionMenuRef = useRef<HTMLDivElement>(null)

  // Close action menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setShowActionMenu(false)
      }
    }
    if (showActionMenu) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showActionMenu])

  // ── Match lg: breakpoint (1024px) for mobile/tablet layout ──────
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)")
    const onChange = () => setIsMobile(mql.matches)
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  // ── Auth check ───────────────────────────────────────────────────
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()

      let user = null
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: { user: u } } = await supabase.auth.getUser()
        if (u) { user = u; break }
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1000))
      }

      if (!user) {
        const returnUrl = `/patient/messages${isValidConversationId ? `?conversationId=${conversationIdParam}` : ""}`
        router.replace(`/patient/login?next=${encodeURIComponent(returnUrl)}`)
        return
      }
      fetchConversations()
    }
    checkAuth()
  }, [])

  // ── Realtime: messages in the active conversation ────────────────
  const handleNewMessage = useCallback((msg: RealtimeMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev
      return [...prev, msg as unknown as Message].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    })
  }, [])

  const handleStatusChange = useCallback((msgId: string, status: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, status: status as Message["status"] } : m))
    )
  }, [])

  const { otherTyping: clinicTyping, sendTyping } = useChatChannel({
    conversationId: selectedConversation?.id || null,
    userType: "patient",
    onNewMessage: handleNewMessage,
    onStatusChange: handleStatusChange,
    enabled: !!selectedConversation,
  })

  // ── Fallback polling ─────────────────────────────────────────────
  useEffect(() => {
    if (!selectedConversation) return
    const interval = setInterval(() => fetchMessagesForConversation(selectedConversation.id), 30000)
    return () => clearInterval(interval)
  }, [selectedConversation])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Auto-select conversation from URL param
  useEffect(() => {
    if (isValidConversationId && conversations.length > 0 && !autoSelectedRef.current) {
      const conv = conversations.find((c) => c.id === conversationIdParam)
      if (conv) {
        autoSelectedRef.current = true
        // Switch to the correct tab for this conversation
        const state = conv.conversation_state || "open"
        if (state === "booked") setActiveTab("booked")
        else if (state === "closed") setActiveTab("closed")
        else setActiveTab("active")
        selectConversation(conv)
      }
    }
  }, [conversations, conversationIdParam])

  // ── Filter conversations by tab ────────────────────────────────
  const filteredConversations = conversations.filter((conv) => {
    const state = conv.conversation_state || "open"
    if (activeTab === "active") return state === "open"
    if (activeTab === "booked") return state === "booked"
    return state === "closed"
  })

  const tabCounts = {
    active: conversations.filter((c) => (c.conversation_state || "open") === "open").length,
    booked: conversations.filter((c) => c.conversation_state === "booked").length,
    closed: conversations.filter((c) => c.conversation_state === "closed").length,
  }

  const isClosed = selectedConversation?.conversation_state === "closed"

  // ── Data fetching ────────────────────────────────────────────────
  async function fetchConversations() {
    try {
      const response = await fetch("/api/patient/conversations")
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
        setError(null)
      } else if (response.status === 401) {
        router.replace("/patient/login")
      } else {
        setError("Couldn't load conversations. Please try again.")
      }
    } catch {
      setError("Couldn't load conversations. Check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchMessagesForConversation(conversationId: string) {
    try {
      const response = await fetch(`/api/patient/conversations/${conversationId}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        setActiveClinicId(data.clinicId || null)
        setActiveLeadId(data.leadId || null)
      }
    } catch {
      console.warn("[messages] Background poll failed for", conversationId)
    }
  }

  async function selectConversation(conv: Conversation) {
    setSelectedConversation(conv)
    setIsLoadingMessages(true)
    setError(null)
    setBookingInfo({ date: null, time: null, requestedAt: null })
    setShowActionMenu(false)

    try {
      const response = await fetch(`/api/patient/conversations/${conv.id}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        setActiveClinicId(data.clinicId || null)
        setActiveLeadId(data.leadId || null)
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conv.id ? { ...c, unread_by_patient: false, unread_count_patient: 0 } : c
          )
        )
      }
      if (conv.appointment_requested_at) {
        const statusRes = await fetch(`/api/booking/status?leadId=${conv.lead_id}&clinicId=${conv.clinic_id}`)
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          if (statusData.alreadyRequested) {
            setBookingInfo({
              date: statusData.bookingDate || null,
              time: statusData.bookingTime || null,
              requestedAt: conv.appointment_requested_at || null,
            })
          }
        }
      }
    } catch {
      setError("Failed to load messages")
    } finally {
      setIsLoadingMessages(false)
    }
  }

  // ── Conversation state actions ─────────────────────────────────
  async function handleConversationAction(action: "closed" | "mute" | "unmute") {
    if (!selectedConversation || isUpdatingState) return
    setIsUpdatingState(true)
    setShowActionMenu(false)

    try {
      const response = await fetch(`/api/patient/conversations/${selectedConversation.id}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      if (response.ok) {
        const data = await response.json()

        if (action === "closed") {
          const newState = data.state as ConversationState
          setConversations((prev) =>
            prev.map((c) =>
              c.id === selectedConversation.id
                ? {
                    ...c,
                    conversation_state: newState,
                    closed_at: new Date().toISOString(),
                    closed_reason: "patient_not_interested",
                  }
                : c
            )
          )
          setSelectedConversation((prev) =>
            prev ? { ...prev, conversation_state: newState } : prev
          )
          setActiveTab("closed")
          // Re-fetch messages to get the system message
          await fetchMessagesForConversation(selectedConversation.id)
        }

        if (action === "mute" || action === "unmute") {
          const muted = data.muted
          setConversations((prev) =>
            prev.map((c) =>
              c.id === selectedConversation.id ? { ...c, muted_by_patient: muted } : c
            )
          )
          setSelectedConversation((prev) =>
            prev ? { ...prev, muted_by_patient: muted } : prev
          )
        }
      } else {
        const errData = await response.json().catch(() => ({}))
        setError(errData.error || "Failed to update conversation.")
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsUpdatingState(false)
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedConversation || !newMessage.trim() || isSending || isClosed) return

    const messageText = newMessage.trim()

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
    setError(null)

    try {
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: activeLeadId || selectedConversation.lead_id,
          clinicId: activeClinicId || selectedConversation.clinic_id,
          content: messageText,
          senderType: "patient",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages((prev) => prev.map((m) => m.id === tempId ? data.message : m))
        if (data.botMessages?.length) {
          data.botMessages.forEach((botMsg: Message, i: number) => {
            setTimeout(() => {
              setMessages((prev) => {
                if (prev.some((m) => m.id === botMsg.id)) return prev
                return [...prev, botMsg].sort(
                  (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )
              })
            }, (i + 1) * 1500)
          })
        }
      } else if (response.status === 403) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        const errData = await response.json().catch(() => ({}))
        if (errData.reason === "conversation_closed") {
          // Update local state so banner shows and composer hides
          setConversations((prev) =>
            prev.map((c) =>
              c.id === selectedConversation?.id ? { ...c, conversation_state: "closed" as const } : c
            )
          )
          setSelectedConversation((prev) =>
            prev ? { ...prev, conversation_state: "closed" as const } : prev
          )
          setActiveTab("closed")
        } else {
          setError(errData.error || "Please verify your email before sending messages.")
        }
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        const errData = await response.json().catch(() => ({}))
        setError(errData.error || "Failed to send message.")
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setError("Something went wrong. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    try { localStorage.removeItem("pearlie_last_match") } catch {}
    window.location.href = "/patient/login"
  }

  // ── Formatting helpers ───────────────────────────────────────────
  const formatTime = (date: string | null) => {
    if (!date) return ""
    const d = new Date(date)
    if (isNaN(d.getTime())) return ""
    const now = new Date()
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60)
    if (diffHours < 24) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    if (diffHours < 168) return d.toLocaleDateString("en-GB", { weekday: "short" })
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  }

  const formatMessageTime = (date: string) =>
    new Date(date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })

  const formatDate = (date: string) => {
    const d = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return "Today"
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  }

  const StatusIcon = ({ status }: { status?: string }) => {
    if (!status || status === "sent") return <Check className="h-2.5 w-2.5 text-[#777]" />
    if (status === "delivered") return <CheckCheck className="h-2.5 w-2.5 text-[#777]" />
    return <CheckCheck className="h-2.5 w-2.5 text-teal-500" />
  }

  const getClinicInitial = (name: string | undefined) => (name ? name.charAt(0).toUpperCase() : "C")

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count_patient || 0), 0)

  const groupedMessages = messages.reduce<Record<string, Message[]>>((groups, message) => {
    const date = formatDate(message.created_at)
    if (!groups[date]) groups[date] = []
    groups[date].push(message)
    return groups
  }, {})

  // ── State badge component ──────────────────────────────────────
  const StateBadge = ({ state }: { state?: ConversationState }) => {
    if (!state || state === "open") return null
    if (state === "booked") {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
          <CalendarCheck className="h-2.5 w-2.5" />
          Booked
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#999] bg-[#f0f0f0] border border-[#e0e0e0] px-1.5 py-0.5 rounded-full">
        <Lock className="h-2.5 w-2.5" />
        Closed
      </span>
    )
  }

  // ── Closed banner ──────────────────────────────────────────────
  const ClosedBanner = () => (
    <div className="px-4 py-2.5 bg-[#f5f5f5] border-b border-[#e5e5e5] flex items-center gap-2">
      <Lock className="h-3.5 w-3.5 text-[#999] flex-shrink-0" />
      <span className="text-xs text-[#666]">This conversation is closed. Looking for a dentist? <Link href="/intake" className="underline text-teal-600 hover:text-teal-700">Start a new search</Link> to get matched with clinics.</span>
    </div>
  )

  // ── Tab bar component ──────────────────────────────────────────
  const TabBar = ({ className = "" }: { className?: string }) => (
    <div className={`flex border-b border-[#e5e5e5] ${className}`}>
      {(["active", "booked", "closed"] as TabFilter[]).map((tab) => (
        <button
          key={tab}
          onClick={() => {
            setActiveTab(tab)
            setSelectedConversation(null)
          }}
          className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors relative ${
            activeTab === tab
              ? "text-foreground"
              : "text-[#999] hover:text-[#666]"
          }`}
        >
          {tab === "active" ? "Active" : tab === "booked" ? "Booked" : "Closed"}
          {tabCounts[tab] > 0 && (
            <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${
              activeTab === tab ? "bg-[#1a1a1a] text-white" : "bg-[#eee] text-[#666]"
            }`}>
              {tabCounts[tab]}
            </span>
          )}
          {activeTab === tab && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1a1a1a]" />
          )}
        </button>
      ))}
    </div>
  )

  // ── Action menu component ──────────────────────────────────────
  const ActionMenu = ({ compact = false }: { compact?: boolean }) => {
    if (!selectedConversation || isClosed) return null
    const isMuted = selectedConversation.muted_by_patient

    return (
      <div className="relative" ref={actionMenuRef}>
        <button
          onClick={() => setShowActionMenu(!showActionMenu)}
          className="p-1.5 text-[#666] hover:text-foreground hover:bg-[#f5f5f5] rounded-full transition-colors"
          disabled={isUpdatingState}
        >
          {isUpdatingState ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreVertical className="h-4 w-4" />
          )}
        </button>

        {showActionMenu && (
          <div className={`absolute ${compact ? "right-0" : "right-0"} top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-[#e5e5e5] py-1 z-50`}>
            <button
              onClick={() => {
                setShowActionMenu(false)
                setShowCloseConfirm(true)
              }}
              className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-[#f5f5f5] flex items-center gap-2.5 transition-colors"
            >
              <XCircle className="h-4 w-4 text-red-500" />
              Close conversation
            </button>
            <button
              onClick={() => handleConversationAction(isMuted ? "unmute" : "mute")}
              className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-[#f5f5f5] flex items-center gap-2.5 transition-colors"
            >
              {isMuted ? (
                <>
                  <Bell className="h-4 w-4 text-[#666]" />
                  Unmute notifications
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4 text-[#666]" />
                  Mute notifications
                </>
              )}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Loading state ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-[#f8f7f4]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // ── Mobile: show chat full screen when conversation selected ─────
  if (isMobile && selectedConversation) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col h-[100dvh]">
        {/* Mobile chat header */}
        <div className="flex-shrink-0 bg-white border-b border-[#e5e5e5] px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button
            onClick={() => setSelectedConversation(null)}
            className="p-1 -ml-1 text-[#666] hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {getClinicInitial(selectedConversation.clinics?.name)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground text-sm truncate">
                  {selectedConversation.clinics?.name || "Clinic"}
                </span>
                <StateBadge state={selectedConversation.conversation_state} />
                {selectedConversation.muted_by_patient && (
                  <BellOff className="h-3 w-3 text-[#999] flex-shrink-0" />
                )}
              </div>
            </div>
          </div>
          <ActionMenu compact />
        </div>

        {/* Closed banner */}
        {isClosed && <ClosedBanner />}

        {/* Appointment banner */}
        {bookingInfo.date && (
          <div className="px-3 pt-2.5 pb-0 flex-shrink-0">
            <AppointmentBanner
              bookingDate={bookingInfo.date}
              bookingTime={bookingInfo.time}
              requestedAt={bookingInfo.requestedAt}
              compact
            />
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#fafafa]">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin text-[#999]" />
            </div>
          ) : (
            renderMessages()
          )}
        </div>

        {/* Typing indicator */}
        {clinicTyping && !isClosed && (
          <div className="px-3 py-1.5 bg-white">
            <div className="flex items-center gap-2 text-[11px] text-[#999]">
              <span className="flex gap-0.5">
                <span className="w-1 h-1 bg-[#999] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 bg-[#999] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-1 bg-[#999] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
              {selectedConversation.clinics?.name || "Clinic"} is typing...
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-3 py-2 bg-red-50 border-t border-red-100">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Input — hidden when closed */}
        {!isClosed && (
          <form onSubmit={handleSend} className="flex-shrink-0 border-t border-[#e5e5e5] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white overflow-hidden">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value)
                  sendTyping()
                  if (error) setError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend(e)
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 min-w-0 text-sm border border-[#ddd] rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/20 focus:border-[#1a1a1a] bg-white"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="flex-shrink-0 h-10 w-10 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center hover:bg-[#333] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>
        )}

        {/* Close conversation confirmation dialog */}
        <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Close this conversation?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently close the conversation with{" "}
                <span className="font-medium text-foreground">
                  {selectedConversation?.clinics?.name || "this clinic"}
                </span>
                . You won&apos;t be able to send or receive new messages. This can&apos;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleConversationAction("closed")}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                Close conversation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // ── Mobile: conversation list (app-like, edge-to-edge) ──────────
  if (isMobile) {
    return (
      <div className="flex flex-col h-[100dvh] bg-white">
        {/* Compact header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#e5e5e5]">
          <div className="flex items-center gap-3">
            <Link href="/patient/dashboard" className="p-1 -ml-1 text-[#666] hover:text-foreground">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-semibold text-foreground text-lg flex items-center gap-2">
              Messages
              {totalUnread > 0 && (
                <span className="bg-primary text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-full">
                  {totalUnread}
                </span>
              )}
            </h1>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 text-[#666] hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <TabBar />

        {error && !isLoading && conversations.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <MessageCircle className="h-10 w-10 text-red-300 mb-2" />
            <p className="text-[#666] font-medium">{error}</p>
            <button
              onClick={() => { setError(null); setIsLoading(true); fetchConversations() }}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <MessageCircle className="h-10 w-10 text-[#ccc] mb-2" />
            <p className="text-[#666] font-medium">
              {activeTab === "active" && conversations.length === 0
                ? "No conversations yet"
                : `No ${activeTab} conversations`}
            </p>
            {activeTab === "active" && conversations.length === 0 && (
              <>
                <p className="text-sm text-[#999] mt-1">
                  Message a clinic from your match results to start chatting.
                </p>
                <Link href="/patient/dashboard" className="mt-4 text-sm text-primary hover:underline">
                  Go to dashboard
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-[#f0f0f0]">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full px-4 py-3.5 text-left active:bg-[#f5f3ff] transition-colors ${
                    conv.unread_by_patient ? "bg-[#faf8ff]" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-base font-semibold">
                        {getClinicInitial(conv.clinics?.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className={`text-[15px] truncate ${conv.unread_by_patient ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                            {conv.clinics?.name || "Clinic"}
                          </p>
                          {conv.muted_by_patient && <BellOff className="h-3 w-3 text-[#ccc] flex-shrink-0" />}
                        </div>
                        <span className="text-[11px] text-[#999] flex-shrink-0 ml-2">
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>
                      {conv.latest_message && (
                        <p className={`text-[13px] truncate mt-0.5 ${conv.unread_by_patient ? "text-[#333]" : "text-[#888]"}`}>
                          {conv.latest_message_sender === "patient" ? "You: " : ""}
                          {conv.latest_message}
                        </p>
                      )}
                    </div>
                    {conv.unread_by_patient && (
                      <div className="flex-shrink-0">
                        {(conv.unread_count_patient || 0) > 0 ? (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5">
                            {conv.unread_count_patient}
                          </span>
                        ) : (
                          <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Render messages helper ───────────────────────────────────────
  function renderMessages() {
    if (messages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center py-12">
          <MessageCircle className="h-8 w-8 text-[#ccc] mb-2" />
          <p className="text-sm font-medium text-[#666]">No messages yet</p>
        </div>
      )
    }

    return Object.entries(groupedMessages).map(([date, dateMessages]) => (
      <div key={date}>
        <div className="flex items-center justify-center mb-3">
          <span className="text-[10px] text-[#999] bg-[#eee] px-2 py-0.5 rounded-full">{date}</span>
        </div>
        <div className="space-y-2">
          {dateMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender_type === "patient"
                  ? "justify-end"
                  : msg.sender_type === "bot"
                  ? "justify-center"
                  : "justify-start"
              }`}
            >
              {msg.sender_type === "bot" ? (
                <div className="max-w-[90%] flex items-start gap-2 bg-gradient-to-r from-teal-50 to-[#faf3e6] border border-teal-100/50 rounded-xl px-3 py-2">
                  <Heart className="w-3 h-3 text-[#0fbcb0] mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-[#555] whitespace-pre-wrap">{msg.content}</p>
                </div>
              ) : (
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    msg.sender_type === "patient"
                      ? "bg-[#1a1a1a] text-white rounded-br-md"
                      : "bg-white border border-[#e5e5e5] text-[#333] rounded-bl-md"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <div
                    className={`flex items-center gap-1 mt-1 ${
                      msg.sender_type === "patient" ? "text-[#999] justify-end" : "text-[#aaa]"
                    }`}
                  >
                    <span className="text-[10px]">{formatMessageTime(msg.created_at)}</span>
                    {msg.sender_type === "patient" && <StatusIcon status={msg.status} />}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    ))
  }

  // ── Desktop layout ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="rounded-full bg-primary p-2">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="font-semibold text-xl text-primary">Pearlie</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/patient/dashboard"
              className="text-sm text-[#666] hover:text-foreground transition-colors hidden sm:block"
            >
              Dashboard
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm text-[#666] hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-primary" />
          Messages
          {totalUnread > 0 && (
            <span className="bg-primary text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              {totalUnread}
            </span>
          )}
        </h1>

        {error && !isLoading && conversations.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e5e5e5] p-12 text-center">
            <MessageCircle className="h-12 w-12 text-red-300 mx-auto mb-3" />
            <p className="text-[#666] font-medium">{error}</p>
            <button
              onClick={() => { setError(null); setIsLoading(true); fetchConversations() }}
              className="inline-block mt-4 text-sm text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e5e5e5] p-12 text-center">
            <MessageCircle className="h-12 w-12 text-[#ccc] mx-auto mb-3" />
            <p className="text-[#666] font-medium">No conversations yet</p>
            <p className="text-sm text-[#999] mt-1">
              Message a clinic from your match results to start chatting.
            </p>
            <Link
              href="/patient/dashboard"
              className="inline-block mt-4 text-sm text-primary hover:underline"
            >
              Go to dashboard
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-[380px_1fr] gap-6">
            {/* Conversation List */}
            <div className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden">
              {/* Tabs */}
              <TabBar />

              <div className="divide-y divide-[#e5e5e5]">
                {filteredConversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageCircle className="h-8 w-8 text-[#ddd] mx-auto mb-2" />
                    <p className="text-sm text-[#999]">No {activeTab} conversations</p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={`w-full p-4 text-left hover:bg-[#fafafa] transition-colors ${
                        selectedConversation?.id === conv.id ? "bg-[#f5f3ff]" : ""
                      } ${conv.unread_by_patient ? "bg-[#f8f5ff]" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-white text-sm font-semibold">
                            {getClinicInitial(conv.clinics?.name)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="font-semibold text-foreground text-sm truncate">
                                {conv.clinics?.name || "Clinic"}
                              </p>
                              {conv.muted_by_patient && <BellOff className="h-3 w-3 text-[#ccc] flex-shrink-0" />}
                            </div>
                            <span className="text-[10px] text-[#999] flex-shrink-0 ml-2">
                              {formatTime(conv.last_message_at)}
                            </span>
                          </div>
                          {conv.latest_message && (
                            <p className="text-xs text-[#666] truncate mt-1">
                              {conv.latest_message_sender === "patient" ? "You: " : ""}
                              {conv.latest_message}
                            </p>
                          )}
                        </div>
                        {conv.unread_by_patient && (
                          <div className="flex-shrink-0 mt-1">
                            {(conv.unread_count_patient || 0) > 0 ? (
                              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5">
                                {conv.unread_count_patient}
                              </span>
                            ) : (
                              <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Chat Panel (desktop only) */}
            <div className="flex bg-white rounded-xl border border-[#e5e5e5] overflow-hidden flex-col" style={{ height: "calc(100vh - 220px)", minHeight: "500px" }}>
              {!selectedConversation ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[#999]">
                  <MessageCircle className="h-12 w-12 text-[#ddd] mb-3" />
                  <p className="font-medium text-[#666]">Select a conversation</p>
                  <p className="text-sm">Choose a conversation to view messages</p>
                </div>
              ) : (
                <>
                  {/* Chat header */}
                  <div className="flex-shrink-0 border-b border-[#e5e5e5] px-5 py-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {getClinicInitial(selectedConversation.clinics?.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {selectedConversation.clinics?.name || "Clinic"}
                        </span>
                        <StateBadge state={selectedConversation.conversation_state} />
                        {selectedConversation.muted_by_patient && (
                          <BellOff className="h-3.5 w-3.5 text-[#999]" />
                        )}
                      </div>
                    </div>
                    <ActionMenu />
                  </div>

                  {/* Closed banner */}
                  {isClosed && <ClosedBanner />}

                  {/* Desktop appointment banner */}
                  {bookingInfo.date && (
                    <div className="px-5 pt-2.5 pb-0 flex-shrink-0">
                      <AppointmentBanner
                        bookingDate={bookingInfo.date}
                        bookingTime={bookingInfo.time}
                        requestedAt={bookingInfo.requestedAt}
                        compact
                      />
                    </div>
                  )}

                  {/* Messages */}
                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fafafa] min-h-0">
                    {isLoadingMessages ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-5 w-5 animate-spin text-[#999]" />
                      </div>
                    ) : (
                      renderMessages()
                    )}
                  </div>

                  {/* Typing indicator */}
                  {clinicTyping && !isClosed && (
                    <div className="px-4 py-1.5 bg-white">
                      <div className="flex items-center gap-2 text-[11px] text-[#999]">
                        <span className="flex gap-0.5">
                          <span className="w-1 h-1 bg-[#999] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1 h-1 bg-[#999] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1 h-1 bg-[#999] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                        {selectedConversation.clinics?.name || "Clinic"} is typing...
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="px-4 py-2 bg-red-50 border-t border-red-100">
                      <p className="text-xs text-red-600">{error}</p>
                    </div>
                  )}

                  {/* Input — hidden when closed */}
                  {!isClosed ? (
                    <form onSubmit={handleSend} className="flex-shrink-0 border-t border-[#e5e5e5] p-3 bg-white overflow-hidden">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => {
                            setNewMessage(e.target.value)
                            sendTyping()
                            if (error) setError(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              handleSend(e)
                            }
                          }}
                          placeholder="Type a message..."
                          className="flex-1 min-w-0 text-sm border border-[#ddd] rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/20 focus:border-[#1a1a1a] bg-white"
                          disabled={isSending}
                        />
                        <button
                          type="submit"
                          disabled={!newMessage.trim() || isSending}
                          className="flex-shrink-0 h-10 w-10 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center hover:bg-[#333] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isSending ? (
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </form>
                  ) : null}
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Close conversation confirmation dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently close the conversation with{" "}
              <span className="font-medium text-foreground">
                {selectedConversation?.clinics?.name || "this clinic"}
              </span>
              . You won&apos;t be able to send or receive new messages. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleConversationAction("closed")}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Close conversation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
