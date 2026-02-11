"use client"

import { useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"

/**
 * Redirect from legacy /clinics/[id] to canonical /clinic/[id].
 * Preserves all query parameters (matchId, leadId, etc.).
 */
export default function ClinicRedirectPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const clinicId = params?.clinicId as string
    if (!clinicId) return

    const queryString = searchParams?.toString()
    const target = `/clinic/${clinicId}${queryString ? `?${queryString}` : ""}`
    router.replace(target)
  }, [params, searchParams, router])

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a1a1a] mx-auto mb-4" />
        <p className="text-[#666]">Loading clinic details...</p>
      </div>
    </div>
  )
}
