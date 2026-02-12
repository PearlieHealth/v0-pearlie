import { createClient } from "@/lib/supabase/server"
import { createServerClient } from "@supabase/ssr"
import { headers } from "next/headers"

/**
 * Get the authenticated Supabase user from cookies or Authorization header.
 * Falls back to Bearer token when cookies don't propagate (e.g. client-side fetches).
 */
export async function getAuthUser() {
  // Try cookie-based auth first
  const supabase = await createClient()
  const { data: { user: cookieUser } } = await supabase.auth.getUser()
  if (cookieUser) return cookieUser

  // Fall back to Authorization header
  const headersList = await headers()
  const authHeader = headersList.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "")
    const supabaseWithToken = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } },
    )
    const { data: { user: tokenUser } } = await supabaseWithToken.auth.getUser(token)
    return tokenUser
  }

  return null
}
