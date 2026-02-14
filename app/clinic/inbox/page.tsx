"use client"

import React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageCircle, Send, Loader2, ArrowLeft, User, Clock, Bell, Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { createBrowserClient } from "@/lib/supabase/client"

async function getAccessToken(): Promise<string | null> {
  const supabase = createBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

function authHeaders(token: string | null): HeadersInit {
  return token ? { "Authorization": `Bearer ${token}` } : {}
}

interface Conversation {
  id: string
  lead_id: string
  status: string
  last_message_at: string
  unread_by_clinic: boolean
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevUnreadCountRef = useRef<number>(0)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch conversations with faster polling (10s instead of 30s)
  useEffect(() => {
    let isMounted = true
    const abortController = new AbortController()
    
    const fetchWithAbort = async () => {
      if (!isMounted) return
      try {
        const token = await getAccessToken()
        const response = await fetch("/api/clinic/conversations", {
          signal: abortController.signal,
          headers: authHeaders(token),
        })
        if (!isMounted) return
        if (response.ok) {
          const data = await response.json()
          const convs = data.conversations || []
          
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
          router.push("/clinic/login")
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    
    fetchWithAbort()
    const interval = setInterval(fetchWithAbort, 10000)
    
    return () => {
      isMounted = false
      abortController.abort()
      clearInterval(interval)
    }
  }, [router, toast])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Poll for new messages in selected conversation
  useEffect(() => {
    if (!selectedConversation) return
    
    let isMounted = true
    const abortController = new AbortController()
    
    const fetchMessages = async () => {
      if (!isMounted) return
      try {
        const token = await getAccessToken()
        const response = await fetch(
          `/api/clinic/conversations/${selectedConversation.id}/messages`,
          { signal: abortController.signal, headers: authHeaders(token) }
        )
        if (!isMounted) return
        if (response.ok) {
          const data = await response.json()
          setMessages(data.messages || [])
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
      }
    }
    
    const interval = setInterval(fetchMessages, 5000)
    
    return () => {
      isMounted = false
      abortController.abort()
      clearInterval(interval)
    }
  }, [selectedConversation])



  // Signal typing to patient (debounced - sends at most once per 5 seconds)
  const signalTyping = () => {
    if (!selectedConversation || typingTimeoutRef.current) return
    fetch("/api/chat/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: selectedConversation.id }),
    }).catch(() => {}) // Fire and forget
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null
    }, 5000)
  }

  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setIsLoadingMessages(true)

    try {
      const token = await getAccessToken()
      const response = await fetch(
        `/api/clinic/conversations/${conversation.id}/messages`,
        { headers: authHeaders(token) }
      )
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        // Mark as read
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversation.id ? { ...c, unread_by_clinic: false } : c
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
    if (!selectedConversation || !newMessage.trim() || isSending) return

    setIsSending(true)
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
      }
    } catch (error) {
      console.error("[Inbox] Failed to send reply:", error)
    } finally {
      setIsSending(false)
    }
  }

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

  const getTreatmentLabel = (type: string) => {
    const labels: Record<string, string> = {
      checkup: "Check-up",
      cleaning: "Cleaning",
      whitening: "Whitening",
      implants: "Implants",
      orthodontics: "Orthodontics",
      crowns: "Crowns/Veneers",
      emergency: "Emergency",
      other: "Other",
    }
    return labels[type] || type
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
          <CardHeader className="pb-3">
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
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-neutral-500 p-6">
                  <MessageCircle className="h-12 w-12 mb-3 text-neutral-300" />
                  <p className="text-center">No conversations yet</p>
                  <p className="text-sm text-center">
                    Messages from patients will appear here
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {conversations.map((conv) => (
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
                        </div>
                        {conv.unread_by_clinic && (
                          <div className="h-2 w-2 rounded-full bg-teal-500 flex-shrink-0" />
                        )}
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
                  <div>
                    <p className="font-medium">
                      {selectedConversation.lead?.first_name}{" "}
                      {selectedConversation.lead?.last_name}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {selectedConversation.lead?.email}
                    </p>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4" ref={scrollRef}>
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex",
                            message.sender_type === "clinic"
                              ? "justify-end"
                              : message.sender_type === "bot"
                              ? "justify-center"
                              : "justify-start"
                          )}
                        >
                          {message.sender_type === "bot" ? (
                            <div className="max-w-[80%] flex items-start gap-2 bg-gradient-to-r from-purple-50 to-teal-50 border border-purple-100/50 rounded-xl px-3 py-2">
                              <Heart className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
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
                                    ? "text-teal-100"
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
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>

              {/* Reply Input */}
              <div className="border-t p-4">
                <form onSubmit={sendReply} className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value)
                      signalTyping()
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
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
