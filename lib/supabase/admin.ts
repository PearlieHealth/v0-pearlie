import { createClient } from "@supabase/supabase-js"

// Admin client that bypasses RLS for admin operations
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    console.error("[v0] Missing Supabase admin credentials:", { url: !!url, key: !!key })
    throw new Error("Missing Supabase admin credentials")
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export const createServerClient = createAdminClient
