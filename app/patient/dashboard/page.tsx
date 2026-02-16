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
              <span className="bg-[#907EFF] text-white text-xs font-semibold px-2 py-1 rounded-full">
                {totalUnread} new
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

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-[#323141]">
            Hi{data?.user?.name ? `, ${data.user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-[#323141]/70 mt-1">Here are your clinic matches and conversations.</p>
        </div>

        {/* Matches Section */}
        <section>
          <h2 className="text-lg font-semibold text-[#323141] mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-[#907EFF]" />
            Your matches
          </h2>

          {(!data?.matches || data.matches.length === 0) ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No matches yet.</p>
              <Button asChild className="bg-gradient-to-r from-[#907EFF] to-[#ED64A6] text-white border-0">
                <Link href="/intake">Find your clinic match</Link>
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {data.matches.map((match) => {
                const lead = data.leads.find((l) => l.id === match.lead_id)
                return (
                  <Link key={match.id} href={`/match/${match.id}`}>
                    <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold text-[#323141]">
                            {lead?.treatment_interest || "Dental enquiry"}
                          </p>
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
                                day: "numeric",
                                month: "short",
                                year: "numeric",
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

              {/* Load more matches */}
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
            </div>
          )}
        </section>

        {/* Conversations Section */}
        <section>
          <h2 className="text-lg font-semibold text-[#323141] mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#907EFF]" />
            Your conversations
            {totalUnread > 0 && (
              <span className="bg-[#907EFF] text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </h2>

          {(!data?.conversations || data.conversations.length === 0) ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                No conversations yet. Message a clinic from your match results to start chatting.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {data.conversations.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/clinic/${conv.clinic_id}?leadId=${conv.lead_id}`}
                >
                  <Card className={`p-5 hover:shadow-md transition-shadow cursor-pointer ${conv.unread_by_patient ? "border-[#907EFF]/30 bg-[#F8F5FF]/30" : ""}`}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[#323141]">
                            {conv.clinics?.name || "Clinic"}
                          </p>
                          {conv.unread_by_patient && (
                            <span className="w-2.5 h-2.5 rounded-full bg-[#907EFF]" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Last message:{" "}
                          {conv.last_message_at
                            ? new Date(conv.last_message_at).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "No messages yet"}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </Card>
                </Link>
              ))}

              {/* Load more conversations */}
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
            </div>
          )}
        </section>

        {/* Start new search */}
        <div className="text-center pt-4">
          <Button asChild variant="outline" size="lg" className="rounded-2xl">
            <Link href="/intake">
              <Search className="w-4 h-4 mr-2" />
              Start a new search
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
