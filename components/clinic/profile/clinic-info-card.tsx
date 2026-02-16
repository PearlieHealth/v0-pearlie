"use client"

import { MapPin, Phone, Globe, ExternalLink } from "lucide-react"
import type { Clinic } from "./types"

interface ClinicInfoCardProps {
  clinic: Clinic
}

export function ClinicInfoCard({ clinic }: ClinicInfoCardProps) {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.address + ", " + clinic.postcode)}`
  const websiteUrl = clinic.website
    ? clinic.website.startsWith("http") ? clinic.website : `https://${clinic.website}`
    : null

  return (
    <div className="border border-[#e5e5e5] rounded-xl overflow-hidden">
      <div className="divide-y divide-[#f0f0f0]">
        {/* Address */}
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-[#fafafa] transition-colors group"
        >
          <MapPin className="h-[18px] w-[18px] text-[#999] mt-0.5 flex-shrink-0 group-hover:text-[#666]" />
          <div className="min-w-0">
            <p className="text-sm text-[#444] leading-snug">{clinic.address}</p>
            {(clinic.city || clinic.postcode) && (
              <p className="text-sm text-[#444] leading-snug">
                {clinic.city || ""}{clinic.city && clinic.postcode ? ", " : ""}{clinic.postcode}
              </p>
            )}
          </div>
        </a>

        {/* Phone */}
        {clinic.phone && (
          <a
            href={`tel:${clinic.phone}`}
            className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-[#fafafa] transition-colors group"
          >
            <Phone className="h-[18px] w-[18px] text-[#999] flex-shrink-0 group-hover:text-[#666]" />
            <span className="text-sm text-[#444]">{clinic.phone}</span>
          </a>
        )}

        {/* Website */}
        {websiteUrl && (
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-[#fafafa] transition-colors group"
          >
            <Globe className="h-[18px] w-[18px] text-[#999] flex-shrink-0 group-hover:text-[#666]" />
            <span className="text-sm text-[#444] truncate">{clinic.website}</span>
            <ExternalLink className="h-3.5 w-3.5 text-[#ccc] flex-shrink-0 ml-auto" />
          </a>
        )}
      </div>
    </div>
  )
}
