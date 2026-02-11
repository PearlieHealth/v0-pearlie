import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { Resend } from "resend"
import { verifyAdminAuth } from "@/lib/admin-auth"
import crypto from "crypto"
import bcrypt from "bcrypt"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(request: Request) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const body = await request.json()
    const { 
      clinicName, 
      primaryContactEmail, 
      corporateId, 
      corporateName,
      address,
      phone,
      website 
    } = body

    if (!clinicName || !primaryContactEmail) {
      return NextResponse.json(
        { error: "Clinic name and primary contact email are required" },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()
    
    // Generate a temporary password for the user
    const tempPassword = `Pearlie${crypto.randomUUID().slice(0, 8)}!`

    // Generate an invite token
    const inviteToken = `invite-${crypto.randomUUID().slice(0, 8)}`

    // 1. Create the clinic
    const { data: clinic, error: clinicError } = await supabaseAdmin
      .from("clinics")
      .insert({
        name: clinicName,
        address: address || null,
        phone: phone || null,
        website: website || null,
        corporate_id: corporateId || null,
        is_active: true,
      })
      .select()
      .single()

    if (clinicError) {
      // Log failed provisioning
      await supabaseAdmin.from("provisioning_logs").insert({
        clinic_name: clinicName,
        corporate_id: corporateId || null,
        corporate_name: corporateName || null,
        primary_contact_email: primaryContactEmail,
        status: "FAILED",
        error_message: clinicError.message,
      })

      throw clinicError
    }

    // 2. Create Supabase Auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: primaryContactEmail.toLowerCase(),
      password: tempPassword,
      email_confirm: true, // Auto-confirm since admin is inviting them
    })

    if (authError && !authError.message.includes("already registered")) {
      console.error("Auth user creation error:", authError)
      throw authError
    }

    // Get user ID (either from new user or existing)
    let userId = authUser?.user?.id
    
    if (!userId) {
      // User might already exist, try to find them
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      const existingUser = existingUsers?.users.find(
        u => u.email?.toLowerCase() === primaryContactEmail.toLowerCase()
      )
      userId = existingUser?.id
    }

    // 3. Create clinic_users row to link auth user to clinic
    if (userId) {
      const { error: clinicUserError } = await supabaseAdmin
        .from("clinic_users")
        .upsert({
          user_id: userId,
          clinic_id: clinic.id,
          role: "clinic_admin",
        }, {
          onConflict: "user_id,clinic_id"
        })

      if (clinicUserError) {
        console.error("Clinic user creation error:", clinicUserError)
        // Don't throw - clinic was created, user can be added later
      }
    }

    // 4. Log successful provisioning
    await supabaseAdmin.from("provisioning_logs").insert({
      clinic_id: clinic.id,
      clinic_name: clinicName,
      corporate_id: corporateId || null,
      corporate_name: corporateName || null,
      primary_contact_email: primaryContactEmail,
      status: "SUCCESS",
      invite_token: inviteToken,
    })

    // 5. Send login credentials email
    if (resend) {
      const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"}/clinic/login`
      
      await resend.emails.send({
        from: "Pearlie <noreply@pearlie.app>",
        to: primaryContactEmail,
        subject: `Your ${clinicName} Portal Login - Pearlie`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a1a;">Welcome to Pearlie</h1>
            <p>Your account has been created to manage <strong>${clinicName}</strong> on Pearlie's clinic portal.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Your Login Credentials:</strong></p>
              <p style="margin: 5px 0;">Email: <strong>${primaryContactEmail}</strong></p>
              <p style="margin: 5px 0;">Password: <strong>${tempPassword}</strong></p>
            </div>
            
            <a href="${loginUrl}" style="display: inline-block; background: #1a1a1a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Log In to Your Dashboard
            </a>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              For security, we recommend changing your password after your first login.
              You can do this in Settings > Security.
            </p>
          </div>
        `,
      })
    }

    return NextResponse.json({
      success: true,
      clinicId: clinic.id,
      tempPassword, // Return for admin reference
      message: "Clinic provisioned successfully",
    })
  } catch (error) {
    console.error("Provisioning error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to provision clinic" },
      { status: 500 }
    )
  }
}

// GET provisioning logs
export async function GET() {
  try {
    const supabaseAdmin = createAdminClient()

    const { data: logs, error } = await supabaseAdmin
      .from("provisioning_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) throw error

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("Error fetching provisioning logs:", error)
    return NextResponse.json(
      { error: "Failed to fetch provisioning logs" },
      { status: 500 }
    )
  }
}
