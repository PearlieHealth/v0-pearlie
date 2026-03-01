"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  MessageSquare,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Check,
  CheckCheck,
  Search,
  X,
  Mail,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Clinic {
  id: string
  name: string
}

interface Lead {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  contact_value: string | null
  treatment_interest: string | null
}

interface Conversation {
  id: string
  clinic_id: string
  lead_id: string
  status: string
  last_message_at: string | null
  unread_count_clinic: number
  unread_count_patient: number
  created_at: string
  clinics: Clinic | null
  leads: Lead | null
  latest_message: string | null
  latest_message_sender: string | null
}

interface Message {
  id: string
  conversation_id: string
  sender_type: "patient" | "clinic" | "bot"
  content: string
  sent_via: string | null
  status: string | null
  message_type: string | null
  created_at: string
}

interface ConversationDetail {
  conversation: Conversation
  messages: Message[]
}

export function ChatHistoryPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [clinicFilter, setClinicFilter] = useState("all")
  const [dateRange, setDateRange] = useState("all")
  const [clinicsList, setClinicsList] = useState<Clinic[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pageSize = 25

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch clinics list for dropdown
  useEffect(() => {
    async function fetchClinics() {
      try {
        const res = await fetch("/api/admin/clinics")
        if (res.ok) {
          const data = await res.json()
          setClinicsList(data.clinics || [])
        }
      } catch {
        // silently fail
      }
    }
    fetchClinics()
  }, [])

  // Fetch conversations when filters change
  const fetchConversations = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", currentPage.toString())
      params.set("pageSize", pageSize.toString())
      if (clinicFilter !== "all") params.set("clinicId", clinicFilter)
      if (debouncedSearch) params.set("search", debouncedSearch)

      // Date range handling
      if (dateRange !== "all") {
        const now = new Date()
        let dateFrom: string | null = null
        if (dateRange === "today") {
          dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        } else if (dateRange === "7d") {
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
        } else if (dateRange === "30d") {
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
        } else if (dateRange === "90d") {
          dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
        }
        if (dateFrom) params.set("dateFrom", dateFrom)
      }

      const res = await fetch(`/api/admin/chat-history?${params}`)
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
        setTotalCount(data.total || 0)
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, clinicFilter, debouncedSearch, dateRange])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Open conversation detail
  const openConversation = async (conv: Conversation) => {
    setIsSheetOpen(true)
    setIsLoadingMessages(true)
    try {
      const res = await fetch(`/api/admin/chat-history/${conv.id}`)
      if (res.ok) {
        const data: ConversationDetail = await res.json()
        setSelectedConversation(data)
      }
    } catch {
      // silently fail
    } finally {
      setIsLoadingMessages(false)
    }
  }

  // Scroll to bottom of messages when loaded
  useEffect(() => {
    if (scrollRef.current && selectedConversation) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [selectedConversation])

  // Formatting helpers
  const formatTime = (date: string | null) => {
    if (!date) return "—"
    const d = new Date(date)
    if (isNaN(d.getTime())) return "—"
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

  const formatMessageDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 86400000)
    const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    if (msgDate.getTime() === today.getTime()) return "Today"
    if (msgDate.getTime() === yesterday.getTime()) return "Yesterday"
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  }

  const getPatientName = (lead: Lead | null) => {
    if (!lead) return "Unknown"
    const first = lead.first_name || ""
    const last = lead.last_name || ""
    if (first || last) return `${first} ${last}`.trim()
    return lead.contact_value || "Anonymous"
  }

  const StatusIcon = ({ status }: { status: string | null }) => {
    if (!status || status === "sent") {
      return <Check className="h-3 w-3 text-teal-200" />
    }
    if (status === "delivered") {
      return <CheckCheck className="h-3 w-3 text-teal-200" />
    }
    return <CheckCheck className="h-3 w-3 text-white" />
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(currentPage, totalPages)

  // Loading state
  if (isLoading && conversations.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            All Conversations
          </CardTitle>
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select
              value={clinicFilter}
              onValueChange={(v) => {
                setClinicFilter(v)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Clinics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clinics</SelectItem>
                {clinicsList.map((clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dateRange}
              onValueChange={(v) => {
                setDateRange(v)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-3 text-muted-foreground/30" />
              <p className="font-medium">
                {debouncedSearch || clinicFilter !== "all" || dateRange !== "all"
                  ? "No conversations match your filters"
                  : "No conversations yet"}
              </p>
              {(debouncedSearch || clinicFilter !== "all" || dateRange !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setSearchTerm("")
                    setClinicFilter("all")
                    setDateRange("all")
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">
                  Showing {(safePage - 1) * pageSize + 1}-
                  {Math.min(safePage * pageSize, totalCount)} of {totalCount} conversation
                  {totalCount !== 1 ? "s" : ""}
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {safePage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clinic</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead className="hidden md:table-cell">Treatment</TableHead>
                      <TableHead className="hidden lg:table-cell">Last Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Last Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversations.map((conv) => (
                      <TableRow
                        key={conv.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openConversation(conv)}
                      >
                        <TableCell className="font-medium">
                          {conv.clinics?.name || "Unknown"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{getPatientName(conv.leads)}</span>
                            <span className="text-xs text-muted-foreground">
                              {conv.leads?.email || conv.leads?.contact_value || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {conv.leads?.treatment_interest ? (
                            <Badge variant="outline" className="text-xs">
                              {conv.leads.treatment_interest}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell max-w-[250px]">
                          {conv.latest_message ? (
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.latest_message_sender === "clinic" && (
                                <span className="text-teal-600 font-medium">Clinic: </span>
                              )}
                              {conv.latest_message_sender === "bot" && (
                                <span className="text-amber-600 font-medium">Bot: </span>
                              )}
                              {conv.latest_message}
                            </p>
                          ) : (
                            <span className="text-muted-foreground text-sm">(no messages)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={conv.status === "active" ? "default" : "secondary"}
                            className={cn(
                              "text-xs",
                              conv.status === "active" && "bg-green-100 text-green-700 border-green-200"
                            )}
                          >
                            {conv.status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatTime(conv.last_message_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Message Thread Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0 gap-0">
          {isLoadingMessages ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedConversation ? (
            <>
              {/* Header */}
              <SheetHeader className="border-b p-4 space-y-2">
                <SheetTitle className="text-left">
                  <div className="flex flex-col gap-1">
                    <span className="text-base font-semibold">
                      {getPatientName(selectedConversation.conversation.leads)}
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {selectedConversation.conversation.clinics?.name || "Unknown Clinic"}
                    </span>
                  </div>
                </SheetTitle>
                <div className="flex flex-wrap gap-2">
                  {selectedConversation.conversation.leads?.treatment_interest && (
                    <Badge variant="outline" className="text-xs">
                      {selectedConversation.conversation.leads.treatment_interest}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {selectedConversation.messages.length} message
                    {selectedConversation.messages.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {selectedConversation.conversation.leads?.email && (
                    <p>{selectedConversation.conversation.leads.email}</p>
                  )}
                  {selectedConversation.conversation.leads?.phone && (
                    <p>{selectedConversation.conversation.leads.phone}</p>
                  )}
                  {selectedConversation.conversation.leads?.contact_value &&
                    !selectedConversation.conversation.leads.email &&
                    !selectedConversation.conversation.leads.phone && (
                      <p>{selectedConversation.conversation.leads.contact_value}</p>
                    )}
                  <p>
                    Started{" "}
                    {new Date(selectedConversation.conversation.created_at).toLocaleDateString(
                      "en-GB",
                      { day: "numeric", month: "short", year: "numeric" }
                    )}
                  </p>
                </div>
              </SheetHeader>

              {/* Messages */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4" ref={scrollRef}>
                {selectedConversation.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                    <MessageSquare className="h-10 w-10 mb-2 text-muted-foreground/30" />
                    <p className="text-sm">No messages yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedConversation.messages.map((message, idx) => {
                      const prevMessage = idx > 0 ? selectedConversation.messages[idx - 1] : null

                      // Date separator
                      const showDateSep =
                        !prevMessage ||
                        formatMessageDate(message.created_at) !==
                          formatMessageDate(prevMessage.created_at)

                      // Sender label
                      const showSenderLabel =
                        message.sender_type !== "bot" &&
                        (!prevMessage || prevMessage.sender_type !== message.sender_type)

                      return (
                        <div key={message.id}>
                          {showDateSep && (
                            <div className="flex items-center justify-center my-4">
                              <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                {formatMessageDate(message.created_at)}
                              </span>
                            </div>
                          )}
                          <div
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
                              <span
                                className={cn(
                                  "text-[10px] font-medium mb-0.5 px-1",
                                  message.sender_type === "clinic"
                                    ? "text-teal-600"
                                    : "text-violet-600"
                                )}
                              >
                                {message.sender_type === "clinic"
                                  ? selectedConversation.conversation.clinics?.name || "Clinic"
                                  : getPatientName(selectedConversation.conversation.leads)}
                              </span>
                            )}
                            {message.sender_type === "bot" ? (
                              <div className="max-w-[80%] flex items-start gap-2 bg-gradient-to-r from-teal-50/10 to-secondary border border-teal-100/50 rounded-xl px-3 py-2">
                                <Heart className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-neutral-500 whitespace-pre-wrap">
                                  {message.content}
                                </p>
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
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
                                    {new Date(message.created_at).toLocaleTimeString("en-GB", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  {message.sent_via === "email" && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] opacity-70">
                                      <Mail className="w-2.5 h-2.5" />
                                      email
                                    </span>
                                  )}
                                  {message.sender_type === "clinic" && (
                                    <StatusIcon status={message.status} />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Read-only footer */}
              <div className="border-t p-3 text-center">
                <p className="text-xs text-muted-foreground">Read-only view</p>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}
