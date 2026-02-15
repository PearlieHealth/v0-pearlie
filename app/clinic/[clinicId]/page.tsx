"use client"

import { Suspense } from "react"
import { ClinicProfileContent } from "@/components/clinic/profile/clinic-profile-content"

export default function ClinicDetailPage() {
  return (
    <Suspense fallback={<ClinicProfileSkeleton />}>
      <ClinicProfileContent />
    </Suspense>
  )
}

function ClinicProfileSkeleton() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a1a1a] mx-auto mb-4" />
        <p className="text-[#666]">Loading clinic details...</p>
      </div>
    </div>
  )
}
