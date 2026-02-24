"use client"

import { useEffect, useState, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  CreditCard,
  Receipt,
  Calendar,
  Users,
  Banknote,
  ExternalLink,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Shield,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Filter,
  Gift,
} from "lucide-react"
import { toast } from "sonner"

interface Subscription {
  status: string
  plan_type: string
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  has_stripe_customer: boolean
  free_leads_used: number
  free_leads_limit: number
}

interface BookingCharge {
  id: string
  booking_id: string | null
  lead_id: string | null
  patient_name: string | null
  treatment: string | null
  amount: number
  currency: string
  attendance_status: string
  exemption_reason: string | null
  charge_created_at: string
  dispute_window_ends_at: string
  is_finalised: boolean
  stripe_payment_intent_id: string | null
  refund_status: string | null
  refund_amount: number | null
  created_at: string
}

interface BillingSummary {
  total_charges_formatted: string
  total_charges_pence: number
  total_refunds_formatted: string
  total_refunds_pence: number
  net_charges_formatted: string
  net_charges_pence: number
  confirmed_count: number
  disputed_count: number
  total_count: number
}

interface PaymentMethod {
  brand: string
  last4: string
  exp_month: number
  exp_year: number
}

interface Invoice {
  id: string
  number: string | null
  amount_due: number
  amount_paid: number
  status: string | null
  created: number
  hosted_invoice_url: string | null
  invoice_pdf: string | null
}

interface BillingData {
  clinic_id: string
  subscription: Subscription | null
  charges: BookingCharge[]
  summary: BillingSummary
  payment_method: PaymentMethod | null
  invoices: Invoice[]
}

function formatAmount(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}

function formatDate(dateStr: string | number): string {
  const d = typeof dateStr === "number" ? new Date(dateStr * 1000) : new Date(dateStr)
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-green-100 text-green-700 border-green-200" },
    trialing: { label: "Trial", className: "bg-blue-100 text-blue-700 border-blue-200" },
    past_due: { label: "Past Due", className: "bg-red-100 text-red-700 border-red-200" },
    cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-700 border-gray-200" },
    incomplete: { label: "Incomplete", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  }
  const c = config[status] || { label: status, className: "bg-gray-100 text-gray-700 border-gray-200" }
  return <Badge className={c.className}>{c.label}</Badge>
}

function AttendanceBadge({ status, isFinalised }: { status: string; isFinalised: boolean }) {
  if (isFinalised && status === "confirmed") {
    return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Finalised</Badge>
  }
  const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    auto_confirmed: { label: "Pending", className: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <Clock className="w-3 h-3 mr-1" /> },
    confirmed: { label: "Confirmed", className: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle2 className="w-3 h-3 mr-1" /> },
    not_attended: { label: "Not Attended", className: "bg-red-100 text-red-700 border-red-200", icon: <XCircle className="w-3 h-3 mr-1" /> },
    exempt: { label: "Exempt", className: "bg-blue-100 text-blue-700 border-blue-200", icon: <Shield className="w-3 h-3 mr-1" /> },
    disputed: { label: "Disputed", className: "bg-orange-100 text-orange-700 border-orange-200", icon: <AlertCircle className="w-3 h-3 mr-1" /> },
  }
  const c = config[status] || { label: status, className: "bg-gray-100 text-gray-700", icon: null }
  return <Badge className={c.className}>{c.icon}{c.label}</Badge>
}

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [clinicId, setClinicId] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Dispute dialog state
  const [disputeCharge, setDisputeCharge] = useState<BookingCharge | null>(null)
  const [disputeStatus, setDisputeStatus] = useState<string>("not_attended")
  const [exemptionReason, setExemptionReason] = useState<string>("")
  const [exemptionDetails, setExemptionDetails] = useState<string>("")
  const [isDisputing, setIsDisputing] = useState(false)

  // Charges filter & pagination state
  const [chargesDateFrom, setChargesDateFrom] = useState<string>("")
  const [chargesDateTo, setChargesDateTo] = useState<string>("")
  const [chargesStatusFilter, setChargesStatusFilter] = useState<string>("all")
  const [chargesPage, setChargesPage] = useState(0)
  const CHARGES_PER_PAGE = 10

  const fetchBilling = useCallback(async () => {
    const supabase = createBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setIsLoading(false)
      return
    }

    // Get clinic ID
    const meRes = await fetch("/api/clinic/me", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!meRes.ok) {
      setIsLoading(false)
      return
    }
    const meData = await meRes.json()
    const cId = meData.clinic?.id
    if (!cId) {
      setIsLoading(false)
      return
    }
    setClinicId(cId)

    // Fetch billing data
    const billingRes = await fetch("/api/clinic/billing", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (billingRes.ok) {
      const data = await billingRes.json()
      setBilling(data)
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchBilling()
  }, [fetchBilling])

  const handleSetupSubscription = async () => {
    if (!clinicId) return
    setIsRedirecting(true)
    try {
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ clinicId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || "Failed to create checkout session")
        setIsRedirecting(false)
      }
    } catch {
      toast.error("Failed to start subscription setup")
      setIsRedirecting(false)
    }
  }

  const handleManagePayment = async () => {
    if (!clinicId) return
    setIsRedirecting(true)
    try {
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ clinicId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || "Failed to open billing portal")
        setIsRedirecting(false)
      }
    } catch {
      toast.error("Failed to open billing portal")
      setIsRedirecting(false)
    }
  }

  const handleDispute = async () => {
    if (!disputeCharge) return
    setIsDisputing(true)
    try {
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/bookings/update-attendance", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          bookingChargeId: disputeCharge.id,
          status: disputeStatus,
          exemptionReason: disputeStatus === "exempt" ? exemptionReason : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(
          data.refunded
            ? "Attendance updated. Refund has been issued."
            : "Attendance updated successfully."
        )
        setDisputeCharge(null)
        setDisputeStatus("not_attended")
        setExemptionReason("")
        setExemptionDetails("")
        await fetchBilling()
      } else {
        toast.error(data.error || "Failed to update attendance")
      }
    } catch {
      toast.error("Failed to update attendance")
    }
    setIsDisputing(false)
  }

  // Filtered charges for the booking charges tab
  const getFilteredCharges = useCallback(() => {
    if (!billing) return []
    let filtered = billing.charges
    if (chargesDateFrom) {
      const from = new Date(chargesDateFrom)
      filtered = filtered.filter(c => new Date(c.created_at) >= from)
    }
    if (chargesDateTo) {
      const to = new Date(chargesDateTo)
      to.setHours(23, 59, 59, 999)
      filtered = filtered.filter(c => new Date(c.created_at) <= to)
    }
    if (chargesStatusFilter !== "all") {
      filtered = filtered.filter(c => c.attendance_status === chargesStatusFilter)
    }
    return filtered
  }, [billing, chargesDateFrom, chargesDateTo, chargesStatusFilter])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!billing) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Unable to load billing data.</p>
      </div>
    )
  }

  const sub = billing.subscription

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription, payment method, and booking charges
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payment">Payment Method</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="charges">Booking Charges</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Subscription status alert */}
          {!sub && (
            <Card className="border-[#0fbcb0]/30 bg-[#0fbcb0]/5">
              <CardContent className="flex items-center gap-4 pt-6">
                <Gift className="h-6 w-6 text-[#0fbcb0] flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-[#004443]">Welcome! Your first 3 leads are free</p>
                  <p className="text-sm text-muted-foreground">
                    Start receiving patient matches right away — no subscription needed for your first 3 leads.
                    When you&apos;re ready, set up a subscription to keep receiving leads.
                  </p>
                </div>
                <Button onClick={handleSetupSubscription} disabled={isRedirecting} className="bg-[#0fbcb0] hover:bg-[#0da399] text-white">
                  {isRedirecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Set Up Subscription
                </Button>
              </CardContent>
            </Card>
          )}

          {sub && !sub.has_stripe_customer && sub.free_leads_used >= sub.free_leads_limit && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="flex items-center gap-4 pt-6">
                <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-800">Free leads used up</p>
                  <p className="text-sm text-yellow-700">
                    You&apos;ve used all {sub.free_leads_limit} free leads. Set up a subscription to continue receiving patient matches.
                  </p>
                </div>
                <Button onClick={handleSetupSubscription} disabled={isRedirecting}>
                  {isRedirecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Set Up Subscription
                </Button>
              </CardContent>
            </Card>
          )}

          {sub?.status === "incomplete" && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="flex items-center gap-4 pt-6">
                <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-800">Subscription setup incomplete</p>
                  <p className="text-sm text-yellow-700">
                    It looks like you didn&apos;t finish setting up your subscription. Click below to complete the process.
                  </p>
                </div>
                <Button onClick={handleSetupSubscription} disabled={isRedirecting} className="bg-[#0fbcb0] hover:bg-[#0da399] text-white">
                  {isRedirecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Complete Setup
                </Button>
              </CardContent>
            </Card>
          )}

          {sub?.status === "past_due" && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex items-center gap-4 pt-6">
                <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-red-800">Payment overdue</p>
                  <p className="text-sm text-red-700">Your subscription payment has failed. Please update your payment method to continue receiving patient matches.</p>
                </div>
                <Button variant="destructive" onClick={handleManagePayment} disabled={isRedirecting}>
                  Update Payment
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Free leads & trial banners */}
          {sub && sub.free_leads_used < sub.free_leads_limit && (
            <Card className="border-[#0fbcb0]/30 bg-[#0fbcb0]/5">
              <CardContent className="flex items-center gap-4 pt-6">
                <Gift className="h-6 w-6 text-[#0fbcb0] flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-[#004443]">
                    Free leads: {sub.free_leads_used} of {sub.free_leads_limit} used
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your first {sub.free_leads_limit} patient leads are completely free — no booking fee charged.
                    {sub.free_leads_limit - sub.free_leads_used === 1
                      ? " You have 1 free lead remaining."
                      : ` You have ${sub.free_leads_limit - sub.free_leads_used} free leads remaining.`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: sub.free_leads_limit }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < sub.free_leads_used ? "bg-[#0fbcb0]" : "bg-[#0fbcb0]/20"
                      }`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4" />
                  Current Plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold capitalize">{sub?.plan_type || "None"}</p>
                {sub && <StatusBadge status={sub.status} />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <Gift className="h-4 w-4" />
                  Free Leads
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {sub ? `${sub.free_leads_limit - sub.free_leads_used}` : "3"} <span className="text-base font-normal text-muted-foreground">remaining</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {sub ? `${sub.free_leads_used} of ${sub.free_leads_limit} used` : "0 of 3 used"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  This Month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{billing.summary.total_count}</p>
                <p className="text-sm text-muted-foreground">
                  {billing.summary.confirmed_count} confirmed, {billing.summary.disputed_count} disputed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <Banknote className="h-4 w-4" />
                  Net Charges
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{billing.summary.net_charges_formatted}</p>
                {billing.summary.total_refunds_pence > 0 && (
                  <p className="text-sm text-green-600">
                    {billing.summary.total_refunds_formatted} refunded
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick actions */}
          {sub && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                {sub.status === "incomplete" ? (
                  <Button onClick={handleSetupSubscription} disabled={isRedirecting} className="bg-[#0fbcb0] hover:bg-[#0da399] text-white">
                    {isRedirecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    <CreditCard className="h-4 w-4 mr-2" />
                    Set Up Subscription
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleManagePayment} disabled={isRedirecting}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Subscription
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Payment Method Tab ── */}
        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
              <CardDescription>
                Your payment method is managed securely through Stripe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {billing.payment_method ? (
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium capitalize">
                        {billing.payment_method.brand} ending in {billing.payment_method.last4}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Expires {billing.payment_method.exp_month}/{billing.payment_method.exp_year}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleManagePayment} disabled={isRedirecting}>
                    {isRedirecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Update
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4 rounded-lg border border-yellow-200 bg-yellow-50">
                  <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-800">No payment method on file</p>
                    <p className="text-sm text-yellow-700">
                      {sub ? "Add a payment method to keep your subscription active." : "Set up a subscription to add a payment method."}
                    </p>
                  </div>
                  {sub ? (
                    <Button onClick={handleManagePayment} disabled={isRedirecting}>
                      Add Payment Method
                    </Button>
                  ) : (
                    <Button onClick={handleSetupSubscription} disabled={isRedirecting}>
                      Set Up Subscription
                    </Button>
                  )}
                </div>
              )}

              <div className="rounded-lg border p-4 bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  Payment details are handled securely by Stripe. Pearlie never stores your card information.
                  Clicking &ldquo;Update&rdquo; will redirect you to Stripe&apos;s secure portal.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Invoices Tab ── */}
        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Invoice History
              </CardTitle>
              <CardDescription>
                View and download your past invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {billing.invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billing.invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">
                          {inv.number || inv.id.slice(0, 12)}
                        </TableCell>
                        <TableCell>{formatDate(inv.created)}</TableCell>
                        <TableCell>{formatAmount(inv.amount_due)}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              inv.status === "paid"
                                ? "bg-green-100 text-green-700 border-green-200"
                                : inv.status === "open"
                                  ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                                  : "bg-gray-100 text-gray-700 border-gray-200"
                            }
                          >
                            {inv.status === "paid" ? "Paid" : inv.status === "open" ? "Open" : inv.status || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {inv.hosted_invoice_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(inv.hosted_invoice_url!, "_blank")}
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            )}
                            {inv.invoice_pdf && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(inv.invoice_pdf!, "_blank")}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                PDF
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No invoices yet</p>
                  <p className="text-sm">Invoices will appear here after your first billing cycle.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Booking Charges Tab ── */}
        <TabsContent value="charges" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="h-5 w-5" />
                    Booking Charges
                  </CardTitle>
                  <CardDescription>
                    Per-appointment charges for confirmed patient bookings. You have 7 days to dispute each charge.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // CSV export of filtered charges
                    const filtered = getFilteredCharges()
                    const csvRows = [
                      ["Date", "Patient", "Treatment", "Amount", "Status", "Refund Status", "Dispute Window"].join(","),
                      ...filtered.map(c =>
                        [
                          formatDate(c.created_at),
                          `"${(c.patient_name || "Unknown").replace(/"/g, '""')}"`,
                          `"${(c.treatment || "—").replace(/"/g, '""')}"`,
                          formatAmount(c.amount),
                          c.attendance_status,
                          c.refund_status || "none",
                          c.is_finalised ? "Closed" : `${getDaysRemaining(c.dispute_window_ends_at)} days left`,
                        ].join(",")
                      ),
                    ]
                    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `pearlie-charges-${new Date().toISOString().slice(0, 10)}.csv`
                    a.click()
                    URL.revokeObjectURL(url)
                    toast.success("CSV exported")
                  }}
                >
                  <FileDown className="h-4 w-4 mr-1.5" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-end gap-3 pb-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Filter className="h-3 w-3" />From</Label>
                  <Input
                    type="date"
                    value={chargesDateFrom}
                    onChange={e => { setChargesDateFrom(e.target.value); setChargesPage(0) }}
                    className="w-[150px] h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input
                    type="date"
                    value={chargesDateTo}
                    onChange={e => { setChargesDateTo(e.target.value); setChargesPage(0) }}
                    className="w-[150px] h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={chargesStatusFilter} onValueChange={v => { setChargesStatusFilter(v); setChargesPage(0) }}>
                    <SelectTrigger className="w-[160px] h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="auto_confirmed">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="not_attended">Not Attended</SelectItem>
                      <SelectItem value="exempt">Exempt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(chargesDateFrom || chargesDateTo || chargesStatusFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => { setChargesDateFrom(""); setChargesDateTo(""); setChargesStatusFilter("all"); setChargesPage(0) }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>

              {(() => {
                const filtered = getFilteredCharges()
                const totalPages = Math.ceil(filtered.length / CHARGES_PER_PAGE)
                const paged = filtered.slice(chargesPage * CHARGES_PER_PAGE, (chargesPage + 1) * CHARGES_PER_PAGE)

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <Banknote className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No booking charges found</p>
                      <p className="text-sm">
                        {billing.charges.length > 0 ? "Try adjusting your filters." : "Charges appear here when patients attend their appointments."}
                      </p>
                    </div>
                  )
                }

                return (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Patient</TableHead>
                          <TableHead>Treatment</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Dispute Window</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paged.map((charge) => {
                          const daysLeft = getDaysRemaining(charge.dispute_window_ends_at)
                          const canDispute = !charge.is_finalised &&
                            daysLeft > 0 &&
                            charge.attendance_status === "auto_confirmed"

                          return (
                            <TableRow key={charge.id}>
                              <TableCell className="font-medium">
                                {charge.patient_name || "Unknown Patient"}
                              </TableCell>
                              <TableCell>{charge.treatment || "—"}</TableCell>
                              <TableCell>{formatDate(charge.created_at)}</TableCell>
                              <TableCell>
                                {charge.refund_status === "refunded" ? (
                                  <span className="line-through text-muted-foreground">
                                    {formatAmount(charge.amount)}
                                  </span>
                                ) : (
                                  formatAmount(charge.amount)
                                )}
                              </TableCell>
                              <TableCell>
                                <AttendanceBadge status={charge.attendance_status} isFinalised={charge.is_finalised} />
                              </TableCell>
                              <TableCell>
                                {charge.is_finalised ? (
                                  <span className="text-sm text-muted-foreground">Closed</span>
                                ) : daysLeft > 0 && charge.attendance_status === "auto_confirmed" ? (
                                  <span className={`text-sm font-medium ${daysLeft <= 2 ? "text-red-600" : "text-orange-600"}`}>
                                    {daysLeft === 1 ? "Last day to dispute" : `${daysLeft} days remaining`}
                                  </span>
                                ) : charge.attendance_status === "auto_confirmed" ? (
                                  <span className="text-sm text-muted-foreground">Expired</span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {canDispute ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setDisputeCharge(charge)
                                      setDisputeStatus("not_attended")
                                      setExemptionReason("")
                                      setExemptionDetails("")
                                    }}
                                  >
                                    Dispute
                                  </Button>
                                ) : charge.refund_status === "refunded" ? (
                                  <Badge className="bg-green-100 text-green-700 border-green-200">
                                    Refunded
                                  </Badge>
                                ) : charge.attendance_status === "auto_confirmed" && !charge.is_finalised ? (
                                  <span className="text-xs text-muted-foreground">Window expired</span>
                                ) : charge.is_finalised && charge.attendance_status === "confirmed" ? (
                                  <Button variant="outline" size="sm" disabled title="Dispute window closed — contact support">
                                    Dispute
                                  </Button>
                                ) : null}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-sm text-muted-foreground">
                          Showing {chargesPage * CHARGES_PER_PAGE + 1}–{Math.min((chargesPage + 1) * CHARGES_PER_PAGE, filtered.length)} of {filtered.length}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={chargesPage === 0}
                            onClick={() => setChargesPage(p => p - 1)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page {chargesPage + 1} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={chargesPage >= totalPages - 1}
                            onClick={() => setChargesPage(p => p + 1)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </CardContent>
          </Card>

          {/* Billing policy note */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Billing Policy</p>
                  <p>Your first <strong>3 patient leads are free</strong> — no booking fee charged. After that, each confirmed patient appointment incurs a £75 booking fee.</p>
                  <p>You have <strong>7 days</strong> from each charge date to report if a patient did not attend or is exempt (NHS, under 18, cancellation, duplicate, etc.).</p>
                  <p>After the 7-day window closes, the charge is automatically finalised. If you need help with a finalised charge, contact <a href="mailto:billing@pearlie.org" className="text-primary hover:underline">billing@pearlie.org</a>.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dispute Dialog */}
      <Dialog open={!!disputeCharge} onOpenChange={(open) => { if (!open) setDisputeCharge(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispute Booking Charge</DialogTitle>
            <DialogDescription>
              {disputeCharge && (
                <>Report that {disputeCharge.patient_name || "the patient"} did not attend or is exempt from the {formatAmount(disputeCharge.amount)} charge.</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={disputeStatus} onValueChange={setDisputeStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_attended">Patient did not attend</SelectItem>
                  <SelectItem value="exempt">Patient is exempt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {disputeStatus === "exempt" && (
              <div className="space-y-2">
                <Label>Exemption Reason</Label>
                <Select value={exemptionReason} onValueChange={setExemptionReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nhs">NHS Patient</SelectItem>
                    <SelectItem value="under_18">Under 18</SelectItem>
                    <SelectItem value="cancellation">Patient Cancelled</SelectItem>
                    <SelectItem value="duplicate">Duplicate Booking</SelectItem>
                    <SelectItem value="existing_patient">Existing Patient</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Additional Details (optional)</Label>
              <Textarea
                placeholder="Provide any additional context..."
                value={exemptionDetails}
                onChange={(e) => setExemptionDetails(e.target.value)}
                rows={3}
              />
            </div>

            {disputeCharge?.stripe_payment_intent_id && (
              <div className="rounded-lg border p-3 bg-green-50">
                <p className="text-sm text-green-700">
                  <CheckCircle2 className="inline h-4 w-4 mr-1" />
                  A refund of {disputeCharge ? formatAmount(disputeCharge.amount) : ""} will be issued to your card. Refunds typically take 5-10 business days.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeCharge(null)} disabled={isDisputing}>
              Cancel
            </Button>
            <Button
              onClick={handleDispute}
              disabled={isDisputing || (disputeStatus === "exempt" && !exemptionReason)}
            >
              {isDisputing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isDisputing ? "Submitting..." : "Submit Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
