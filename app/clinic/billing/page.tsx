"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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
  TrendingUp,
  Calendar,
} from "lucide-react"
import { toast } from "sonner"

interface Subscription {
  status: string
  plan_type: string
  plan_name: string
  base_price_pence: number
  included_bookings: number
  extra_booking_fee_pence: number
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  has_stripe_customer: boolean
  in_trial: boolean
  trial_ends_at: string | null
  trial_days_remaining: number
  trial_bookings_used: number
  trial_booking_cap: number
  free_leads_used: number
  free_leads_limit: number
}

interface Estimate {
  confirmed_bookings: number
  included_bookings: number
  overage_bookings: number
  base_amount_pence: number
  base_amount_formatted: string
  overage_amount_pence: number
  overage_amount_formatted: string
  total_pence: number
  total_formatted: string
  plan_base_formatted: string
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
  is_trial_booking: boolean
  stripe_payment_intent_id: string | null
  refund_status: string | null
  refund_amount: number | null
  created_at: string
}

interface BillingSummary {
  total_count: number
  billable_count: number
  trial_count: number
  disputed_count: number
  estimated_bill_formatted: string
  estimated_bill_pence: number
}

interface PaymentMethod {
  brand: string
  last4: string
  exp_month: number
  exp_year: number
}

interface MonthlyInvoice {
  id: string
  billing_period: string
  plan_type: string
  confirmed_bookings: number
  included_bookings: number
  overage_bookings: number
  base_amount: number
  overage_amount: number
  total_amount: number
  stripe_invoice_url: string | null
  stripe_invoice_pdf: string | null
  status: string
  created_at: string
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
  estimate: Estimate
  charges: BookingCharge[]
  summary: BillingSummary
  payment_method: PaymentMethod | null
  monthly_invoices: MonthlyInvoice[]
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
    trialing: { label: "Free Trial", className: "bg-blue-100 text-blue-700 border-blue-200" },
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

const PLAN_OPTIONS = [
  { value: "starter", label: "Starter", price: "£99/mo", included: 2 },
  { value: "standard", label: "Standard", price: "£247/mo", included: 4, recommended: true },
  { value: "premium", label: "Premium", price: "£486/mo", included: 8 },
]

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <BillingPageContent />
    </Suspense>
  )
}

function BillingPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [billing, setBilling] = useState<BillingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [clinicId, setClinicId] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showSetupSuccess, setShowSetupSuccess] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>("standard")

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

  // Detect ?setup=success from Stripe redirect
  useEffect(() => {
    if (searchParams.get("setup") === "success") {
      setShowSetupSuccess(true)
      router.replace("/clinic/billing", { scroll: false })
    }
  }, [searchParams, router])

  const fetchBilling = useCallback(async () => {
    const supabase = createBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setIsLoading(false)
      return
    }

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

  const handleSetupSubscription = async (planType?: string) => {
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
        body: JSON.stringify({ clinicId, planType: planType || selectedPlan }),
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
        toast.success("Attendance updated successfully.")
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
          Manage your plan, view your estimated monthly bill, and track bookings
        </p>
      </div>

      {/* Setup success banner */}
      {showSetupSuccess && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-4 pt-6">
            <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-green-800">Welcome! Your subscription is all set up</p>
              <p className="text-sm text-green-700">
                Your 30-day free trial has started. You can confirm up to 3 bookings during your trial at no cost. After that, billing is based on your plan tier.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowSetupSuccess(false)} className="text-green-700 hover:text-green-800 hover:bg-green-100">
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Trial banner */}
      {sub?.in_trial && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-center gap-4 pt-6">
            <Gift className="h-6 w-6 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-blue-800">
                Free trial — {sub.trial_days_remaining} day{sub.trial_days_remaining !== 1 ? "s" : ""} remaining
              </p>
              <p className="text-sm text-blue-700">
                Trial bookings used: {sub.trial_bookings_used} of {sub.trial_booking_cap}. No charges during your trial.
              </p>
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: sub.trial_booking_cap }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < sub.trial_bookings_used ? "bg-blue-500" : "bg-blue-200"
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No subscription — plan selection */}
      {!sub && (
        <Card className="border-[#0fbcb0]/30 bg-[#0fbcb0]/5">
          <CardHeader>
            <CardTitle>Choose your plan</CardTitle>
            <CardDescription>30-day free trial with up to 3 confirmed bookings. No card charged during trial.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              {PLAN_OPTIONS.map((plan) => (
                <button
                  key={plan.value}
                  onClick={() => setSelectedPlan(plan.value)}
                  className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                    selectedPlan === plan.value
                      ? "border-[#0fbcb0] bg-[#0fbcb0]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {plan.recommended && (
                    <span className="absolute -top-2.5 left-4 bg-[#0fbcb0] text-white text-xs font-medium px-2 py-0.5 rounded-full">
                      Best Value
                    </span>
                  )}
                  <p className="font-semibold text-lg">{plan.label}</p>
                  <p className="text-2xl font-bold mt-1">{plan.price}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.included} confirmed bookings included
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    then £35 per extra booking
                  </p>
                </button>
              ))}
            </div>
            <Button onClick={() => handleSetupSubscription()} disabled={isRedirecting} className="bg-[#0fbcb0] hover:bg-[#0da399] text-white">
              {isRedirecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Start Free Trial
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Incomplete subscription */}
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
            <Button onClick={() => handleSetupSubscription(sub.plan_type)} disabled={isRedirecting} className="bg-[#0fbcb0] hover:bg-[#0da399] text-white">
              {isRedirecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Complete Setup
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Past due */}
      {sub?.status === "past_due" && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-4 pt-6">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-red-800">Payment overdue</p>
              <p className="text-sm text-red-700">Your payment has failed. Please update your payment method.</p>
            </div>
            <Button variant="destructive" onClick={handleManagePayment} disabled={isRedirecting}>
              Update Payment
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payment">Payment Method</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="charges">Booking Charges</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="space-y-6">
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
                <p className="text-2xl font-bold">{sub?.plan_name || "None"}</p>
                {sub && <StatusBadge status={sub.status} />}
                {sub && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatAmount(sub.base_price_pence)}/mo &middot; {sub.included_bookings} bookings included
                  </p>
                )}
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
                <p className="text-2xl font-bold">{billing.summary.billable_count}</p>
                <p className="text-sm text-muted-foreground">
                  confirmed booking{billing.summary.billable_count !== 1 ? "s" : ""}
                  {sub && ` of ${sub.included_bookings} included`}
                </p>
                {billing.summary.trial_count > 0 && (
                  <p className="text-sm text-blue-600">+ {billing.summary.trial_count} trial (free)</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  Estimated Bill
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{billing.summary.estimated_bill_formatted}</p>
                {billing.estimate.overage_bookings > 0 && (
                  <p className="text-sm text-orange-600">
                    includes {billing.estimate.overage_bookings} extra at £35 each
                  </p>
                )}
                {sub?.in_trial && (
                  <p className="text-sm text-blue-600">No charge during trial</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Next Billing
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sub?.in_trial && sub.trial_ends_at ? (
                  <>
                    <p className="text-2xl font-bold">{sub.trial_days_remaining} days</p>
                    <p className="text-sm text-muted-foreground">Trial ends {formatDate(sub.trial_ends_at)}</p>
                  </>
                ) : sub?.current_period_end ? (
                  <>
                    <p className="text-2xl font-bold">{formatDate(sub.current_period_end)}</p>
                    <p className="text-sm text-muted-foreground">
                      {getDaysRemaining(sub.current_period_end)} days away
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No active subscription</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Billing breakdown */}
          {sub && !sub.in_trial && billing.estimate.confirmed_bookings > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Month Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {Math.min(billing.estimate.confirmed_bookings, sub.included_bookings)} of {sub.included_bookings} included bookings
                    </span>
                    <span className="font-medium">{billing.estimate.base_amount_formatted}</span>
                  </div>
                  {billing.estimate.overage_bookings > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {billing.estimate.overage_bookings} extra booking{billing.estimate.overage_bookings !== 1 ? "s" : ""} x £35
                      </span>
                      <span className="font-medium">{billing.estimate.overage_amount_formatted}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t font-semibold">
                    <span>Estimated total</span>
                    <span>{billing.estimate.total_formatted}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          {sub && sub.status !== "incomplete" && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={handleManagePayment} disabled={isRedirecting}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manage Subscription
                </Button>
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
                      {sub ? "Your card will be collected at end of trial." : "Set up a subscription to add a payment method."}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Invoices Tab ── */}
        <TabsContent value="invoices" className="space-y-6">
          {/* Monthly invoices */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Monthly Invoices
              </CardTitle>
              <CardDescription>
                Your monthly billing summaries based on confirmed bookings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {billing.monthly_invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Bookings</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billing.monthly_invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.billing_period}</TableCell>
                        <TableCell className="capitalize">{inv.plan_type}</TableCell>
                        <TableCell>
                          {inv.confirmed_bookings}
                          {inv.overage_bookings > 0 && (
                            <span className="text-orange-600 text-xs ml-1">(+{inv.overage_bookings} extra)</span>
                          )}
                        </TableCell>
                        <TableCell>{formatAmount(inv.total_amount)}</TableCell>
                        <TableCell>
                          <Badge className={
                            inv.status === "paid" ? "bg-green-100 text-green-700 border-green-200" :
                            inv.status === "sent" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                            inv.status === "void" ? "bg-gray-100 text-gray-500 border-gray-200" :
                            "bg-red-100 text-red-700 border-red-200"
                          }>
                            {inv.status === "void" ? "No charge" : inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {inv.stripe_invoice_url && (
                            <Button variant="ghost" size="sm" onClick={() => window.open(inv.stripe_invoice_url!, "_blank")}>
                              <ExternalLink className="h-4 w-4 mr-1" /> View
                            </Button>
                          )}
                          {inv.stripe_invoice_pdf && (
                            <Button variant="ghost" size="sm" onClick={() => window.open(inv.stripe_invoice_pdf!, "_blank")}>
                              <Download className="h-4 w-4 mr-1" /> PDF
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No invoices yet</p>
                  <p className="text-sm">Your first invoice will be generated at the end of the billing period.</p>
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
                    Confirmed patient bookings this month. You have 7 days to dispute each charge.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const filtered = getFilteredCharges()
                    const csvRows = [
                      ["Date", "Patient", "Treatment", "Type", "Status", "Dispute Window"].join(","),
                      ...filtered.map(c =>
                        [
                          formatDate(c.created_at),
                          `"${(c.patient_name || "Unknown").replace(/"/g, '""')}"`,
                          `"${(c.treatment || "—").replace(/"/g, '""')}"`,
                          c.is_trial_booking ? "Trial (free)" : "Billable",
                          c.attendance_status,
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
                  <Input type="date" value={chargesDateFrom} onChange={e => { setChargesDateFrom(e.target.value); setChargesPage(0) }} className="w-[150px] h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input type="date" value={chargesDateTo} onChange={e => { setChargesDateTo(e.target.value); setChargesPage(0) }} className="w-[150px] h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={chargesStatusFilter} onValueChange={v => { setChargesStatusFilter(v); setChargesPage(0) }}>
                    <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue /></SelectTrigger>
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
                  <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setChargesDateFrom(""); setChargesDateTo(""); setChargesStatusFilter("all"); setChargesPage(0) }}>
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
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Dispute Window</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paged.map((charge) => {
                          const daysLeft = getDaysRemaining(charge.dispute_window_ends_at)
                          const canDispute = !charge.is_finalised && daysLeft > 0 && charge.attendance_status === "auto_confirmed"

                          return (
                            <TableRow key={charge.id}>
                              <TableCell className="font-medium">{charge.patient_name || "Unknown Patient"}</TableCell>
                              <TableCell>{charge.treatment || "—"}</TableCell>
                              <TableCell>{formatDate(charge.created_at)}</TableCell>
                              <TableCell>
                                {charge.is_trial_booking ? (
                                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">Trial</Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-700 border-gray-200">Billable</Badge>
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
                                    {daysLeft === 1 ? "Last day" : `${daysLeft} days left`}
                                  </span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {canDispute ? (
                                  <Button variant="outline" size="sm" onClick={() => { setDisputeCharge(charge); setDisputeStatus("not_attended"); setExemptionReason(""); setExemptionDetails("") }}>
                                    Dispute
                                  </Button>
                                ) : null}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-sm text-muted-foreground">
                          Showing {chargesPage * CHARGES_PER_PAGE + 1}–{Math.min((chargesPage + 1) * CHARGES_PER_PAGE, filtered.length)} of {filtered.length}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" disabled={chargesPage === 0} onClick={() => setChargesPage(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-muted-foreground">Page {chargesPage + 1} of {totalPages}</span>
                          <Button variant="outline" size="sm" disabled={chargesPage >= totalPages - 1} onClick={() => setChargesPage(p => p + 1)}>
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
                  <p>Your plan includes a set number of confirmed bookings each month. You only pay for what you use — 0 bookings = £0.</p>
                  <p>Extra confirmed bookings beyond your plan are charged at <strong>£35 each</strong>.</p>
                  <p>You have <strong>7 days</strong> from each booking to report if a patient did not attend or is exempt (NHS, under 18, cancellation, duplicate, etc.).</p>
                  <p>After the 7-day window closes, the booking is automatically finalised and counts toward your monthly bill.</p>
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
            <DialogTitle>Dispute Booking</DialogTitle>
            <DialogDescription>
              {disputeCharge && (
                <>Report that {disputeCharge.patient_name || "the patient"} did not attend or is exempt.</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={disputeStatus} onValueChange={setDisputeStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
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
              <Textarea placeholder="Provide any additional context..." value={exemptionDetails} onChange={(e) => setExemptionDetails(e.target.value)} rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeCharge(null)} disabled={isDisputing}>Cancel</Button>
            <Button onClick={handleDispute} disabled={isDisputing || (disputeStatus === "exempt" && !exemptionReason)}>
              {isDisputing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isDisputing ? "Submitting..." : "Submit Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
