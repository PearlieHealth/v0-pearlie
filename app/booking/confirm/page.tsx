"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MapPin, Calendar, Clock, CheckCircle2, Loader2, ArrowLeft, MessageCircle, Send, Heart } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { HOURLY_SLOTS } from "@/lib/constants"
import { trackTikTokEvent } from "@/lib/tiktok-pixel"
import { createClient } from "@/lib/supabase/client"
import { useChatChannel, type RealtimeMessage } from "@/hooks/use-chat-channel"
import { AppointmentBanner } from "@/components/appointment-banner"

interface Clinic {
  id: string
  name: string
  address: string
  postcode: string
  phone: string
  images?: string[]
  city?: string
}

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  treatment_interest: string
}

interface Message {
  id: string
  content: string
  sender_type: "patient" | "clinic" | "bot"
  status?: "sent" | "delivered" | "read"
  created_at: string
}

export default function BookingConfirmPage() {
  const searchParams = useSearchParams()
  const clinicId = searchParams.get("clinicId")
  const leadId = searchParams.get("leadId")
  const matchId = searchParams.get("matchId")
  const dateStr = searchParams.get("date")
  const time = searchParams.get("time")

  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Chat state (used after booking confirmation)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [botTyping, setBotTyping] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  // Bot message IDs queued for delayed display
  const delayedBotMsgIds = useRef<Set<string>>(new Set())

  // Parse the date
  const appointmentDate = dateStr ? new Date(dateStr) : null
  const timeLabel = HOURLY_SLOTS.find((s) => s.key === time)?.label || time

  // Auto-login and fetch messages after booking is confirmed
  const performAutoLogin = useCallback(async (tokenHash: string) => {
    try {
      const supabase = createClient()
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "magiclink",
      })
      if (!otpError) {
        setIsAuthenticated(true)
        return true
      }
      console.warn("[booking-confirm] Auto-login failed:", otpError.message)
    } catch (err) {
      console.warn("[booking-confirm] Auto-login error:", err)
    }
    return false
  }, [])

  // Use the OTP-friendly /api/chat/messages endpoint (works without session auth
  // for verified leads) so the chat always works even if auto-login fails.
  const fetchMessages = useCallback(async () => {
    if (!clinicId || !leadId) return
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/chat/messages?leadId=${leadId}&clinicId=${clinicId}`)
      if (res.ok) {
        const data = await res.json()
        const allMsgs: Message[] = data.messages || []
        // Filter out bot messages queued for delayed typing animation
        const visible = delayedBotMsgIds.current.size > 0
          ? allMsgs.filter((m) => !delayedBotMsgIds.current.has(m.id))
          : allMsgs
        // Only overwrite if API returned messages; preserve optimistic messages otherwise
        if (visible.length > 0) {
          setMessages(visible)
        }
        // Sync conversationId from API response
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId)
        }
      }
    } catch (err) {
      console.error("[booking-confirm] Failed to fetch messages:", err)
    } finally {
      setLoadingMessages(false)
    }
  }, [clinicId, leadId, conversationId])

  useEffect(() => {
    async function fetchData() {
      if (!clinicId || !leadId || !dateStr || !time) {
        setError("Missing booking information. Please go back to your matches and select a time slot.")
        setLoading(false)
        return
      }

      try {
        // Fetch clinic data and check booking status in parallel
        const [clinicRes, statusRes] = await Promise.all([
          fetch(`/api/clinics/${clinicId}`),
          fetch(`/api/booking/status?leadId=${leadId}&clinicId=${clinicId}`),
        ])

        if (!clinicRes.ok) {
          throw new Error("Failed to fetch clinic details")
        }

        const clinicData = await clinicRes.json()
        setClinic(clinicData.clinic || clinicData)

        // Check if booking was already requested (handles page refresh / revisit)
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          if (statusData.alreadyRequested) {
            setConfirmed(true)
            if (statusData.conversationId) {
              setConversationId(statusData.conversationId)
            }
            // Try session auth for realtime, but always fetch messages
            // via the OTP-friendly endpoint (doesn't need session)
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              setIsAuthenticated(true)
            }
            // Always fetch messages — the OTP-friendly endpoint works
            // for verified leads even without a session
            fetchMessages()
            setLoading(false)
            return
          }
        }

        try {
          const leadRes = await fetch(`/api/leads/${leadId}`)
          if (leadRes.ok) {
            const leadData = await leadRes.json()
            setLead(leadData)
          }
        } catch {
          // Non-critical — booking can proceed with just leadId
        }
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to load booking details")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [clinicId, leadId, dateStr, time, fetchMessages])

  const handleConfirmBooking = async () => {
    if (!clinic?.id || !leadId || !dateStr || !time) {
      setError("Missing booking information. Please go back and select a time slot.")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/booking/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId: clinic.id,
          leadId: leadId,
          date: dateStr,
          time: time,
        }),
      })

      const data = await response.json()

      // Handle 409: booking already requested — treat as success, not error
      if (response.status === 409 && data.alreadyRequested) {
        setConfirmed(true)
        if (data.conversationId) {
          setConversationId(data.conversationId)
        }
        // Try auto-login for realtime, but always fetch messages via OTP endpoint
        if (data.tokenHash) {
          await performAutoLogin(data.tokenHash)
        }
        await fetchMessages()
        setSubmitting(false)
        return
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit booking request")
      }

      setConfirmed(true)
      trackTikTokEvent("PlaceAnOrder", { content_name: "booking_confirmed_standalone" })

      // Store conversationId for chat
      if (data.conversationId) {
        setConversationId(data.conversationId)
      }

      // Optimistically display the booking message immediately so the chat
      // is never empty — don't rely solely on fetchMessages which can have
      // timing or auth issues on mobile.
      if (data.bookingMessage) {
        setMessages([data.bookingMessage])
      }

      // Show bot acknowledgement reply with typing indicator animation
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

      // Try auto-login for realtime features (best-effort).
      // fetchMessages is triggered automatically by the useEffect when
      // conversationId changes — no need to call it explicitly here,
      // which would overwrite the optimistic message with a loading spinner.
      if (data.tokenHash) {
        await performAutoLogin(data.tokenHash)
      }
    } catch (err) {
      console.error("Error submitting booking:", err)
      setError(err instanceof Error ? err.message : "Failed to submit booking request")
    } finally {
      setSubmitting(false)
    }
  }

  // Real-time chat handler
  const handleNewRealtimeMessage = useCallback((msg: RealtimeMessage) => {
    if (delayedBotMsgIds.current.has(msg.id)) return
    if (msg.sender_type === "bot" || msg.sender_type === "clinic") {
      setBotTyping(false)
    }
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev
      return [...prev, msg].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    })
  }, [])

  const handleStatusChange = useCallback((msgId: string, status: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, status: status as Message["status"] } : m))
    )
  }, [])

  // Real-time subscription for chat
  const { otherTyping, sendTyping } = useChatChannel({
    conversationId,
    userType: "patient",
    onNewMessage: handleNewRealtimeMessage,
    onStatusChange: handleStatusChange,
    enabled: !!conversationId,
  })

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 || botTyping) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [messages, botTyping])

  // Send message handler
  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault()
    if (!newMessage.trim() || isSending || !clinicId || !leadId) return

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

        // If conversation was just created, update state
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId)
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
      }
    } catch (err) {
      console.error("Failed to send message:", err)
    } finally {
      setIsSending(false)
    }
  }

  function formatTime(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    } catch { return "" }
  }

  // Format date for display
  const formattedDate = appointmentDate
    ? appointmentDate.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : ""

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading booking details...</span>
        </div>
      </div>
    )
  }

  if (error && !confirmed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="text-destructive mb-4">
            <span className="text-4xl">!</span>
          </div>
          <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button asChild>
            <Link href="/">Go back home</Link>
          </Button>
        </Card>
      </div>
    )
  }

  // ── Success / Confirmation State ────────────────────────────────────
  if (confirmed) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
          {/* Success Header */}
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">Appointment Request Sent!</h1>
            <p className="text-muted-foreground">
              Your appointment request has been sent to <strong>{clinic?.name}</strong>.
            </p>
          </div>

          {/* What Happens Next */}
          <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
            <h3 className="font-medium text-teal-800 dark:text-teal-200 mb-2">What happens next?</h3>
            <ul className="text-sm text-teal-700 dark:text-teal-300 space-y-2">
              <li className="flex items-start gap-2">
                <MessageCircle className="w-4 h-4 mt-0.5 shrink-0" />
                The clinic will review your request and contact you shortly
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                Check your email for their response
              </li>
            </ul>
          </div>

          {/* Appointment Banner */}
          <AppointmentBanner
            bookingDate={dateStr}
            bookingTime={time}
            requestedAt={new Date().toISOString()}
            clinicName={clinic?.name}
          />

          {/* Embedded Chat */}
          {conversationId && (
            <Card className="overflow-hidden">
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-border/40 bg-card flex items-center gap-3">
                {clinic?.images?.[0] ? (
                  <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-muted ring-1 ring-border flex-shrink-0">
                    <Image src={clinic.images[0]} alt={clinic.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-semibold">
                      {(clinic?.name || "C").charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate leading-tight">{clinic?.name || "Clinic"}</p>
                  <p className="text-[10px] text-primary font-medium leading-tight">Chat with clinic</p>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={chatContainerRef}
                className="max-h-[320px] overflow-y-auto px-4 py-3 bg-background"
              >
                {messages.length === 0 && loadingMessages ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-6 space-y-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
                      <MessageCircle className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Send a message to {clinic?.name || "the clinic"}
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

              {/* Composer — always shown; /api/chat/send supports OTP-verified leads */}
              <form onSubmit={handleSend} className="flex gap-2 px-4 py-3 border-t border-border/40">
                <Input
                  value={newMessage}
                  onChange={(e) => { setNewMessage(e.target.value); sendTyping() }}
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
            </Card>
          )}

          {/* Dashboard + Back Links */}
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              You can also monitor and manage all your requests from your personal dashboard.
            </p>

            <Button asChild className="w-full">
              <Link href="/patient/dashboard">Go to your dashboard</Link>
            </Button>

            <Link
              href={matchId ? `/match/${matchId}` : "/"}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors block"
            >
              {matchId ? "Back to results" : "Back to home"}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Pre-confirmation Form ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-xl mx-auto px-4 py-4">
          <Link href={matchId ? `/match/${matchId}` : "/intake"} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px]">
            <ArrowLeft className="w-4 h-4" />
            Back to results
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-10">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Request appointment</h1>
          <p className="text-muted-foreground">We will keep your information safe and secure.</p>
        </div>

        {/* Clinic Card with Appointment Details */}
        <Card className="p-4 sm:p-5 mb-4">
          <div className="flex gap-3 sm:gap-4">
            {clinic?.images?.[0] ? (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-muted shrink-0 border-2 border-primary/20">
                <Image
                  src={clinic.images[0] || "/placeholder.svg"}
                  alt={clinic.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted shrink-0 flex items-center justify-center border-2 border-primary/20">
                <MapPin className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex flex-col justify-center">
              <h3 className="font-bold text-lg text-foreground">{clinic?.name}</h3>
              <p className="text-muted-foreground text-sm">
                {clinic?.address}, {clinic?.city} {clinic?.postcode}
              </p>
              <p className="text-primary font-medium mt-1">
                {formattedDate} - {timeLabel}
              </p>
            </div>
          </div>
        </Card>

        {/* User Identity Card */}
        {lead?.email && (
          <Card className="p-5 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  {"You're continuing your request as "}
                  <span className="text-foreground font-semibold">{lead.email}</span>
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Confirm Button */}
        <Button
          onClick={handleConfirmBooking}
          disabled={submitting}
          size="lg"
          className="w-full h-14 text-lg font-semibold rounded-full"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Sending request...
            </>
          ) : (
            "Confirm Request"
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center mt-4">
          By confirming, your details will be sent to the clinic who will contact you to confirm your appointment.
        </p>
      </main>
    </div>
  )
}
