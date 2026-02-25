"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { clinicHref } from "@/lib/clinic-url"

export default function ClinicInboxRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace(clinicHref("/clinic/appointments"))
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}
