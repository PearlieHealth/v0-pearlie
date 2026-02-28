import { AdminNav } from "@/components/admin/admin-nav"
import { Upload } from "lucide-react"
import { BulkImportManager } from "@/components/admin/bulk-import-manager"

export const dynamic = "force-dynamic"

export default function BulkImportPage() {
  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5 text-[#004443]" />
            <h2 className="text-2xl font-bold">Bulk Add Clinics</h2>
          </div>
          <p className="text-muted-foreground">
            Automatically import top-reviewed London dental clinics from Google Places.
            Clinics are created as drafts for review before going live.
          </p>
        </div>

        <BulkImportManager />
      </main>
    </div>
  )
}
