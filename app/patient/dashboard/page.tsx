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
  ChevronDown,
  Star,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { BookingDialog } from "@/components/clinic/booking-dialog"

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

interface RecommendedClinic {
  id: string
  slug?: string
  name: string
  address: string
  postcode: string
  phone: string
  rating: number
  review_count: number
  distance_miles?: number
  images?: string[]
  verified?: boolean
  match_percentage?: number
  match_reasons_composed?: string[]
  ai_headline?: string | null
  highlight_chips?: string[]
  available_this_week?: boolean
  offers_free_consultation?: boolean
  accepts_same_day?: boolean
  available_days?: string[]
}

const PAGE_SIZE = 10

export default function PatientDashboard() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [loadingMoreMatches, setLoadingMoreMatches] = useState(false)
  const [loadingMoreConvs, setLoadingMoreConvs] = useState(false)
  const [recommendedClinic, setRecommendedClinic] = useState<RecommendedClinic | null>(null)
  const [otherClinics, setOtherClinics] = useState<RecommendedClinic[]>([])
  const [showOtherClinics, setShowOtherClinics] = useState(false)
  const [loadingClinics, setLoadingClinics] = useState(false)
  const [showBookingDialog, setShowBookingDialog] = useState(false)

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

      // Fetch clinic details for the latest match (hero card)
      const latestMatch = dashboardData.matches?.[0]
      if (latestMatch) {
        fetchClinicDetails(latestMatch.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function fetchClinicDetails(matchId: string) {
    setLoadingClinics(true)
    try {
      const res = await fetch(`/api/matches/${matchId}`)
      if (res.ok) {
        const matchData = await res.json()
        const clinics = matchData.clinics || []
        if (clinics.length > 0) {
          setRecommendedClinic(clinics[0])
          setOtherClinics(clinics.slice(1))
        }
      }
    } catch (err) {
      console.error("Failed to fetch clinic details:", err)
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

  const totalUnread = data?.conversations?.reduce((sum, c) => sum + (c.unread_count_patient || 0), 0) || 0
  const hasMoreMatches = data ? data.matches.length < (data.matchesTotal || 0) : false
  const hasMoreConvs = data ? data.conversations.length < (data.conversationsTotal || 0) : false
  const latestMatch = data?.matches?.[0] || null
  const latestMatchLead = latestMatch ? data?.leads?.find((l) => l.id === latestMatch.lead_id) : null

  function getAvailabilityLabel(clinic: RecommendedClinic): string | null {
    if (clinic.accepts_same_day) return "Today"
    if (clinic.available_this_week) return "This week"
    if (clinic.available_days && clinic.available_days.length > 0) return "Available"
    return null
  }

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
      {/* Header strip */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="rounded-full bg-black p-2">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-semibold text-xl">Pearlie</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Welcome + email */}
        <div>
          <h1 className="text-2xl font-bold text-[#323141]">
            Hi{data?.user?.name ? `, ${data.user.name.split(" ")[0]}` : ""}
          </h1>
          {data?.user?.email && (
            <p className="text-sm text-[#323141]/50 mt-1">Logged in as {data.user.email}</p>
          )}
        </div>

        {/* ─── 1. HERO: Recommended clinic ─────────────────────────── */}
        <section>
          {!latestMatch ? (
            <Card className="p-8 text-center">
              <Search className="w-10 h-10 text-[#ccc] mx-auto mb-3" />
              <h2 className="font-semibold text-[#323141] text-lg mb-2">Find your perfect clinic</h2>
              <p className="text-muted-foreground mb-5 text-sm">
                Tell us what you need and we&apos;ll recommend the best clinic for you.
              </p>
              <Button asChild className="bg-gradient-to-r from-[#907EFF] to-[#ED64A6] text-white border-0">
                <Link href="/intake">Get matched</Link>
              </Button>
            </Card>
          ) : loadingClinics && !recommendedClinic ? (
            <Card className="p-10 flex flex-col items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#907EFF] mb-3" />
              <p className="text-sm text-muted-foreground">Finding your best match...</p>
            </Card>
          ) : recommendedClinic ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#907EFF]" />
                <h2 className="text-sm font-semibold text-[#323141]/70 uppercase tracking-wide">
                  Recommended for you
                </h2>
              </div>

              <Card className="overflow-hidden border-[#907EFF]/20 shadow-md">
                {/* Clinic image */}
                {recommendedClinic.images?.[0] && (
                  <div className="relative w-full h-44 bg-neutral-100">
                    <Image
                      src={recommendedClinic.images[0]}
                      alt={recommendedClinic.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="bg-[#907EFF] text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                        Top match
                      </span>
                    </div>
                    {recommendedClinic.match_percentage && (
                      <div className="absolute top-3 right-3">
                        <span className="bg-white/90 backdrop-blur-sm text-[#907EFF] text-xs font-bold px-2.5 py-1 rounded-full">
                          {recommendedClinic.match_percentage}% match
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-5 space-y-4">
                  {/* Clinic name + badge (no image fallback) */}
                  {!recommendedClinic.images?.[0] && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-[#907EFF] text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                        Top match
                      </span>
                      {recommendedClinic.match_percentage && (
                        <span className="bg-[#907EFF]/10 text-[#907EFF] text-xs font-bold px-2.5 py-1 rounded-full">
                          {recommendedClinic.match_percentage}% match
                        </span>
                      )}
                    </div>
                  )}

                  <h3 className="text-xl font-bold text-[#323141]">
                    {recommendedClinic.name}
                  </h3>

                  {/* Trust row: rating / distance / availability */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[#323141]/70">
                    {recommendedClinic.rating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-medium">{recommendedClinic.rating.toFixed(1)}</span>
                        {recommendedClinic.review_count > 0 && (
                          <span className="text-muted-foreground">({recommendedClinic.review_count})</span>
                        )}
                      </span>
                    )}
                    {recommendedClinic.distance_miles != null && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {recommendedClinic.distance_miles.toFixed(1)} miles
                      </span>
                    )}
                    {getAvailabilityLabel(recommendedClinic) && (
                      <span className="flex items-center gap-1 text-green-600">
                        <Clock className="w-3.5 h-3.5" />
                        {getAvailabilityLabel(recommendedClinic)}
                      </span>
                    )}
                    {recommendedClinic.verified && (
                      <span className="flex items-center gap-1 text-[#907EFF]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    )}
                  </div>

                  {/* Why Pearlie picked this clinic */}
                  {recommendedClinic.match_reasons_composed && recommendedClinic.match_reasons_composed.length > 0 && (
                    <div className="bg-[#f8f5ff] rounded-xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-[#907EFF] uppercase tracking-wide">
                        Why we matched you
                      </p>
                      <ul className="space-y-1.5">
                        {recommendedClinic.match_reasons_composed.slice(0, 3).map((reason, i) => (
                          <li key={i} className="text-sm text-[#323141]/80 flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#907EFF] flex-shrink-0 mt-0.5" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Primary action area */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <Button
                      className="flex-1 bg-[#907EFF] hover:bg-[#7C6AE8] text-white h-11 text-base font-semibold rounded-xl"
                      onClick={() => setShowBookingDialog(true)}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Book appointment
                    </Button>
                    {data?.conversations?.find(c => c.clinic_id === recommendedClinic.id) ? (
                      <Button
                        asChild
                        variant="outline"
                        className="flex-1 h-11 rounded-xl"
                      >
                        <Link href={`/patient/messages?conversationId=${data.conversations.find(c => c.clinic_id === recommendedClinic.id)!.id}`}>
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Message clinic
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        asChild
                        variant="outline"
                        className="flex-1 h-11 rounded-xl"
                      >
                        <Link href={recommendedClinic.slug ? `/clinic/${recommendedClinic.slug}` : `/match/${latestMatch.id}`}>
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Message clinic
                        </Link>
                      </Button>
                    )}
                  </div>
                  <div className="text-center">
                    <Link
                      href={recommendedClinic.slug ? `/clinic/${recommendedClinic.slug}` : `/match/${latestMatch.id}`}
                      className="text-sm text-[#907EFF] hover:underline"
                    >
                      View full profile
                    </Link>
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    No pressure — you can message first if you prefer.
                  </p>
                </div>
              </Card>
            </div>
          ) : (
            /* Fallback: match exists but no clinic details loaded */
            <Link href={`/match/${latestMatch.id}`}>
              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer border-[#907EFF]/20 bg-gradient-to-br from-white to-[#f8f5ff]">
                <div className="space-y-3">
                  <span className="text-xs font-medium text-[#907EFF] bg-[#907EFF]/10 px-2 py-0.5 rounded-full">
                    Your latest match
                  </span>
                  <p className="font-semibold text-[#323141] text-lg">
                    {latestMatchLead?.treatment_interest || "Dental enquiry"}
                  </p>
                  <p className="text-sm text-[#907EFF] font-medium">
                    View your {latestMatch.clinic_ids?.length || 0} matched clinics →
                  </p>
                </div>
              </Card>
            </Link>
          )}
        </section>

        {/* ─── 2. OTHER CLINICS (collapsed by default) ────────────── */}
        {otherClinics.length > 0 && latestMatch && (
          <section>
            <button
              onClick={() => setShowOtherClinics(!showOtherClinics)}
              className="flex items-center justify-between w-full text-left group"
            >
              <h2 className="text-sm font-semibold text-[#323141]/70 uppercase tracking-wide">
                Other suitable clinics ({otherClinics.length})
              </h2>
              <ChevronDown className={`w-4 h-4 text-[#323141]/50 transition-transform ${showOtherClinics ? "rotate-180" : ""}`} />
            </button>

            {!showOtherClinics ? (
              /* Collapsed preview: show 3 mini cards */
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {otherClinics.slice(0, 3).map((clinic) => (
                  <Link
                    key={clinic.id}
                    href={clinic.slug ? `/clinic/${clinic.slug}` : `/match/${latestMatch.id}`}
                  >
                    <Card className="p-3 hover:shadow-sm transition-shadow cursor-pointer">
                      <p className="font-medium text-[#323141] text-sm truncate">{clinic.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {clinic.distance_miles != null
                          ? `${clinic.distance_miles.toFixed(1)} miles`
                          : clinic.postcode}
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              /* Expanded: all clinics, still smaller than hero */
              <div className="mt-3 space-y-2">
                {otherClinics.map((clinic) => (
                  <Link
                    key={clinic.id}
                    href={clinic.slug ? `/clinic/${clinic.slug}` : `/match/${latestMatch.id}`}
                  >
                    <Card className="p-4 hover:shadow-sm transition-shadow cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          {clinic.images?.[0] ? (
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-100">
                              <Image src={clinic.images[0]} alt={clinic.name} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#907EFF]/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-[#907EFF]">
                                {clinic.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-[#323141] text-sm truncate">{clinic.name}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              {clinic.distance_miles != null && (
                                <span>{clinic.distance_miles.toFixed(1)} mi</span>
                              )}
                              {clinic.rating > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  {clinic.rating.toFixed(1)}
                                </span>
                              )}
                              {getAvailabilityLabel(clinic) && (
                                <span className="text-green-600">{getAvailabilityLabel(clinic)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {otherClinics.length > 3 && !showOtherClinics && (
              <button
                onClick={() => setShowOtherClinics(true)}
                className="mt-2 text-sm text-[#907EFF] hover:underline"
              >
                View all {otherClinics.length} clinics
              </button>
            )}
          </section>
        )}

        {/* ─── 3. MESSAGES (compact inbox) ─────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#323141]/70 uppercase tracking-wide">
                Messages
              </h2>
              {totalUnread > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full inline-flex items-center justify-center">
                  {totalUnread}
                </span>
              )}
            </div>
            {data?.conversations && data.conversations.length > 0 && (
              <Link
                href="/patient/messages"
                className="text-xs text-[#907EFF] hover:underline flex items-center gap-0.5"
              >
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {(!data?.conversations || data.conversations.length === 0) ? (
            <Card className="p-5 text-center">
              <MessageCircle className="h-8 w-8 text-[#ccc] mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Questions before booking? Message the clinic here.
              </p>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {data.conversations.slice(0, 4).map((conv) => (
                <Link key={conv.id} href={`/patient/messages?conversationId=${conv.id}`}>
                  <Card className={`px-4 py-3 hover:shadow-sm transition-shadow cursor-pointer ${
                    conv.unread_by_patient ? "border-[#907EFF]/20 bg-[#faf8ff]" : ""
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="h-8 w-8 rounded-full bg-[#907EFF] flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-semibold">
                            {(conv.clinics?.name || "C").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm truncate ${conv.unread_by_patient ? "font-semibold text-[#323141]" : "font-medium text-[#323141]/80"}`}>
                            {conv.clinics?.name || "Clinic"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.last_message_at
                              ? new Date(conv.last_message_at).toLocaleDateString("en-GB", {
                                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                                })
                              : "No messages yet"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {conv.unread_by_patient && conv.unread_count_patient > 0 && (
                          <span className="bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full inline-flex items-center justify-center">
                            {conv.unread_count_patient}
                          </span>
                        )}
                        {conv.unread_by_patient && !conv.unread_count_patient && (
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}

              {hasMoreConvs && (
                <div className="text-center pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadMoreConversations}
                    disabled={loadingMoreConvs}
                    className="text-xs text-[#907EFF]"
                  >
                    {loadingMoreConvs ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : null}
                    {loadingMoreConvs
                      ? "Loading..."
                      : `View more (${(data?.conversationsTotal || 0) - data.conversations.length} remaining)`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ─── 4. MATCH HISTORY (minimal, low priority) ────────────── */}
        {data?.matches && data.matches.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-[#323141]/70 uppercase tracking-wide mb-3">
              Match history
            </h2>

            <div className="space-y-1.5">
              {data.matches.map((match) => {
                const lead = data.leads.find((l) => l.id === match.lead_id)
                return (
                  <Link key={match.id} href={`/match/${match.id}`}>
                    <Card className="px-4 py-3 hover:shadow-sm transition-shadow cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground text-xs w-16 flex-shrink-0">
                            {new Date(match.created_at).toLocaleDateString("en-GB", {
                              day: "numeric", month: "short",
                            })}
                          </span>
                          <span className="text-[#323141] font-medium truncate">
                            {lead?.treatment_interest || "Dental enquiry"}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {match.clinic_ids?.length || 0} matched
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </Card>
                  </Link>
                )
              })}

              {hasMoreMatches && (
                <div className="text-center pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadMoreMatches}
                    disabled={loadingMoreMatches}
                    className="text-xs text-[#907EFF]"
                  >
                    {loadingMoreMatches ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : null}
                    {loadingMoreMatches
                      ? "Loading..."
                      : `Load more (${(data?.matchesTotal || 0) - data.matches.length} remaining)`}
                  </Button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Start new search */}
        <div className="text-center pt-2 pb-4">
          <Button asChild variant="outline" size="lg" className="rounded-2xl">
            <Link href="/intake">
              <Search className="w-4 h-4 mr-2" />
              Start a new search
            </Link>
          </Button>
        </div>
      </main>

      {/* Booking dialog */}
      {showBookingDialog && recommendedClinic && latestMatchLead && (
        <BookingDialog
          leadId={latestMatch!.lead_id}
          clinicId={recommendedClinic.id}
          patientName={`${latestMatchLead.first_name} ${latestMatchLead.last_name}`}
          onClose={() => setShowBookingDialog(false)}
          onSuccess={() => {
            setShowBookingDialog(false)
            fetchDashboard()
          }}
        />
      )}
    </div>
  )
}
