import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "25")
    const clinicId = searchParams.get("clinicId") || null
    const search = searchParams.get("search") || null
    const dateFrom = searchParams.get("dateFrom") || null
    const dateTo = searchParams.get("dateTo") || null

    // If search is provided, find matching lead IDs first
    let matchingLeadIds: string[] | null = null
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`
      const { data: matchingLeads } = await supabase
        .from("leads")
        .select("id")
        .or(
          `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm},contact_value.ilike.${searchTerm}`
        )

      matchingLeadIds = (matchingLeads || []).map((l) => l.id)

      // No matching leads means no conversations to show
      if (matchingLeadIds.length === 0) {
        return NextResponse.json({
          conversations: [],
          total: 0,
          page,
          pageSize,
        })
      }
    }

    // Build conversations query
    let query = supabase
      .from("conversations")
      .select(
        `
        id,
        clinic_id,
        lead_id,
        status,
        last_message_at,
        unread_count_clinic,
        unread_count_patient,
        created_at,
        clinics(id, name),
        leads(id, first_name, last_name, email, phone, contact_value, treatment_interest)
      `,
        { count: "exact" }
      )
      .order("last_message_at", { ascending: false, nullsFirst: false })

    // Apply filters
    if (clinicId) {
      query = query.eq("clinic_id", clinicId)
    }
    if (matchingLeadIds) {
      query = query.in("lead_id", matchingLeadIds)
    }
    if (dateFrom) {
      query = query.gte("last_message_at", dateFrom)
    }
    if (dateTo) {
      query = query.lte("last_message_at", dateTo + "T23:59:59.999Z")
    }

    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: conversations, error, count } = await query

    if (error) {
      console.error("[Admin Chat History] Error fetching conversations:", error)
      throw error
    }

    // Batch-fetch latest message preview for each conversation
    const convIds = (conversations || []).map((c) => c.id)
    let latestMessageMap: Record<string, { content: string; sender_type: string }> = {}

    if (convIds.length > 0) {
      const { data: allMessages } = await supabase
        .from("messages")
        .select("conversation_id, content, sender_type, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false })

      // Group by conversation_id, take first (latest) per conversation
      for (const msg of allMessages || []) {
        if (!latestMessageMap[msg.conversation_id]) {
          latestMessageMap[msg.conversation_id] = {
            content: msg.content,
            sender_type: msg.sender_type,
          }
        }
      }
    }

    // Attach latest message to each conversation
    const conversationsWithPreview = (conversations || []).map((conv) => ({
      ...conv,
      latest_message: latestMessageMap[conv.id]?.content || null,
      latest_message_sender: latestMessageMap[conv.id]?.sender_type || null,
    }))

    return NextResponse.json({
      conversations: conversationsWithPreview,
      total: count || 0,
      page,
      pageSize,
    })
  } catch (error) {
    console.error("[Admin Chat History] Unexpected error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch conversations" },
      { status: 500 }
    )
  }
}
