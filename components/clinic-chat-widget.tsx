"use client"

import React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, X, Send, Loader2, Heart } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  content: string
  sender_type: "patient" | "clinic" | "bot"
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
  isEmailVerified = false,
}: ClinicChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showVerifyPrompt, setShowVerifyPrompt] = useState(false)
  const [clinicTyping, setClinicTyping] = useState(false)
  const [leadInfo, setLeadInfo] = useState<{ name: string; email: string } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Fetch lead info on mount if verified
  useEffect(() => {
    if (isEmailVerified && leadId) {
      fetchLeadInfo()
    }
  }, [isEmailVerified, leadId])

  const fetchLeadInfo = async () => {
    try {
      const response = await fetch(`/api/leads/${leadId}/status`)
      if (response.ok) {
        const data = await response.json()
        if (data.firstName || data.lastName) {
          setLeadInfo({
            name: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
            email: data.email || "",
          })
        }
      }
    } catch (error) {
      // Silently fail
    }
  }

  // Fetch messages when widget opens
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

  // Poll for new messages when open
  useEffect(() => {
    if (!isOpen || !conversationId) return

    const interval = setInterval(fetchMessages, 10000) // Poll every 10s
    return () => clearInterval(interval)
  }, [isOpen, conversationId])

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
        setClinicTyping(data.clinicTyping || false)
        setUnreadCount(0) // Mark as read when opened
      }
    } catch (error) {
      console.error("[Chat] Failed to fetch messages:", error)
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
        const newMessages = [data.message, ...(data.botMessages || [])]
        setMessages((prev) => [...prev, ...newMessages])
        setNewMessage("")
        setConversationId(data.conversationId)
      }
    } catch (error) {
      console.error("[Chat] Failed to send message:", error)
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

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => {
          if (!isEmailVerified) {
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

      {/* Email Verification Required Prompt */}
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
          <Button
            onClick={() => {
              setShowVerifyPrompt(false)
              // Scroll to OTP verification if on page, or show message
              const otpSection = document.getElementById("otp-verification")
              if (otpSection) {
                otpSection.scrollIntoView({ behavior: "smooth" })
              }
            }}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            Verify Email
          </Button>
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
            {/* Show logged in user info */}
            {leadInfo && (
              <div className="mt-2 pt-2 border-t border-teal-500 text-xs text-teal-100">
                <p>Chatting as: <span className="font-medium text-white">{leadInfo.name}</span></p>
                <p className="truncate">{leadInfo.email}</p>
              </div>
            )}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {isLoading && messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-neutral-500">
                <MessageCircle className="h-12 w-12 mb-3 text-neutral-300" />
                <p className="font-medium">Start a conversation</p>
                <p className="text-sm">Ask {clinicName} any questions about your treatment</p>
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
                            <div className="max-w-[90%] flex items-start gap-2 bg-gradient-to-r from-purple-50 to-teal-50 border border-purple-100/50 rounded-xl px-3 py-2">
                              <Heart className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-neutral-600 whitespace-pre-wrap">{message.content}</p>
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
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              <p
                                className={cn(
                                  "text-xs mt-1",
                                  message.sender_type === "patient"
                                    ? "text-teal-100"
                                    : "text-neutral-400"
                                )}
                              >
                                {formatTime(message.created_at)}
                              </p>
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
          {clinicTyping && (
            <div className="px-4 py-2">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
                {clinicName} is typing...
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={sendMessage} className="border-t border-neutral-200 p-3">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
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
        </div>
      )}
    </>
  )
}
