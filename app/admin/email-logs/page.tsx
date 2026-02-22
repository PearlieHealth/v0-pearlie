import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, Mail, FlaskConical, TrendingUp } from "lucide-react"
import { AdminNav } from "@/components/admin/admin-nav"
import { EMAIL_TYPE_LABELS } from "@/lib/email/registry"
import { EmailLogsTable } from "@/components/admin/email-logs-table"

export default async function EmailLogsPage() {
  const supabase = await createClient()

  const { data: logs } = await supabase
    .from("email_logs")
    .select(`
      *,
      clinics(name),
      leads(first_name, last_name, email)
    `)
    .order("created_at", { ascending: false })
    .limit(500)

  const totalEmails = logs?.length || 0
  const sentEmails = logs?.filter((log) => log.status === "sent").length || 0
  const failedEmails = logs?.filter((log) => log.status === "failed").length || 0
  const sandboxEmails = logs?.filter((log) =>
    log.provider_message_id?.startsWith("sandbox-")
  ).length || 0
  const successRate = totalEmails > 0 ? Math.round((sentEmails / totalEmails) * 100) : 0

  return (
    <div className="min-h-screen bg-[#faf6f0]">
      <AdminNav />

      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Email Logs</h1>
          <p className="text-muted-foreground">Track all emails sent by the system</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEmails}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sent</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{sentEmails}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{failedEmails}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sandbox</CardTitle>
              <FlaskConical className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{sandboxEmails}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{successRate}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Interactive table */}
        <EmailLogsTable
          logs={logs || []}
          emailTypeLabels={EMAIL_TYPE_LABELS}
        />
      </div>
    </div>
  )
}
