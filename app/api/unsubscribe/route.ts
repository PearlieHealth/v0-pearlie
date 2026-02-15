import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyToken } from "@/lib/unsubscribe"

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 })
  }

  // Process unsubscribe
  const supabase = createAdminClient()
  await supabase
    .from("email_preferences")
    .upsert(
      { email: decoded.email.toLowerCase(), category: decoded.category },
      { onConflict: "email,category" }
    )

  // Redirect to confirmation page
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"
  return NextResponse.redirect(`${baseUrl}/unsubscribe?success=true`)
}

export async function POST(request: NextRequest) {
  // RFC 8058 one-click unsubscribe
  const token = request.nextUrl.searchParams.get("token")

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 })
  }

  const supabase = createAdminClient()
  await supabase
    .from("email_preferences")
    .upsert(
      { email: decoded.email.toLowerCase(), category: decoded.category },
      { onConflict: "email,category" }
    )

  return NextResponse.json({ success: true })
}
