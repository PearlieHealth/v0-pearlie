import { AdminNav } from "@/components/admin/admin-nav"
import { ChatHistoryPanel } from "@/components/admin/chat-history-panel"

export const dynamic = "force-dynamic"

export default function ChatHistoryPage() {
  return (
    <div className="min-h-screen bg-[#faf6f0]">
      <AdminNav />

      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Chat History</h1>
          <p className="text-muted-foreground">
            View all patient-clinic conversations across the platform
          </p>
        </div>
        <ChatHistoryPanel />
      </div>
    </div>
  )
}
