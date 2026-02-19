import { CheckCircle2, XCircle, AlertCircle, Code } from "lucide-react"
import { runDiagnostics } from "@/lib/analytics/diagnostics"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AdminNav } from "@/components/admin/admin-nav"

export default async function DiagnosticsPage() {
  const checks = await runDiagnostics()

  const passCount = checks.filter((c) => c.status === "pass").length
  const failCount = checks.filter((c) => c.status === "fail").length
  const warnCount = checks.filter((c) => c.status === "warning").length

  const overallStatus = failCount > 0 ? "fail" : warnCount > 0 ? "warning" : "pass"

  return (
    <div className="min-h-screen bg-[#faf6f0]">
      <AdminNav />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#004443] mb-2">Analytics Diagnostics</h1>
          <p className="text-muted-foreground">Automated checks to ensure data integrity and metric accuracy</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Overall Status</CardTitle>
                <CardDescription>Summary of all diagnostic checks</CardDescription>
              </div>
              {overallStatus === "pass" && <CheckCircle2 className="w-8 h-8 text-green-600" />}
              {overallStatus === "warning" && <AlertCircle className="w-8 h-8 text-yellow-600" />}
              {overallStatus === "fail" && <XCircle className="w-8 h-8 text-red-600" />}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div>
                <div className="text-3xl font-bold text-green-600">{passCount}</div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-yellow-600">{warnCount}</div>
                <div className="text-sm text-muted-foreground">Warnings</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-600">{failCount}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {checks.map((check) => (
            <Card key={check.id} className={check.status === "fail" ? "border-red-300" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg">{check.name}</CardTitle>
                      {check.status === "pass" && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Pass
                        </Badge>
                      )}
                      {check.status === "warning" && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Warning
                        </Badge>
                      )}
                      {check.status === "fail" && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <XCircle className="w-3 h-3 mr-1" />
                          Fail
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{check.message}</p>
                  </div>
                </div>
              </CardHeader>
              {(check.details || check.sql || check.sampleRows) && (
                <CardContent>
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
                      <Code className="w-4 h-4" />
                      View Details
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4 space-y-4">
                      {check.details && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Details</h4>
                          <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                            {JSON.stringify(check.details, null, 2)}
                          </pre>
                        </div>
                      )}
                      {check.sql && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">SQL Query</h4>
                          <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">{check.sql}</pre>
                        </div>
                      )}
                      {check.sampleRows && check.sampleRows.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Sample Rows ({check.sampleRows.length})</h4>
                          <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                            {JSON.stringify(check.sampleRows, null, 2)}
                          </pre>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
