import { createClient } from "@/lib/supabase/server"
import { Building2 } from "lucide-react"
import { ClinicDirectoryManager } from "@/components/admin/clinic-directory-manager"
import { AdminNav } from "@/components/admin/admin-nav"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

export default async function ClinicDirectoryPage() {
  const supabase = await createClient()

  const { data: clinics } = await supabase.from("clinics").select("*").order("name", { ascending: true })

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-[#1a2332]" />
            <h2 className="text-2xl font-bold">Clinic Directory Manager</h2>
          </div>
          <p className="text-muted-foreground">
            Manage clinics, upload photos, and control which clinics appear in patient matches.
          </p>
        </div>

        <ClinicDirectoryManager clinics={clinics || []} />
      </main>
    </div>
  )
}
