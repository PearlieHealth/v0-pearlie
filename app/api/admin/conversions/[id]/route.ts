import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { z } from "zod"

const updateSchema = z.object({
  status: z.enum(["pending_verification", "confirmed", "rejected", "paid"]),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const updates: Record<string, any> = {
      status: parsed.data.status,
    }

    if (parsed.data.status === "confirmed") {
      updates.confirmed_at = new Date().toISOString()
    }
    if (parsed.data.status === "paid") {
      updates.paid_at = new Date().toISOString()
    }

    const { data: conversion, error } = await supabase
      .from("referral_conversions")
      .update(updates)
      .eq("id", id)
      .select("*, affiliates:affiliate_id (id, total_earned)")
      .single()

    if (error) {
      console.error("[Admin] Error updating conversion:", error)
      return NextResponse.json({ error: "Failed to update conversion" }, { status: 500 })
    }

    // If confirmed, update the affiliate's total_earned
    if (parsed.data.status === "confirmed" && conversion.affiliates) {
      const affiliateData = conversion.affiliates as any
      await supabase
        .from("affiliates")
        .update({
          total_earned: (affiliateData.total_earned || 0) + (conversion.commission_amount || 0),
        })
        .eq("id", conversion.affiliate_id)
    }

    return NextResponse.json({ conversion })
  } catch (error) {
    console.error("[Admin] Error updating conversion:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
