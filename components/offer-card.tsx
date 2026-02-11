"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Tag } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface OfferCardProps {
  offer: {
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
  matchId?: string
  onClickOffer?: (offerId: string, clinicId: string) => void
}

export function OfferCard({ offer, matchId, onClickOffer }: OfferCardProps) {
  const clinic = offer.clinics
  const clinicImage = clinic.images?.[0]

  // Build booking URL with UTM parameters
  const bookingUrl = clinic.website
    ? `${clinic.website}?utm_source=pearlie&utm_medium=offers&utm_campaign=limited_availability${matchId ? `&match_id=${matchId}` : ""}`
    : "#"

  const handleClick = () => {
    if (onClickOffer) {
      onClickOffer(offer.id, clinic.id)
    }
  }

  return (
    <Card className="flex-shrink-0 w-[280px] overflow-hidden hover:shadow-lg transition-shadow">
      {clinicImage && (
        <div className="relative h-40 w-full bg-muted">
          <Image src={clinicImage || "/placeholder.svg"} alt={clinic.name} fill className="object-cover" />
        </div>
      )}
      <div className="p-4 space-y-3">
        <div>
          <Badge variant="secondary" className="mb-2">
            <Tag className="w-3 h-3 mr-1" />
            Limited availability
          </Badge>
          <h3 className="font-semibold text-lg line-clamp-1">{offer.title}</h3>
          {offer.subtitle && <p className="text-sm text-muted-foreground line-clamp-1">{offer.subtitle}</p>}
        </div>

        <div className="space-y-1">
          <div className="flex items-start gap-1.5">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium line-clamp-1">{clinic.name}</p>
              <p className="text-muted-foreground text-xs line-clamp-1">{clinic.address || clinic.postcode}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            {offer.indicative_price && <p className="font-semibold text-lg">{offer.indicative_price}</p>}
            {offer.saving_text && <p className="text-sm text-green-600 font-medium">{offer.saving_text}</p>}
          </div>
        </div>

        <Button asChild className="w-full" variant="default" onClick={handleClick}>
          <Link href={bookingUrl} target="_blank" rel="noopener noreferrer">
            View clinic
          </Link>
        </Button>
      </div>
    </Card>
  )
}
