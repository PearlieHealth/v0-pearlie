"use client"

import React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, X, Send, Loader2, Heart, Check, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { OTPVerification } from "@/components/otp-verification"
import { useChatChannel, type RealtimeMessage } from "@/hooks/use-chat-channel"
import { AppointmentBanner } from "@/components/appointment-banner"

interface Message {
  id: string
  content: string
  sender_type: "patient" | "clinic" | "bot"
  status?: "sent" | "delivered" | "read"
  created_at: string
  read_at?: string
}

interface ClinicChatWidgetProps {
  leadId: string
  clinicId: string
  clinicName: string
  patientName?: string
  patientEmail?: string
  isEmailVerified?: boolean
}

export function ClinicChatWidget({
  leadId,
  clinicId,
  clinicName,
  patientName,
  patientEmail,
  isEmailVerified: isEmailVerifiedProp = false,
}: ClinicChatWidgetProps) {
  const [verified, setVerified] = useState(isEmailVerifiedProp)
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [botTyping, setBotTyping] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showVerifyPrompt, setShowVerifyPrompt] = useState(false)
  const [conversationClosed, setConversationClosed] = useState(false)
  const [leadInfo, setLeadInfo] = useState<{ name: string; email: string } | null>(null)
  const [bookingInfo, setBookingInfo] = useState<{ date: string | null; time: string | null; requestedAt: string | null }>({ date: null, time: null, requestedAt: null })
  const scrollRef = useRef<HTMLDivElement>(null)
  const botTypingTimers = useRef<NodeJS.Timeout[]>([])
  const queuedBotIds = useRef<Set<string>>(new Set())

  // ── Helper: drip-feed bot messages with typing delay ───────────
  const queueBotMessages = useCallback((botMsgs: Message[]) => {
    // Filter out already-queued messages (prevents double-scheduling from API + Realtime)
    const fresh = botMsgs.filter((m) => !queuedBotIds.current.has(m.id))
    if (!fresh.length) return
    fresh.forEach((m) => queuedBotIds.current.add(m.id))
    setBotTyping(true)
    fresh.forEach((msg, i) => {
      const delay = (i + 1) * 1500 // 1.5s per message
      const timer = setTimeout(() => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        })
        // Hide typing after the last message
        if (i === fresh.length - 1) setBotTyping(false)
      }, delay)
      botTypingTimers.current.push(timer)
    })
  }, [])

  // Clean up bot typing timers on unmount
  useEffect(() => {
    return () => {
      botTypingTimers.current.forEach(clearTimeout)
    }
  }, [])

  // ── Realtime: instant messages + typing via Broadcast ──────────
  const handleNewMessage = useCallback((msg: RealtimeMessage) => {
    // Delay bot messages from realtime too
    if (msg.sender_type === "bot") {
      queueBotMessages([msg as unknown as Message])
      return
    }
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev
      return [...prev, msg].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    })
    if (!isOpen) setUnreadCount((c) => c + 1)
  }, [isOpen, queueBotMessages])

  const handleStatusChange = useCallback((msgId: string, status: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, status: status as Message["status"] } : m))
    )
  }, [])

  const { otherTyping: clinicTyping, sendTyping } = useChatChannel({
    conversationId,
    userType: "patient",
    onNewMessage: handleNewMessage,
    onStatusChange: handleStatusChange,
    enabled: isOpen && !!conversationId,
  })

  // ── Fallback polling (30s) in case Realtime is unavailable ─────
  useEffect(() => {
    if (!isOpen || !conversationId) return
    const interval = setInterval(fetchMessages, 30000)
    return () => clearInterval(interval)
  }, [isOpen, conversationId])

  // Fetch lead info on mount if verified
  useEffect(() => {
    if (verified && leadId) {
      fetchLeadInfo()
    }
  }, [verified, leadId])

  // Fetch messages when widget opens
  useEffect(() => {
    if (isOpen && leadId && clinicId) {
      fetchMessages()
    }
  }, [isOpen, leadId, clinicId])

  // Scroll to bottom when new messages arrive or bot starts typing
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, botTyping])

  const fetchLeadInfo = async () => {
    try {
      const response = await fetch(`/api/leads/${leadId}/status`)
      if (response.ok) {
        const data = await response.json()
        if (data.firstName) {
          setLeadInfo({
            name: data.firstName,
            email: "",
          })
        }
      }
    } catch {
      // Silently fail
    }
  }

  const fetchMessages = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/chat/messages?leadId=${leadId}&clinicId=${clinicId}`
      )
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        setConversationId(data.conversationId)
        setUnreadCount(0)
        // Capture booking details from API
        if (data.appointmentRequestedAt) {
          setBookingInfo({
            date: data.bookingDate || null,
            time: data.bookingTime || null,
            requestedAt: data.appointmentRequestedAt,
          })
        }
        // Track closed state
        if (data.conversationState === "closed") {
          setConversationClosed(true)
        }
      }
    } catch (error) {
      console.error("[Chat] Failed to fetch messages:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isSending || conversationClosed) return

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
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          clinicId,
          content: messageText,
          senderType: "patient",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // Replace optimistic message with server version
        setMessages((prev) => prev.map((m) => m.id === tempId ? data.message : m))
        setConversationId(data.conversationId)
        // Drip-feed bot messages with typing delay
        if (data.botMessages?.length) {
          queueBotMessages(data.botMessages)
        }
      } else {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        if (response.status === 403) {
          const errData = await response.json().catch(() => ({}))
          if (errData.reason === "conversation_closed") {
            setConversationClosed(true)
          }
        }
      }
    } catch (error) {
      console.error("[Chat] Failed to send message:", error)
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    } finally {
      setIsSending(false)
    }
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (d.toDateString() === today.toDateString()) return "Today"
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  }

  // Group messages by date
  const groupedMessages = messages.reduce(
    (groups, message) => {
      const date = formatDate(message.created_at)
      if (!groups[date]) groups[date] = []
      groups[date].push(message)
      return groups
    },
    {} as Record<string, Message[]>
  )

  // ── Delivery status icon ──────────────────────────────────────
  const StatusIcon = ({ status }: { status?: string }) => {
    if (!status || status === "sent") {
      return <Check className="h-3 w-3 text-teal-200" />
    }
    if (status === "delivered") {
      return <CheckCheck className="h-3 w-3 text-teal-200" />
    }
    // read
    return <CheckCheck className="h-3 w-3 text-white" />
  }

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => {
          if (!verified) {
            setShowVerifyPrompt(true)
          } else {
            setIsOpen(true)
          }
        }}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg transition-all hover:bg-teal-700 hover:scale-105",
          (isOpen || showVerifyPrompt) && "hidden"
        )}
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Inline OTP Verification Modal */}
      {showVerifyPrompt && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] rounded-2xl bg-white shadow-2xl border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Verify Your Email</h3>
            <button
              onClick={() => setShowVerifyPrompt(false)}
              className="rounded-full p-1 hover:bg-neutral-100 transition-colors"
            >
              <X className="h-5 w-5 text-neutral-500" />
            </button>
          </div>
          <p className="text-neutral-600 mb-4">
            Please verify your email address to message {clinicName}. This helps us keep the conversation secure.
          </p>
          {patientEmail ? (
            <OTPVerification
              leadId={leadId}
              email={patientEmail}
              onVerified={() => {
                setVerified(true)
                setShowVerifyPrompt(false)
                setIsOpen(true)
              }}
            />
          ) : (
            <Button
              onClick={() => {
                setShowVerifyPrompt(false)
                const otpSection = document.getElementById("otp-verification")
                if (otpSection) {
                  otpSection.scrollIntoView({ behavior: "smooth" })
                }
              }}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              Verify Email
            </Button>
          )}
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-neutral-200">
          {/* Header */}
          <div className="bg-teal-600 px-4 py-3 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{clinicName}</h3>
                <p className="text-xs text-teal-100">Usually replies within a few hours</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 hover:bg-teal-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {leadInfo && (
              <div className="mt-2 pt-2 border-t border-teal-500 text-xs text-teal-100">
                <p>Chatting as: <span className="font-medium text-white">{leadInfo.name}</span></p>
                <p className="truncate">{leadInfo.email}</p>
              </div>
            )}
          </div>

          {/* Appointment Banner */}
          {bookingInfo.date && (
            <div className="px-4 pt-3 pb-0">
              <AppointmentBanner
                bookingDate={bookingInfo.date}
                bookingTime={bookingInfo.time}
                requestedAt={bookingInfo.requestedAt}
                compact
              />
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {isLoading && messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-neutral-500">
                <Heart className="h-10 w-10 mb-3 text-[#0fbcb0]/60" />
                <p className="font-medium">You're chatting with Pearlie</p>
                <p className="text-sm">Ask a question or say hello — the clinic will join shortly.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                  <div key={date}>
                    <div className="flex items-center justify-center mb-3">
                      <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-1 rounded-full">
                        {date}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {dateMessages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex",
                            message.sender_type === "patient"
                              ? "justify-end"
                              : message.sender_type === "bot"
                              ? "justify-center"
                              : "justify-start"
                          )}
                        >
                          {message.sender_type === "bot" ? (
                            <div className="max-w-[90%] flex items-start gap-2 bg-[#faf3e6] border border-[#faf3e6] rounded-xl px-3 py-2">
                              <Heart className="w-3.5 h-3.5 text-[#0fbcb0] mt-0.5 flex-shrink-0" />
                              <p className="text-[15px] leading-relaxed text-neutral-600 whitespace-pre-wrap">{message.content}</p>
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "max-w-[80%] rounded-2xl px-4 py-2",
                                message.sender_type === "patient"
                                  ? "bg-teal-600 text-white rounded-br-md"
                                  : "bg-neutral-100 text-neutral-900 rounded-bl-md"
                              )}
                            >
                              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                              <div
                                className={cn(
                                  "flex items-center gap-1 mt-1",
                                  message.sender_type === "patient"
                                    ? "text-teal-100 justify-end"
                                    : "text-neutral-400"
                                )}
                              >
                                <span className="text-xs">{formatTime(message.created_at)}</span>
                                {message.sender_type === "patient" && (
                                  <StatusIcon status={message.status} />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Typing indicator */}
          {(clinicTyping || botTyping) && (
            <div className="px-4 py-2">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
                {botTyping ? "Pearlie is typing..." : `${clinicName} is typing...`}
              </div>
            </div>
          )}

          {/* Closed banner or Input */}
          {conversationClosed ? (
            <div className="border-t border-neutral-200 px-4 py-3 bg-neutral-50">
              <p className="text-xs text-neutral-500 text-center">This conversation has been closed. Looking for a dentist? <a href="/intake" className="underline text-teal-600 hover:text-teal-700">Start a new search</a> to get matched with clinics.</p>
            </div>
          ) : (
          <form onSubmit={sendMessage} className="border-t border-neutral-200 p-3">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value)
                  sendTyping()
                }}
                placeholder="Ask a question or say hello..."
                className="flex-1 rounded-full border-neutral-200"
                disabled={isSending}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!newMessage.trim() || isSending}
                className="rounded-full bg-teal-600 hover:bg-teal-700"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
          )}
        </div>
      )}
    </>
  )
}
