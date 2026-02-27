import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { getClinicByIdOrSlug } from "@/lib/clinics/queries"
import { ClinicProfileContent } from "@/components/clinic/profile/clinic-profile-content"
import { ClinicJsonLd } from "@/components/clinic/profile/clinic-jsonld"
import type { Clinic } from "@/components/clinic/profile/types"

export const revalidate = 3600

interface ClinicPageProps {
  params: Promise<{ clinicId: string }>
}

export async function generateMetadata({ params }: ClinicPageProps): Promise<Metadata> {
  const { clinicId } = await params
  const clinic = await getClinicByIdOrSlug(clinicId)

  if (!clinic) {
    return { title: "Clinic Not Found | Pearlie" }
  }

  const title = `${clinic.name}${clinic.city ? ` — Dentist in ${clinic.city}` : ""} | Pearlie`
  const description =
    clinic.description?.slice(0, 160) ||
    `Book an appointment at ${clinic.name}${clinic.city ? ` in ${clinic.city}` : ""}. Compare prices, read reviews, and message the clinic directly on Pearlie.`

  const canonicalSlug = clinic.slug || clinic.id

  return {
    title,
    description,
    alternates: {
      canonical: `https://pearlie.org/clinic/${canonicalSlug}`,
    },
    openGraph: {
      title: clinic.name,
      description,
      url: `https://pearlie.org/clinic/${canonicalSlug}`,
      type: "website",
      images: clinic.images?.[0] ? [{ url: clinic.images[0] }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: clinic.name,
      description,
      images: clinic.images?.[0] ? [clinic.images[0]] : [],
    },
  }
}

export default async function ClinicDetailPage({ params }: ClinicPageProps) {
  const { clinicId } = await params
  const clinic = await getClinicByIdOrSlug(clinicId)

  if (!clinic) {
    notFound()
  }

  // Strip internal fields before passing to client
  const { is_live, is_archived, ...publicClinic } = clinic

  // Only include treatment_prices if the clinic has enabled it
  if (!publicClinic.show_treatment_prices) {
    publicClinic.treatment_prices = []
  }

  const typedClinic = publicClinic as unknown as Clinic

  return (
    <>
      <ClinicJsonLd clinic={typedClinic} />
      <Suspense fallback={<ClinicProfileSkeleton />}>
        <ClinicProfileContent initialClinic={typedClinic} />
      </Suspense>
    </>
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
