"use client"

import React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { MessageCircle, Send, ChevronDown, Heart, Check, CheckCheck } from "lucide-react"
import { OTPVerification } from "@/components/otp-verification"
import { useChatChannel, type RealtimeMessage } from "@/hooks/use-chat-channel"
import { DirectEnquiryForm } from "@/components/clinic/direct-enquiry-form"
import { DirectLeadPreQualifier } from "@/components/clinic/direct-lead-pre-qualifier"

interface Message {
  id: string
  content: string
  sender_type: "patient" | "clinic" | "bot"
  status?: "sent" | "delivered" | "read"
  sent_via?: "chat" | "email" | string
  created_at: string
}

interface EmbeddedClinicChatProps {
  leadId: string | null
  clinicId: string
  clinicName: string
  isOpen: boolean
  onToggle: () => void
  hideHeader?: boolean
  onLeadCreated?: (leadId: string) => void
  leadEmail?: string | null
}

export function EmbeddedClinicChat({
  leadId,
  clinicId,
  clinicName,
  isOpen,
  onToggle,
  hideHeader = false,
  onLeadCreated,
  leadEmail: leadEmailProp,
}: EmbeddedClinicChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [botTyping, setBotTyping] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [conversationClosed, setConversationClosed] = useState(false)
  const [showOtpVerify, setShowOtpVerify] = useState(false)
  const [leadEmail, setLeadEmail] = useState<string | null>(leadEmailProp || null)
  const [showQuickForm, setShowQuickForm] = useState(false)
  const pendingMessageRef = useRef<string | null>(null)
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
  }, [queueBotMessages])

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

  // ── Fallback polling (30s) ─────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !conversationId) return
    const interval = setInterval(fetchMessages, 30000)
    return () => clearInterval(interval)
  }, [isOpen, conversationId])

  // Fetch messages when chat opens and we have both IDs
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

  const fetchMessages = async () => {
    if (!leadId) return
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/chat/messages?leadId=${leadId}&clinicId=${clinicId}`
      )
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        setConversationId(data.conversationId || null)
        if (data.conversationState === "closed") {
          setConversationClosed(true)
        }
      }
    } catch {
      // Silently fail on fetch
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!newMessage.trim() || isSending || conversationClosed) return
    setError(null)

    if (!leadId) {
      setError("Please complete the matching form first so the clinic knows who you are.")
      return
    }

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
        setError(null)
        // Drip-feed bot messages with typing delay
        if (data.botMessages?.length) {
          queueBotMessages(data.botMessages)
        }
      } else if (response.status === 403) {
        const errData = await response.json().catch(() => ({}))
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        if (errData.reason === "conversation_closed") {
          setConversationClosed(true)
          setError(null)
        } else {
          // Unverified email — store for resend after OTP
          pendingMessageRef.current = messageText
          if (leadEmailProp) {
            setLeadEmail(leadEmailProp)
            setShowOtpVerify(true)
            setError(null)
          } else {
            setError("Please verify your email before sending messages.")
          }
        }
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        const errData = await response.json().catch(() => ({}))
        setError(errData.error || "Failed to send message. Please try again.")
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setError("Something went wrong. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  const formatTime = (date: string) =>
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

  // Group messages by date
  const groupedMessages = messages.reduce<Record<string, Message[]>>((groups, message) => {
    const date = formatDate(message.created_at)
    if (!groups[date]) groups[date] = []
    groups[date].push(message)
    return groups
  }, {})

  // ── Delivery status icon ──────────────────────────────────────
  const StatusIcon = ({ status }: { status?: string }) => {
    if (!status || status === "sent") {
      return <Check className="h-2.5 w-2.5 text-white/50" />
    }
    if (status === "delivered") {
      return <CheckCheck className="h-2.5 w-2.5 text-white/50" />
    }
    return <CheckCheck className="h-2.5 w-2.5 text-white" />
  }

  if (!isOpen) return null

  return (
    <div className={hideHeader ? "bg-white flex flex-col h-full overflow-hidden" : "border border-[#e5e5e5] rounded-xl overflow-hidden bg-white"}>
      {/* Header */}
      {!hideHeader && (
        <div className="bg-[#004443] px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-semibold">{clinicName}</p>
            <p className="text-white/60 text-xs">Usually replies within a few hours</p>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="text-white/60 hover:text-white transition-colors p-1 rounded"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Pre-qualifier or quick form for visitors without a leadId */}
      {!leadId && (
        <div className={`overflow-y-auto bg-[#fafafa] ${hideHeader ? "flex-1 min-h-0" : "max-h-[400px]"}`}>
          {showQuickForm ? (
            <DirectEnquiryForm
              clinicId={clinicId}
              clinicName={clinicName}
              onLeadCreated={(newLeadId) => {
                setShowQuickForm(false)
                onLeadCreated?.(newLeadId)
              }}
            />
          ) : (
            <DirectLeadPreQualifier
              clinicName={clinicName}
              onQuickForm={() => setShowQuickForm(true)}
              onFullIntake={() => {
                window.location.href = `/intake?clinic=${clinicId}`
              }}
            />
          )}
        </div>
      )}

      {/* Messages area - only shown when we have a leadId */}
      {leadId && (
      <div
        ref={scrollRef}
        className={`overflow-y-auto p-3 space-y-3 bg-[#fafafa] ${hideHeader ? "flex-1 min-h-0" : "h-[280px]"}`}
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-5 w-5 border-2 border-[#004443] border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Heart className="h-8 w-8 text-[#0fbcb0]/60 mb-2" />
            <p className="text-sm font-medium text-[#666]">You're chatting with Pearlie</p>
            <p className="text-xs text-[#999] mt-1">
              Ask a question or say hello — the clinic will join shortly.
            </p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              <div className="flex items-center justify-center mb-3">
                <span className="text-[11px] text-[#999] bg-[#eee] px-2 py-0.5 rounded-full">
                  {date}
                </span>
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
                      <div className="max-w-[90%] bg-[#faf3e6] border border-[#faf3e6] rounded-xl px-3 py-2">
                        <p className="text-[11px] text-[#0fbcb0] font-medium mb-0.5 flex items-center gap-1">
                          <Heart className="w-2.5 h-2.5 fill-[#0fbcb0] text-[#0fbcb0]" />
                          Pearlie AI
                        </p>
                        <p className="text-[15px] leading-relaxed text-[#555] whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ) : (
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-[15px] leading-relaxed ${
                          msg.sender_type === "patient"
                            ? "bg-[#004443] text-white rounded-br-md"
                            : "bg-[#0fbcb0] text-white rounded-bl-md"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <div
                          className={`flex items-center gap-1 mt-1 ${
                            msg.sender_type === "patient" ? "text-white/60 justify-end" : "text-white/60"
                          }`}
                        >
                          {msg.sent_via === "email" && (
                            <span className="inline-flex items-center gap-0.5 text-[11px] opacity-70">
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                              via email ·
                            </span>
                          )}
                          <span className="text-[11px]">{formatTime(msg.created_at)}</span>
                          {msg.sender_type === "patient" && (
                            <StatusIcon status={msg.status} />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      )}

      {/* Inbox link - shown when conversation exists */}
      {leadId && conversationId && (
        <div className="px-3 py-1.5 bg-white border-t border-[#e5e5e5]">
          <a
            href="/patient/login?next=/patient/dashboard"
            className="text-[11px] text-[#0fbcb0] hover:underline"
          >
            Open full conversation in inbox
          </a>
        </div>
      )}

      {/* Typing indicator, error, and input - only shown when we have a leadId */}
      {leadId && (
        <>
          {(clinicTyping || botTyping) && (
            <div className="px-3 py-1.5">
              <div className="flex items-center gap-2 text-[11px] text-[#999]">
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 bg-[#999] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1 h-1 bg-[#999] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1 h-1 bg-[#999] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
                {botTyping ? "Pearlie is typing..." : `${clinicName} is typing...`}
              </div>
            </div>
          )}

          {error && (
            <div className="px-3 py-2 bg-red-50 border-t border-red-100">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Inline OTP verification on 403 */}
          {showOtpVerify && leadId && leadEmail && (
            <div className="p-3 border-t border-[#e5e5e5] bg-[#fafafa]">
              <p className="text-xs text-[#666] mb-2">Verify your email to send messages:</p>
              <OTPVerification
                leadId={leadId}
                email={leadEmail}
                onVerified={() => {
                  setShowOtpVerify(false)
                  // Retry the pending message
                  if (pendingMessageRef.current) {
                    setNewMessage(pendingMessageRef.current)
                    pendingMessageRef.current = null
                    // Auto-send after a brief delay
                    setTimeout(() => {
                      handleSend()
                    }, 200)
                  }
                }}
              />
            </div>
          )}

          {conversationClosed ? (
            <div className="px-3 py-3 border-t border-[#e5e5e5] bg-[#f5f5f5]">
              <p className="text-[11px] text-[#888] text-center">This conversation has been closed. Looking for a dentist? <a href="/intake" className="underline text-teal-600 hover:text-teal-700">Start a new search</a> to get matched with clinics.</p>
            </div>
          ) : !showOtpVerify && (
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
                    handleSend()
                  }
                }}
                placeholder="Ask a question or say hello..."
                className="flex-1 min-w-0 text-[16px] sm:text-sm border border-[#ddd] rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#004443]/20 focus:border-[#004443] bg-white"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="flex-shrink-0 h-10 w-10 rounded-full bg-[#004443] text-white flex items-center justify-center hover:bg-[#003332] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
        </>
      )}
    </div>
  )
}
