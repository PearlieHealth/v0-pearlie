import { AdminNav } from "@/components/admin/admin-nav"
import { AffiliateManagement } from "@/components/admin/affiliate-management"
import { Users } from "lucide-react"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

export default function AdminAffiliatesPage() {
  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-[#004443]" />
            <h2 className="text-2xl font-bold">Affiliate Management</h2>
          </div>
          <p className="text-muted-foreground">
            Manage affiliate applications, set commission rates, and track performance.
          </p>
        </div>

        <AffiliateManagement />
      </main>
    </div>
  )
}
