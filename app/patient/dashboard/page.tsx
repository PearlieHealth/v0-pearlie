"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  Calendar,
  LogOut,
  Search,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  treatment_interest: string
  postcode: string
  created_at: string
  is_verified: boolean
}

interface Match {
  id: string
  lead_id: string
  clinic_ids: string[]
  status: string
  created_at: string
}

interface Conversation {
  id: string
  clinic_id: string
  lead_id: string
  status: string
  last_message_at: string
  unread_by_patient: boolean
  unread_count_patient: number
  clinics: { id: string; name: string; images?: string[] } | null
}

interface DashboardData {
  user: { id: string; email: string; name: string }
  leads: Lead[]
  matches: Match[]
  conversations: Conversation[]
  matchesTotal: number
  conversationsTotal: number
}

const PAGE_SIZE = 10

export default function PatientDashboard() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [loadingMoreMatches, setLoadingMoreMatches] = useState(false)
  const [loadingMoreConvs, setLoadingMoreConvs] = useState(false)
  const [activeTab, setActiveTab] = useState<"latest" | "messages" | "history">("latest")

  useEffect(() => {
    fetchDashboard()
  }, [])

  async function fetchDashboard() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/patient/login")
        return
      }

      const res = await fetch(`/api/patient/matches?matchesLimit=${PAGE_SIZE}&convsLimit=${PAGE_SIZE}`)
      if (!res.ok) {
        if (res.status === 401) {
          router.replace("/patient/login")
          return
        }
        throw new Error("Failed to load dashboard")
      }

      const dashboardData = await res.json()
      setData(dashboardData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function loadMoreMatches() {
    if (!data) return
    setLoadingMoreMatches(true)
    try {
      const offset = data.matches.length
      const res = await fetch(
        `/api/patient/matches?matchesLimit=${PAGE_SIZE}&matchesOffset=${offset}&convsLimit=0`
      )
      if (res.ok) {
        const moreData = await res.json()
        setData({
          ...data,
          matches: [...data.matches, ...(moreData.matches || [])],
        })
      }
    } catch (err) {
      console.error("Failed to load more matches:", err)
    } finally {
      setLoadingMoreMatches(false)
    }
  }

  async function loadMoreConversations() {
    if (!data) return
    setLoadingMoreConvs(true)
    try {
      const offset = data.conversations.length
      const res = await fetch(
        `/api/patient/matches?matchesLimit=0&convsLimit=${PAGE_SIZE}&convsOffset=${offset}`
      )
      if (res.ok) {
        const moreData = await res.json()
        setData({
          ...data,
          conversations: [...data.conversations, ...(moreData.conversations || [])],
        })
      }
    } catch (err) {
      console.error("Failed to load more conversations:", err)
    } finally {
      setLoadingMoreConvs(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/patient/login")
  }

  const totalUnread = data?.conversations?.reduce((sum, c) => sum + (c.unread_count_patient || 0), 0) || 0

  const hasMoreMatches = data ? data.matches.length < (data.matchesTotal || 0) : false
  const hasMoreConvs = data ? data.conversations.length < (data.conversationsTotal || 0) : false

  const latestMatch = data?.matches?.[0] || null
  const latestMatchLead = latestMatch ? data?.leads?.find((l) => l.id === latestMatch.lead_id) : null

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#907EFF]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchDashboard}>Try again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="rounded-full bg-black p-2">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-semibold text-xl">Pearlie</span>
          </Link>
          <div className="flex items-center gap-3">
            {totalUnread > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold min-w-[20px] h-5 px-1.5 rounded-full inline-flex items-center justify-center">
                {totalUnread}
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Welcome + email */}
        <div>
          <h1 className="text-2xl font-bold text-[#323141]">
            Hi{data?.user?.name ? `, ${data.user.name.split(" ")[0]}` : ""}
          </h1>
          {data?.user?.email && (
            <p className="text-sm text-[#323141]/50 mt-1">Logged in as {data.user.email}</p>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex bg-[#eeedf2] rounded-full p-1">
          {([
            { key: "latest" as const, label: "Latest Match" },
            { key: "messages" as const, label: "Messages", badge: totalUnread },
            { key: "history" as const, label: "Match History" },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 px-3 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === tab.key
                  ? "bg-white text-[#323141] shadow-sm"
                  : "text-[#323141]/60 hover:text-[#323141]/80"
              }`}
            >
              {tab.label}
              {tab.badge ? (
                <span className="bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full inline-flex items-center justify-center">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* ── Latest Match tab ──────────────────────────────────────── */}
        {activeTab === "latest" && (
          <section className="space-y-5">
            {!latestMatch ? (
              <Card className="p-8 text-center">
                <Search className="w-10 h-10 text-[#ccc] mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No matches yet.</p>
                <Button asChild className="bg-gradient-to-r from-[#907EFF] to-[#ED64A6] text-white border-0">
                  <Link href="/intake">Find your clinic match</Link>
                </Button>
              </Card>
            ) : (
              <Link href={`/match/${latestMatch.id}`}>
                <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer border-[#907EFF]/20 bg-gradient-to-br from-white to-[#f8f5ff]">
                  <div className="space-y-3">
                    <span className="text-xs font-medium text-[#907EFF] bg-[#907EFF]/10 px-2 py-0.5 rounded-full">
                      Most recent
                    </span>
                    <p className="font-semibold text-[#323141] text-lg">
                      {latestMatchLead?.treatment_interest || "Dental enquiry"}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {latestMatchLead?.postcode && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {latestMatchLead.postcode}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(latestMatch.created_at).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-[#907EFF] font-medium">
                        {latestMatch.clinic_ids?.length || 0} clinics matched
                      </p>
                      <ChevronRight className="w-5 h-5 text-[#907EFF]" />
                    </div>
                  </div>
                </Card>
              </Link>
            )}

            {/* Quick conversations preview under latest match */}
            {data?.conversations && data.conversations.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-[#323141]/70">Active conversations</p>
                  <button
                    onClick={() => setActiveTab("messages")}
                    className="text-xs text-[#907EFF] hover:underline"
                  >
                    View all →
                  </button>
                </div>
                <div className="space-y-2">
                  {data.conversations.slice(0, 3).map((conv) => (
                    <Link key={conv.id} href={`/patient/messages?conversationId=${conv.id}`}>
                      <Card className={`p-3.5 hover:shadow-sm transition-shadow cursor-pointer ${
                        conv.unread_by_patient ? "border-[#907EFF]/30 bg-[#F8F5FF]/30" : ""
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-[#907EFF] flex items-center justify-center">
                              <span className="text-white text-xs font-semibold">
                                {(conv.clinics?.name || "C").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <p className="font-medium text-[#323141] text-sm">
                              {conv.clinics?.name || "Clinic"}
                            </p>
                            {conv.unread_by_patient && (
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Start new search */}
            <div className="text-center pt-2">
              <Button asChild variant="outline" size="lg" className="rounded-2xl">
                <Link href="/intake">
                  <Search className="w-4 h-4 mr-2" />
                  Start a new search
                </Link>
              </Button>
            </div>
          </section>
        )}

        {/* ── Messages tab ──────────────────────────────────────────── */}
        {activeTab === "messages" && (
          <section className="space-y-3">
            {(!data?.conversations || data.conversations.length === 0) ? (
              <Card className="p-8 text-center">
                <MessageCircle className="h-10 w-10 text-[#ccc] mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No conversations yet. Message a clinic from your match results to start chatting.
                </p>
              </Card>
            ) : (
              <>
                <div className="flex justify-end">
                  <Link
                    href="/patient/messages"
                    className="text-sm text-[#907EFF] hover:underline flex items-center gap-1"
                  >
                    Open full inbox <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                {data.conversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/patient/messages?conversationId=${conv.id}`}
                  >
                    <Card className={`p-5 hover:shadow-md transition-shadow cursor-pointer ${
                      conv.unread_by_patient ? "border-[#907EFF]/30 bg-[#F8F5FF]/30" : ""
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-[#907EFF] flex items-center justify-center">
                            <span className="text-white text-sm font-semibold">
                              {(conv.clinics?.name || "C").charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-[#323141]">
                                {conv.clinics?.name || "Clinic"}
                              </p>
                              {conv.unread_by_patient && (
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {conv.last_message_at
                                ? new Date(conv.last_message_at).toLocaleDateString("en-GB", {
                                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                                  })
                                : "No messages yet"}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </Card>
                  </Link>
                ))}

                {hasMoreConvs && (
                  <div className="text-center pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadMoreConversations}
                      disabled={loadingMoreConvs}
                      className="text-xs"
                    >
                      {loadingMoreConvs ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        `Load more (${(data?.conversationsTotal || 0) - data.conversations.length} remaining)`
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* ── Match History tab ─────────────────────────────────────── */}
        {activeTab === "history" && (
          <section className="space-y-3">
            {(!data?.matches || data.matches.length === 0) ? (
              <Card className="p-8 text-center">
                <Search className="w-10 h-10 text-[#ccc] mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No matches yet.</p>
                <Button asChild className="bg-gradient-to-r from-[#907EFF] to-[#ED64A6] text-white border-0">
                  <Link href="/intake">Find your clinic match</Link>
                </Button>
              </Card>
            ) : (
              <>
                {data.matches.map((match, idx) => {
                  const lead = data.leads.find((l) => l.id === match.lead_id)
                  return (
                    <Link key={match.id} href={`/match/${match.id}`}>
                      <Card className={`p-5 hover:shadow-md transition-shadow cursor-pointer ${
                        idx === 0 ? "border-[#907EFF]/20 bg-gradient-to-br from-white to-[#f8f5ff]" : ""
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-[#323141]">
                                {lead?.treatment_interest || "Dental enquiry"}
                              </p>
                              {idx === 0 && (
                                <span className="text-[10px] font-medium text-[#907EFF] bg-[#907EFF]/10 px-1.5 py-0.5 rounded-full">
                                  Latest
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {lead?.postcode && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {lead.postcode}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(match.created_at).toLocaleDateString("en-GB", {
                                  day: "numeric", month: "short", year: "numeric",
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-[#907EFF] font-medium">
                              {match.clinic_ids?.length || 0} clinics matched
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </Card>
                    </Link>
                  )
                })}

                {hasMoreMatches && (
                  <div className="text-center pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadMoreMatches}
                      disabled={loadingMoreMatches}
                      className="text-xs"
                    >
                      {loadingMoreMatches ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        `Load more (${(data?.matchesTotal || 0) - data.matches.length} remaining)`
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Start new search */}
            <div className="text-center pt-4">
              <Button asChild variant="outline" size="lg" className="rounded-2xl">
                <Link href="/intake">
                  <Search className="w-4 h-4 mr-2" />
                  Start a new search
                </Link>
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
