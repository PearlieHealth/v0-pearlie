"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MapPin } from "lucide-react"

interface TreatmentPostcodeCtaProps {
  treatmentName: string
  intakeTreatment: string
}

export function TreatmentPostcodeCta({ treatmentName, intakeTreatment }: TreatmentPostcodeCtaProps) {
  const router = useRouter()
  const [postcode, setPostcode] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams({
      treatment: intakeTreatment,
      ...(postcode.trim() ? { postcode: postcode.trim().toUpperCase() } : {}),
    })
    router.push(`/intake?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <Input
            type="text"
            placeholder="Enter your postcode"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value.toUpperCase())}
            className="h-12 pl-11 text-base rounded-full bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-[#0fbcb0] focus-visible:border-[#0fbcb0]"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className="bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full px-6 h-12 text-base shrink-0"
        >
          Find my clinic
        </Button>
      </div>
    </form>
  )
}
