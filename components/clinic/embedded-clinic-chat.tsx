"use client"

import React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { MessageCircle, Send, ChevronDown, Heart, Check, CheckCheck } from "lucide-react"
import { DirectEnquiryForm } from "@/components/clinic/direct-enquiry-form"
import { useChatChannel, type RealtimeMessage } from "@/hooks/use-chat-channel"

interface Message {
  id: string
  content: string
  sender_type: "patient" | "clinic" | "bot"
  status?: "sent" | "delivered" | "read"
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
}

export function EmbeddedClinicChat({
  leadId,
  clinicId,
  clinicName,
  isOpen,
  onToggle,
  hideHeader = false,
  onLeadCreated,
}: EmbeddedClinicChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // ── Realtime: instant messages + typing via Broadcast ──────────
  const handleNewMessage = useCallback((msg: RealtimeMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev
      return [...prev, msg]
    })
  }, [])

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

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

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
      }
    } catch {
      // Silently fail on fetch
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!newMessage.trim() || isSending) return
    setError(null)

    if (!leadId) {
      setError("Please complete the matching form first so the clinic knows who you are.")
      return
    }

    setIsSending(true)
    try {
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          clinicId,
          content: newMessage.trim(),
          senderType: "patient",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const newMessages = [data.message, ...(data.botMessages || [])]
        setMessages((prev) => [...prev, ...newMessages])
        setConversationId(data.conversationId)
        setNewMessage("")
        setError(null)
      } else if (response.status === 403) {
        setError("Please verify your email before sending messages. Check your inbox for the verification link.")
      } else {
        const errData = await response.json().catch(() => ({}))
        setError(errData.error || "Failed to send message. Please try again.")
      }
    } catch {
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
      return <Check className="h-2.5 w-2.5 text-[#777]" />
    }
    if (status === "delivered") {
      return <CheckCheck className="h-2.5 w-2.5 text-[#777]" />
    }
    return <CheckCheck className="h-2.5 w-2.5 text-teal-500" />
  }

  if (!isOpen) return null

  return (
    <div className={hideHeader ? "bg-white flex flex-col h-full" : "border border-[#e5e5e5] rounded-xl overflow-hidden bg-white"}>
      {/* Header */}
      {!hideHeader && (
        <div className="bg-[#1a1a1a] px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-semibold">{clinicName}</p>
            <p className="text-[#999] text-xs">Usually replies within a few hours</p>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="text-[#999] hover:text-white transition-colors p-1 rounded"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Direct enquiry form for visitors without a leadId */}
      {!leadId && (
        <div className={`overflow-y-auto bg-[#fafafa] ${hideHeader ? "flex-1 min-h-0" : "max-h-[400px]"}`}>
          <DirectEnquiryForm
            clinicId={clinicId}
            clinicName={clinicName}
            onLeadCreated={(newLeadId) => onLeadCreated?.(newLeadId)}
          />
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
            <div className="animate-spin h-5 w-5 border-2 border-[#1a1a1a] border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="h-8 w-8 text-[#ccc] mb-2" />
            <p className="text-sm font-medium text-[#666]">Start a conversation</p>
            <p className="text-xs text-[#999] mt-1">
              Ask {clinicName} about your treatment
            </p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              <div className="flex items-center justify-center mb-3">
                <span className="text-[10px] text-[#999] bg-[#eee] px-2 py-0.5 rounded-full">
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
                      <div className="max-w-[90%] flex items-start gap-2 bg-gradient-to-r from-purple-50 to-teal-50 border border-purple-100/50 rounded-xl px-3 py-2">
                        <Heart className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
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
                          <span className="text-[10px]">{formatTime(msg.created_at)}</span>
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

      {/* Typing indicator, error, and input - only shown when we have a leadId */}
      {leadId && (
        <>
          {clinicTyping && (
            <div className="px-3 py-1.5">
              <div className="flex items-center gap-2 text-[11px] text-[#999]">
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 bg-[#999] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1 h-1 bg-[#999] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1 h-1 bg-[#999] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
                {clinicName} is typing...
              </div>
            </div>
          )}

          {error && (
            <div className="px-3 py-2 bg-red-50 border-t border-red-100">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSend} className="border-t border-[#e5e5e5] p-3">
            <div className="flex gap-2">
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
                placeholder="Type a message..."
                className="flex-1 text-sm border border-[#ddd] rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/20 focus:border-[#1a1a1a] bg-white"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="flex-shrink-0 h-9 w-9 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center hover:bg-[#333] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
