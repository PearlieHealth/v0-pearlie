"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Fragment, useState } from "react"
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, FlaskConical, Eye } from "lucide-react"

interface EmailLog {
  id: string
  email_type: string | null
  to_email: string
  subject: string
  status: string
  error: string | null
  provider_message_id: string | null
  html_body: string | null
  created_at: string
  clinics?: { name: string } | null
  leads?: { first_name: string; last_name: string; email: string } | null
}

interface EmailLogsTableProps {
  logs: EmailLog[]
  emailTypeLabels: Record<string, string>
}

export function EmailLogsTable({ logs, emailTypeLabels }: EmailLogsTableProps) {
  const [emailTypeFilter, setEmailTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [previewLog, setPreviewLog] = useState<EmailLog | null>(null)
  const pageSize = 50

  const uniqueEmailTypes = Array.from(
    new Set(logs.map((l) => l.email_type).filter(Boolean))
  ) as string[]

  const filteredLogs = logs.filter((log) => {
    const matchesType = emailTypeFilter === "all" || log.email_type === emailTypeFilter
    const matchesStatus = statusFilter === "all" || log.status === statusFilter
    return matchesType && matchesStatus
  })

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedLogs = filteredLogs.slice((safePage - 1) * pageSize, safePage * pageSize)

  const isSandbox = (log: EmailLog) => log.provider_message_id?.startsWith("sandbox-")

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Recent Email Activity</CardTitle>
          <CardDescription>Last 500 emails sent by the system</CardDescription>
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Select value={emailTypeFilter} onValueChange={(v) => { setEmailTypeFilter(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter by email type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Email Types</SelectItem>
                {uniqueEmailTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {emailTypeLabels[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Pagination header */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">
              {filteredLogs.length > 0
                ? `Showing ${(safePage - 1) * pageSize + 1}-${Math.min(safePage * pageSize, filteredLogs.length)} of ${filteredLogs.length} email${filteredLogs.length !== 1 ? "s" : ""}`
                : "No emails found"}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {safePage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Type</th>
                  <th className="text-left py-3 px-4 font-medium">Clinic</th>
                  <th className="text-left py-3 px-4 font-medium">To Email</th>
                  <th className="text-left py-3 px-4 font-medium">Subject</th>
                  <th className="text-left py-3 px-4 font-medium">Sent At</th>
                  <th className="text-left py-3 px-4 font-medium">Preview</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((log) => (
                  <Fragment key={log.id}>
                    <tr
                      className={`border-b hover:bg-muted/50 ${log.error ? "cursor-pointer" : ""}`}
                      onClick={() => log.error && setExpandedRow(expandedRow === log.id ? null : log.id)}
                    >
                      <td className="py-3 px-4">
                        {isSandbox(log) ? (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            <FlaskConical className="h-3 w-3 mr-1" />
                            Sandbox
                          </Badge>
                        ) : log.status === "sent" ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Sent
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <XCircle className="h-3 w-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {log.email_type ? (emailTypeLabels[log.email_type] || log.email_type) : "\u2014"}
                      </td>
                      <td className="py-3 px-4">{log.clinics?.name || "\u2014"}</td>
                      <td className="py-3 px-4 font-mono text-sm">{log.to_email}</td>
                      <td className="py-3 px-4 text-sm max-w-[250px] truncate">{log.subject}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("en-GB", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        {log.html_body && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setPreviewLog(log)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                    {expandedRow === log.id && log.error && (
                      <tr className="bg-red-50/50">
                        <td colSpan={7} className="py-3 px-4">
                          <div className="text-sm">
                            <span className="font-medium text-red-700">Error: </span>
                            <span className="text-red-600 font-mono text-xs">{log.error}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {paginatedLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No email logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Email Preview Dialog */}
      <Dialog open={!!previewLog} onOpenChange={(open) => !open && setPreviewLog(null)}>
        <DialogContent className="w-full max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-base font-medium truncate pr-8">
              {previewLog?.subject}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              To: {previewLog?.to_email}
              {previewLog?.email_type && ` \u00B7 ${emailTypeLabels[previewLog.email_type] || previewLog.email_type}`}
            </p>
          </DialogHeader>
          <div className="overflow-y-auto">
            {previewLog?.html_body && (
              <iframe
                srcDoc={previewLog.html_body}
                className="w-full h-[600px] border rounded bg-white"
                title={`Preview: ${previewLog.subject}`}
                sandbox="allow-same-origin"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
