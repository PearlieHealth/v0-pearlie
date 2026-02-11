"use client"

import { useEffect, useState } from "react"
import { OfferCard } from "@/components/offer-card"
import { Skeleton } from "@/components/ui/skeleton"

interface Offer {
  id: string
  title: string
  subtitle?: string
  indicative_price?: string
  saving_text?: string
  clinics: {
    id: string
    name: string
    address?: string
    postcode?: string
    images?: string[]
    website?: string
  }
}

interface OffersStripProps {
  matchId?: string
}

export function OffersStrip({ matchId }: OffersStripProps) {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchOffers() {
      try {
        const response = await fetch("/api/offers?limit=10")
        if (!response.ok) throw new Error("Failed to fetch offers")
        const data = await response.json()
        setOffers(data.offers || [])
      } catch (err) {
        console.error("Error fetching offers:", err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchOffers()
  }, [])

  const handleClickOffer = async (offerId: string, clinicId: string) => {
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "click_offer",
          match_id: matchId || null,
          clinic_id: clinicId,
          metadata: { offer_id: offerId },
        }),
      })
    } catch (err) {
      console.error("Error tracking offer click:", err)
    }
  }

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[280px]">
            <Skeleton className="h-[400px] w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (error || offers.length === 0) {
    return null // Silently hide if no offers or error
  }

  return (
    <div>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
        {offers.map((offer) => (
          <div key={offer.id} className="snap-start">
            <OfferCard offer={offer} matchId={matchId} onClickOffer={handleClickOffer} />
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-4 max-w-3xl">
        Offers and availability subject to change. Prices shown are indicative and set by independent clinics. Final
        price confirmed at booking.
      </p>
    </div>
  )
}
