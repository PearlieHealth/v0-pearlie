import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAuth } from "@/lib/admin-auth"
import bcrypt from "bcryptjs"

// Admin API to manage clinic user associations
// Uses service role key to bypass RLS

export async function GET() {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response
  
  try {
    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .from("clinic_users")
      .select(`
        user_id,
        clinic_id,
        role,
        created_at,
        clinics(id, name)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching clinic_users:", error)
      throw error
    }

    // Get user emails from Supabase Auth
    let emailMap = new Map<string, string | undefined>()
    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
      if (!authError && authUsers) {
        emailMap = new Map(authUsers.users.map(u => [u.id, u.email]))
      }
    } catch (authErr) {
      console.error("Auth admin error:", authErr)
    }

    // Transform data to include email and clinic name
    const users = (data || []).map(cu => ({
      user_id: cu.user_id,
      clinic_id: cu.clinic_id,
      email: emailMap.get(cu.user_id) || null,
      role: cu.role,
      created_at: cu.created_at,
      clinic_name: (cu.clinics as { name: string } | null)?.name || null,
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error fetching clinic users:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch clinic users" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  const supabase = createAdminClient()
  
  try {
    const { email, password, clinicId, role = "clinic_manager" } = await request.json()

    if (!email || !password || !clinicId) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, clinicId" },
        { status: 400 }
      )
    }

    // First, check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users.find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    )

    if (existingUser) {
      // User exists - update their password and link to clinic
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password }
      )
      
      if (updateError) {
        console.error("Error updating user password:", updateError)
        return NextResponse.json(
          { error: "Failed to update user password" },
          { status: 500 }
        )
      }

      // Link existing user to clinic
      const { error: linkError } = await supabase
        .from("clinic_users")
        .upsert({
          user_id: existingUser.id,
          clinic_id: clinicId,
          role,
        }, {
          onConflict: "user_id,clinic_id"
        })

      if (linkError) throw linkError

      return NextResponse.json({
        success: true,
        message: "Existing user password updated and linked to clinic",
        userId: existingUser.id,
      })
    }

    // User doesn't exist - create new user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
    })

    if (authError) {
      throw authError
    }

    // Link new user to clinic
    const { error: linkError } = await supabase
      .from("clinic_users")
      .insert({
        user_id: authData.user.id,
        clinic_id: clinicId,
        role,
      })

    if (linkError) throw linkError

    return NextResponse.json({
      success: true,
      message: "User created and linked to clinic",
      userId: authData.user.id,
    })
  } catch (error) {
    console.error("Error creating clinic user:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create clinic user" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  const supabase = createAdminClient()
  
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    // Remove user from clinic (they can be re-added later)
    const { error } = await supabase
      .from("clinic_users")
      .delete()
      .eq("user_id", userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing clinic user:", error)
    return NextResponse.json(
      { error: "Failed to remove clinic user" },
      { status: 500 }
    )
  }
}
