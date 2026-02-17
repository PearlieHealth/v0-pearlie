"use client"

import { useEffect, useState, useCallback } from "react"
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
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import Link from "next/link"
import { BookingCard } from "@/components/match/booking-card"
import { OtherClinicCard } from "@/components/match/other-clinic-card"
import { InlineChatPanel } from "@/components/match/inline-chat-panel"

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

interface MatchClinic {
  id: string
  slug?: string
  name: string
  address: string
  postcode: string
  phone: string
  rating: number
  review_count: number
  treatments: string[]
  price_range: string
  description: string
  website?: string
  latitude?: number
  longitude?: number
  images?: string[]
  verified?: boolean
  accepts_nhs?: boolean
  wheelchair_accessible?: boolean
  parking_available?: boolean
  distance_miles?: number
  match_percentage?: number
  match_reasons?: string[]
  match_reasons_composed?: string[]
  match_breakdown?: Array<{
    category: string
    points: number
    maxPoints: number
  }>
  tier?: string
  card_title?: string
  is_directory_listing?: boolean
  is_emergency?: boolean
  offers_free_consultation?: boolean
  highlight_chips?: string[]
  available_days?: string[]
  available_hours?: string[]
  accepts_same_day?: boolean
  languages_spoken?: string[]
  opening_hours?: Record<string, any>
}

const PAGE_SIZE = 10

export default function PatientDashboard() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [loadingMoreMatches, setLoadingMoreMatches] = useState(false)
  const [loadingMoreConvs, setLoadingMoreConvs] = useState(false)

  // Booking card state
  const [matchClinics, setMatchClinics] = useState<MatchClinic[]>([])
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null)
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null)
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null)
  const [loadingClinics, setLoadingClinics] = useState(false)
  const [showOlderMatches, setShowOlderMatches] = useState(false)
  const [showChat, setShowChat] = useState(false)

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

      // Auto-load clinic details for the most recent match
      if (dashboardData.matches && dashboardData.matches.length > 0) {
        const latestMatch = dashboardData.matches[0]
        await fetchMatchClinics(latestMatch.id, latestMatch.lead_id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function fetchMatchClinics(matchId: string, leadId: string) {
    setLoadingClinics(true)
    try {
      const res = await fetch(`/api/matches/${matchId}`)
      if (!res.ok) return

      const matchData = await res.json()
      if (matchData.clinics && matchData.clinics.length > 0) {
        // Filter to verified matched clinics (not directory/nearby listings)
        const verifiedClinics = matchData.clinics.filter(
          (c: MatchClinic) => c.tier !== "directory" && c.tier !== "nearby" && !c.is_directory_listing
        )
        const clinicsToUse = verifiedClinics.length > 0 ? verifiedClinics : matchData.clinics

        setMatchClinics(clinicsToUse)
        setSelectedClinicId(clinicsToUse[0]?.id || null)
        setActiveMatchId(matchId)
        setActiveLeadId(leadId)
      }
    } catch (err) {
      console.error("Failed to load match clinics:", err)
    } finally {
      setLoadingClinics(false)
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

  const handleSelectClinic = useCallback((clinicId: string) => {
    setSelectedClinicId(clinicId)
    setShowChat(true)
  }, [])

  const handleMessageClick = useCallback(() => {
    setShowChat(true)
  }, [])

  const handleBookSlot = useCallback((date: Date, time: string) => {
    if (!selectedClinicId || !activeLeadId) return
    const dateStr = date.toISOString().split("T")[0]
    window.location.href = `/booking/confirm?clinicId=${selectedClinicId}&leadId=${activeLeadId}&date=${dateStr}&time=${time}`
  }, [selectedClinicId, activeLeadId])

  const totalUnread = data?.conversations?.reduce((sum, c) => sum + (c.unread_count_patient || 0), 0) || 0

  const hasMoreMatches = data ? data.matches.length < (data.matchesTotal || 0) : false
  const hasMoreConvs = data ? data.conversations.length < (data.conversationsTotal || 0) : false

  // Derived: selected clinic and other clinics
  const selectedClinic = matchClinics.find((c) => c.id === selectedClinicId) || null
  const otherClinics = matchClinics.filter((c) => c.id !== selectedClinicId)
  const isTopMatch = selectedClinicId === matchClinics[0]?.id

  // Older matches (excluding the active one being shown as booking card)
  const olderMatches = data?.matches?.slice(1) || []

  // Lead info for the active match
  const activeLead = data?.leads?.find((l) => l.id === activeLeadId)

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
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#323141]">
            Hi{data?.user?.name ? `, ${data.user.name.split(" ")[0]}` : ""}
          </h1>
          {activeLead ? (
            <p className="text-[#323141]/70 mt-1">
              Your recommended clinic for <span className="font-medium">{activeLead.treatment_interest || "your dental enquiry"}</span>
            </p>
          ) : (
            <p className="text-[#323141]/70 mt-1">Here are your clinic matches and conversations.</p>
          )}
        </div>

        {/* No matches state */}
        {(!data?.matches || data.matches.length === 0) && (
          <Card className="p-8 text-center mb-8">
            <p className="text-muted-foreground mb-4">No matches yet.</p>
            <Button asChild className="bg-gradient-to-r from-[#907EFF] to-[#ED64A6] text-white border-0">
              <Link href="/intake">Find your clinic match</Link>
            </Button>
          </Card>
        )}

        {/* Loading clinics for booking card */}
        {loadingClinics && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#907EFF] mr-3" />
            <span className="text-muted-foreground">Loading your clinic recommendations...</span>
          </div>
        )}

        {/* Booking Card Layout - Two columns on desktop */}
        {selectedClinic && !loadingClinics && (
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 mb-8">
            {/* Left column: Booking card + other clinics */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Booking Card for selected clinic */}
              <BookingCard
                clinic={selectedClinic}
                isTopMatch={isTopMatch}
                matchId={activeMatchId || ""}
                leadId={activeLeadId}
                onMessageClick={handleMessageClick}
                onBookSlot={handleBookSlot}
              />

              {/* Other suitable clinics */}
              {otherClinics.length > 0 && (
                <section>
                  <h3 className="text-base font-semibold text-[#323141] mb-3">
                    Other suitable clinics
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {otherClinics.map((clinic) => (
                      <OtherClinicCard
                        key={clinic.id}
                        clinic={clinic}
                        isSelected={clinic.id === selectedClinicId}
                        onClick={() => handleSelectClinic(clinic.id)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Right column: Chat panel (desktop), hidden on mobile */}
            <div className="hidden lg:block w-full lg:w-[380px] flex-shrink-0">
              <div className="sticky top-24">
                <Card className="overflow-hidden h-[600px] flex flex-col">
                  {activeLeadId && selectedClinicId && (
                    <InlineChatPanel
                      leadId={activeLeadId}
                      clinicId={selectedClinicId}
                      clinicName={selectedClinic.name}
                      isEmailVerified={activeLead?.is_verified}
                    />
                  )}
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Mobile chat panel - collapsible */}
        {selectedClinic && showChat && activeLeadId && (
          <div className="lg:hidden mb-8">
            <Card className="overflow-hidden h-[450px] flex flex-col">
              <InlineChatPanel
                leadId={activeLeadId}
                clinicId={selectedClinicId!}
                clinicName={selectedClinic.name}
                isEmailVerified={activeLead?.is_verified}
              />
            </Card>
          </div>
        )}

        {/* Older Matches Section */}
        {olderMatches.length > 0 && (
          <section className="mb-8">
            <button
              type="button"
              onClick={() => setShowOlderMatches(!showOlderMatches)}
              className="flex items-center gap-2 text-sm font-semibold text-[#323141] mb-3 hover:text-[#907EFF] transition-colors"
            >
              <Search className="w-4 h-4 text-[#907EFF]" />
              Previous matches ({olderMatches.length})
              {showOlderMatches ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showOlderMatches && (
              <div className="space-y-3">
                {olderMatches.map((match) => {
                  const lead = data?.leads?.find((l) => l.id === match.lead_id)
                  return (
                    <Card
                      key={match.id}
                      className="p-5 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => fetchMatchClinics(match.id, match.lead_id)}
                    >
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
                        `Load more (${(data?.matchesTotal || 0) - (data?.matches?.length || 0)} remaining)`
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Conversations Section */}
        {data?.conversations && data.conversations.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#323141] mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#907EFF]" />
              Your conversations
              {totalUnread > 0 && (
                <span className="bg-[#907EFF] text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                  {totalUnread}
                </span>
              )}
            </h2>

            <div className="space-y-3">
              {data.conversations.map((conv) => (
                <Card
                  key={conv.id}
                  className={`p-5 hover:shadow-md transition-shadow cursor-pointer ${conv.unread_by_patient ? "border-[#907EFF]/30 bg-[#F8F5FF]/30" : ""}`}
                  onClick={() => {
                    // If this conversation's clinic is in our current match, select it
                    const matchClinic = matchClinics.find((c) => c.id === conv.clinic_id)
                    if (matchClinic) {
                      handleSelectClinic(conv.clinic_id)
                    } else {
                      // Navigate to the clinic page for conversations from other matches
                      window.location.href = `/clinic/${conv.clinic_id}?leadId=${conv.lead_id}`
                    }
                  }}
                >
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
            </div>
          </section>
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
      </main>
    </div>
  )
}
