"use client"

import React from "react"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageCircle, Send, Loader2, ArrowLeft, User, Clock, Heart, Check, CheckCheck, CalendarCheck, Lock, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { createBrowserClient } from "@/lib/supabase/client"
import { clinicHref } from "@/lib/clinic-url"
import { useChatChannel, useConversationUpdates, type RealtimeMessage } from "@/hooks/use-chat-channel"

async function getAccessToken(): Promise<string | null> {
  const supabase = createBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

function authHeaders(token: string | null): HeadersInit {
  return token ? { "Authorization": `Bearer ${token}` } : {}
}

type ConversationState = "open" | "booked" | "closed"
type TabFilter = "active" | "booked" | "closed"

interface Conversation {
  id: string
  lead_id: string
  status: string
  last_message_at: string
  unread_by_clinic: boolean
  unread_count_clinic?: number
  conversation_state?: ConversationState
  booked_at?: string | null
  closed_at?: string | null
  closed_reason?: string | null
  lead?: {
    first_name: string
    last_name: string
    email: string
    phone: string
    treatment_interest: string
    primary_treatment: string
  }
  latest_message?: string
}

interface Message {
  id: string
  content: string
  sender_type: "patient" | "clinic" | "bot"
  status?: "sent" | "delivered" | "read"
  created_at: string
  read_at?: string
}

export default function ClinicInboxPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [clinicId, setClinicId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevUnreadCountRef = useRef<number>(0)
  const [replyError, setReplyError] = useState<string | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<TabFilter>("active")

  // ── Realtime: messages in the active conversation ──────────────
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

  const { otherTyping: patientTyping, sendTyping } = useChatChannel({
    conversationId: selectedConversation?.id || null,
    userType: "clinic",
    onNewMessage: handleNewMessage,
    onStatusChange: handleStatusChange,
    enabled: !!selectedConversation,
  })

  // ── Realtime: conversations list updates ───────────────────────
  const handleConversationUpdate = useCallback(() => {
    fetchConversations()
  }, [])

  useConversationUpdates({
    clinicId,
    onUpdate: handleConversationUpdate,
    enabled: !!clinicId,
  })

  // ── Initial load + fallback polling (30s) for conversations ────
  useEffect(() => {
    fetchConversations()
    const interval = setInterval(fetchConversations, 30000)
    return () => clearInterval(interval)
  }, [])

  // ── Fallback polling (15s) for active conversation messages ────
  useEffect(() => {
    if (!selectedConversation) return
    const interval = setInterval(() => fetchMessagesForConversation(selectedConversation.id), 15000)
    return () => clearInterval(interval)
  }, [selectedConversation])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

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

  // ── Data fetching ──────────────────────────────────────────────
  const fetchConversations = async () => {
    try {
      const token = await getAccessToken()
      const response = await fetch("/api/clinic/conversations", {
        headers: authHeaders(token),
      })
      if (response.ok) {
        const data = await response.json()
        const convs = data.conversations || []

        if (convs.length > 0 && !clinicId) {
          const idRes = await fetch("/api/clinic/me", { headers: authHeaders(token) })
          if (idRes.ok) {
            const idData = await idRes.json()
            setClinicId(idData.clinic?.id || null)
          }
        }

        const totalUnread = convs.filter(
          (c: Conversation) => c.unread_by_clinic
        ).length

        if (totalUnread > prevUnreadCountRef.current && prevUnreadCountRef.current > 0) {
          const newCount = totalUnread - prevUnreadCountRef.current
          toast({
            title: "New message",
            description: `You have ${newCount} new message${newCount > 1 ? "s" : ""}`,
          })
        }
        prevUnreadCountRef.current = totalUnread

        setConversations(convs)
      } else if (response.status === 401) {
        router.push(clinicHref("/clinic/login"))
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMessagesForConversation = async (conversationId: string) => {
    try {
      const token = await getAccessToken()
      const response = await fetch(
        `/api/clinic/conversations/${conversationId}/messages`,
        { headers: authHeaders(token) }
      )
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch {
      // Silently fail
    }
  }

  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setIsLoadingMessages(true)
    setReplyError(null)

    try {
      const token = await getAccessToken()
      const response = await fetch(
        `/api/clinic/conversations/${conversation.id}/messages`,
        { headers: authHeaders(token) }
      )
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversation.id
              ? { ...c, unread_by_clinic: false, unread_count_clinic: 0 }
              : c
          )
        )
      }
    } catch (error) {
      console.error("[Inbox] Failed to fetch messages:", error)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedConversation || !newMessage.trim() || isSending || isClosed) return

    setIsSending(true)
    setReplyError(null)
    try {
      const token = await getAccessToken()
      const response = await fetch("/api/chat/clinic-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content: newMessage.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const newMsgs = data.botMessage
          ? [data.botMessage, data.message]
          : [data.message]
        setMessages((prev) => [...prev, ...newMsgs])
        setNewMessage("")
      } else {
        const errData = await response.json().catch(() => ({}))
        if (response.status === 403) {
          setReplyError(errData.error || "This conversation is closed.")
        } else if (response.status === 429) {
          setReplyError(errData.error || "Too many messages. Please slow down.")
        } else {
          setReplyError(errData.error || "Failed to send message.")
        }
      }
    } catch (error) {
      console.error("[Inbox] Failed to send reply:", error)
      setReplyError("Failed to send message. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  // ── Formatting helpers ─────────────────────────────────────────
  const formatTime = (date: string | null) => {
    if (!date) return ""
    const d = new Date(date)
    if (isNaN(d.getTime())) return ""
    const now = new Date()
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60)

    if (diffHours < 24) {
      return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    }
    if (diffHours < 168) {
      return d.toLocaleDateString("en-GB", { weekday: "short" })
    }
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  }

  // ── Delivery status icon (for clinic's own sent messages) ──────
  const StatusIcon = ({ status }: { status?: string }) => {
    if (!status || status === "sent") {
      return <Check className="h-3 w-3 text-teal-200" />
    }
    if (status === "delivered") {
      return <CheckCheck className="h-3 w-3 text-teal-200" />
    }
    return <CheckCheck className="h-3 w-3 text-white" />
  }

  // ── State badge for conversation list ──────────────────────────
  const ConvStateBadge = ({ state }: { state?: ConversationState }) => {
    if (!state || state === "open") return null
    if (state === "booked") {
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">
          <CalendarCheck className="h-2.5 w-2.5 mr-0.5" />
          Booked
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-neutral-100 text-neutral-500 border-neutral-200">
        <Lock className="h-2.5 w-2.5 mr-0.5" />
        Closed
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-[600px] w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Inbox</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <Card className="lg:col-span-1 h-[600px] flex flex-col">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversations
              {conversations.filter((c) => c.unread_by_clinic).length > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {conversations.filter((c) => c.unread_by_clinic).length} new
                </Badge>
              )}
            </CardTitle>
          </CardHeader>

          {/* Tabs */}
          <div className="flex border-b mx-6 mt-3">
            {(["active", "booked", "closed"] as TabFilter[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab)
                  setSelectedConversation(null)
                }}
                className={cn(
                  "flex-1 px-2 py-2 text-xs font-medium transition-colors relative",
                  activeTab === tab ? "text-foreground" : "text-neutral-400 hover:text-neutral-600"
                )}
              >
                {tab === "active" ? "Active" : tab === "booked" ? "Booked" : "Closed"}
                {tabCounts[tab] > 0 && (
                  <span className={cn(
                    "ml-1 text-[10px] px-1.5 py-0.5 rounded-full",
                    activeTab === tab ? "bg-teal-600 text-white" : "bg-neutral-100 text-neutral-500"
                  )}>
                    {tabCounts[tab]}
                  </span>
                )}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600" />
                )}
              </button>
            ))}
          </div>

          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-neutral-500 p-6">
                  <MessageCircle className="h-12 w-12 mb-3 text-neutral-300" />
                  <p className="text-center">
                    {conversations.length === 0
                      ? "No conversations yet"
                      : `No ${activeTab} conversations`}
                  </p>
                  {conversations.length === 0 && (
                    <p className="text-sm text-center">
                      Messages from patients will appear here
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={cn(
                        "w-full p-4 text-left hover:bg-neutral-50 transition-colors",
                        selectedConversation?.id === conv.id && "bg-neutral-100",
                        conv.unread_by_clinic && "bg-teal-50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-neutral-200 flex items-center justify-center">
                          <User className="h-5 w-5 text-neutral-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">
                              {conv.lead?.first_name} {conv.lead?.last_name}
                            </p>
                            <span className="text-xs text-neutral-400">
                              {formatTime(conv.last_message_at)}
                            </span>
                          </div>
                          {(conv.lead?.treatment_interest || conv.lead?.primary_treatment) && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              {conv.lead?.treatment_interest || conv.lead?.primary_treatment}
                            </Badge>
                          )}
                          {conv.latest_message && (
                            <p className="text-sm text-neutral-500 truncate mt-1">
                              {conv.latest_message}
                            </p>
                          )}
                          {conv.unread_by_clinic && (
                            <p className="text-xs text-violet-600 font-medium mt-0.5">
                              New message from patient
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Thread */}
        <Card className="lg:col-span-2 h-[600px] flex flex-col">
          {!selectedConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
              <MessageCircle className="h-16 w-16 mb-4 text-neutral-200" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Choose a conversation to view messages</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <CardHeader className="border-b pb-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="lg:hidden p-2 -ml-2 hover:bg-neutral-100 rounded-lg"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="h-10 w-10 rounded-full bg-neutral-200 flex items-center justify-center">
                    <User className="h-5 w-5 text-neutral-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {selectedConversation.lead?.first_name}{" "}
                        {selectedConversation.lead?.last_name}
                      </p>
                      <ConvStateBadge state={selectedConversation.conversation_state} />
                    </div>
                    <p className="text-sm text-neutral-500">
                      {selectedConversation.lead?.email}
                    </p>
                  </div>
                </div>
              </CardHeader>

              {/* Closed banner */}
              {isClosed && (
                <div className="px-4 py-2.5 bg-neutral-50 border-b flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-neutral-400" />
                  <span className="text-xs text-neutral-500">
                    This conversation is closed. No further messages can be sent.
                  </span>
                </div>
              )}

              {/* Messages */}
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4" ref={scrollRef}>
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message, idx) => {
                        const prevMessage = idx > 0 ? messages[idx - 1] : null
                        const showSenderLabel = message.sender_type !== "bot" && (
                          !prevMessage || prevMessage.sender_type !== message.sender_type
                        )

                        return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex flex-col",
                            message.sender_type === "clinic"
                              ? "items-end"
                              : message.sender_type === "bot"
                              ? "items-center"
                              : "items-start"
                          )}
                        >
                          {showSenderLabel && (
                            <span className={cn(
                              "text-[10px] font-medium mb-0.5 px-1",
                              message.sender_type === "clinic"
                                ? "text-teal-600"
                                : "text-violet-600"
                            )}>
                              {message.sender_type === "clinic"
                                ? "You"
                                : `${selectedConversation.lead?.first_name || "Patient"} ${selectedConversation.lead?.last_name || ""}`.trim()}
                            </span>
                          )}
                          {message.sender_type === "bot" ? (
                            <div className="max-w-[80%] flex items-start gap-2 bg-gradient-to-r from-teal-50 to-[#faf3e6] border border-teal-100/50 rounded-xl px-3 py-2">
                              <Heart className="w-3.5 h-3.5 text-[#0fbcb0] mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-neutral-500 whitespace-pre-wrap">{message.content}</p>
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "max-w-[70%] rounded-2xl px-4 py-2",
                                message.sender_type === "clinic"
                                  ? "bg-teal-600 text-white rounded-br-md"
                                  : "bg-neutral-100 text-neutral-900 rounded-bl-md"
                              )}
                            >
                              <p className="text-sm whitespace-pre-wrap">
                                {message.content}
                              </p>
                              <div
                                className={cn(
                                  "flex items-center gap-1 mt-1",
                                  message.sender_type === "clinic"
                                    ? "text-teal-100 justify-end"
                                    : "text-neutral-400"
                                )}
                              >
                                <Clock className="h-3 w-3" />
                                <span className="text-xs">
                                  {new Date(message.created_at).toLocaleTimeString(
                                    "en-GB",
                                    { hour: "2-digit", minute: "2-digit" }
                                  )}
                                </span>
                                {message.sender_type === "clinic" && (
                                  <StatusIcon status={message.status} />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        )
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>

              {/* Typing indicator */}
              {patientTyping && !isClosed && (
                <div className="px-4 py-2 border-t">
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <span className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                    Patient is typing...
                  </div>
                </div>
              )}

              {/* Reply error */}
              {replyError && (
                <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-700">{replyError}</p>
                </div>
              )}

              {/* Reply Input — hidden when closed */}
              {!isClosed && (
                <div className="border-t p-4">
                  <form onSubmit={sendReply} className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value)
                        sendTyping()
                        if (replyError) setReplyError(null)
                      }}
                      placeholder="Type your reply..."
                      className="flex-1"
                      disabled={isSending}
                    />
                    <Button
                      type="submit"
                      disabled={!newMessage.trim() || isSending}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
