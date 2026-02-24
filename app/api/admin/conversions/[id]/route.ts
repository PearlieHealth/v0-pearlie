import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !["confirmed", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const updates: Record<string, unknown> = { status }
    if (status === "confirmed") {
      updates.confirmed_at = new Date().toISOString()
    }

    const { data: conversion, error } = await supabase
      .from("referral_conversions")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ error: "Failed to update conversion" }, { status: 500 })
    }

    // If confirmed, update affiliate's total_earned
    if (status === "confirmed" && conversion) {
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("total_earned")
        .eq("id", conversion.affiliate_id)
        .single()

      if (affiliate) {
        await supabase
          .from("affiliates")
          .update({ total_earned: (affiliate.total_earned || 0) + (conversion.commission_amount || 0) })
          .eq("id", conversion.affiliate_id)
      }
    }

    return NextResponse.json(conversion)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
