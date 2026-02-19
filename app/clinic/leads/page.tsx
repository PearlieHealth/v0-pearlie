"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { clinicHref } from "@/lib/clinic-url"

export default function LeadsRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace(clinicHref("/clinic/appointments"))
  }, [router])
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">Redirecting to appointments...</p>
    </div>
  )
}
