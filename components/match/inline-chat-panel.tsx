"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, Send, Loader2, Heart, Check, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { useChatChannel, type RealtimeMessage } from "@/hooks/use-chat-channel"

interface Message {
  id: string
  content: string
  sender_type: "patient" | "clinic" | "bot"
  status?: "sent" | "delivered" | "read"
  created_at: string
  read_at?: string
}

interface InlineChatPanelProps {
  leadId: string
  clinicId: string
  clinicName: string
  isEmailVerified?: boolean
}

export function InlineChatPanel({
  leadId,
  clinicId,
  clinicName,
  isEmailVerified = false,
}: InlineChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [botTyping, setBotTyping] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const botTypingTimers = useRef<NodeJS.Timeout[]>([])
  const queuedBotIds = useRef<Set<string>>(new Set())
  const prevClinicIdRef = useRef<string>(clinicId)

  const queueBotMessages = useCallback((botMsgs: Message[]) => {
    const fresh = botMsgs.filter((m) => !queuedBotIds.current.has(m.id))
    if (!fresh.length) return
    fresh.forEach((m) => queuedBotIds.current.add(m.id))
    setBotTyping(true)
    fresh.forEach((msg, i) => {
      const delay = (i + 1) * 1500
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

  useEffect(() => {
    return () => {
      botTypingTimers.current.forEach(clearTimeout)
    }
  }, [])

  const handleNewMessage = useCallback(
    (msg: RealtimeMessage) => {
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
    },
    [queueBotMessages]
  )

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
    enabled: !!conversationId,
  })

  // Reset and refetch when clinicId changes
  useEffect(() => {
    if (clinicId !== prevClinicIdRef.current) {
      // Clear previous state
      setMessages([])
      setConversationId(null)
      setNewMessage("")
      setBotTyping(false)
      botTypingTimers.current.forEach(clearTimeout)
      botTypingTimers.current = []
      queuedBotIds.current.clear()
      prevClinicIdRef.current = clinicId
    }

    if (leadId && clinicId) {
      fetchMessages()
    }
  }, [leadId, clinicId])

  // Fallback polling
  useEffect(() => {
    if (!conversationId) return
    const interval = setInterval(fetchMessages, 30000)
    return () => clearInterval(interval)
  }, [conversationId])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, botTyping])

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
      }
    } catch (error) {
      console.error("[InlineChat] Failed to fetch messages:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isSending) return

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
        setMessages((prev) => [...prev, data.message])
        setNewMessage("")
        setConversationId(data.conversationId)
        if (data.botMessages?.length) {
          queueBotMessages(data.botMessages)
        }
      }
    } catch (error) {
      console.error("[InlineChat] Failed to send message:", error)
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

  const groupedMessages = messages.reduce(
    (groups, message) => {
      const date = formatDate(message.created_at)
      if (!groups[date]) groups[date] = []
      groups[date].push(message)
      return groups
    },
    {} as Record<string, Message[]>
  )

  const StatusIcon = ({ status }: { status?: string }) => {
    if (!status || status === "sent") return <Check className="h-3 w-3 text-teal-200" />
    if (status === "delivered") return <CheckCheck className="h-3 w-3 text-teal-200" />
    return <CheckCheck className="h-3 w-3 text-white" />
  }

  if (!isEmailVerified) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
        <MessageCircle className="h-10 w-10 mb-3 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">Verify your email to message clinics</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="bg-teal-600 px-4 py-3 text-white rounded-t-xl">
        <h3 className="font-semibold text-sm truncate">{clinicName}</h3>
        <p className="text-xs text-teal-100">Usually replies within a few hours</p>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {isLoading && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-neutral-500 py-12 px-4">
            <MessageCircle className="h-10 w-10 mb-3 text-neutral-300" />
            <p className="font-medium text-sm">Chat with {clinicName}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ask any questions or request an appointment.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                <div className="flex items-center justify-center mb-2">
                  <span className="text-[10px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                    {date}
                  </span>
                </div>
                <div className="space-y-1.5">
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
                        <div className="max-w-[90%] flex items-start gap-1.5 bg-gradient-to-r from-purple-50 to-teal-50 border border-purple-100/50 rounded-xl px-2.5 py-1.5">
                          <Heart className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-neutral-600 whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-3 py-1.5",
                            message.sender_type === "patient"
                              ? "bg-teal-600 text-white rounded-br-md"
                              : "bg-neutral-100 text-neutral-900 rounded-bl-md"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <div
                            className={cn(
                              "flex items-center gap-1 mt-0.5",
                              message.sender_type === "patient"
                                ? "text-teal-100 justify-end"
                                : "text-neutral-400"
                            )}
                          >
                            <span className="text-[10px]">{formatTime(message.created_at)}</span>
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
        <div className="px-3 py-1.5">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="flex gap-0.5">
              <span className="w-1 h-1 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1 h-1 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1 h-1 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
            {botTyping ? "Pearlie is typing..." : `${clinicName} is typing...`}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} className="border-t border-neutral-200 p-2.5">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value)
              sendTyping()
            }}
            placeholder="Type a message..."
            className="flex-1 rounded-full border-neutral-200 h-9 text-sm"
            disabled={isSending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim() || isSending}
            className="rounded-full bg-teal-600 hover:bg-teal-700 h-9 w-9"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
