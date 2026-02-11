export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { Resend } from "resend"

export async function GET() {
  try {
    console.log("[email-test] Environment check", {
      hasResendKey: !!process.env.RESEND_API_KEY,
      emailFrom: process.env.EMAIL_FROM,
    })

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          error: "RESEND_API_KEY not configured",
        },
        { status: 500 },
      )
    }

    if (!process.env.EMAIL_FROM) {
      return NextResponse.json(
        {
          error: "EMAIL_FROM not configured",
        },
        { status: 500 },
      )
    }

    // Test Resend API connectivity
    console.log("[email-test] Testing Resend API connectivity...")
    const pingResponse = await fetch("https://api.resend.com/domains", {
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
    })
    console.log("[email-test] Resend API ping status:", pingResponse.status)

    if (!pingResponse.ok) {
      return NextResponse.json(
        {
          error: "Resend API unreachable",
          pingStatus: pingResponse.status,
        },
        { status: 500 },
      )
    }

    // Send test email
    const resend = new Resend(process.env.RESEND_API_KEY)

    const testEmail = "test@pearlie.org" // Change this to your email for testing

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: testEmail,
      subject: "Pearlie Email Test",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h1>✅ Email system is working!</h1>
          <p>This is a test email from Pearlie's notification system.</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>From:</strong> ${process.env.EMAIL_FROM}</p>
          <p><strong>Environment:</strong> ${process.env.VERCEL_ENV || "development"}</p>
        </div>
      `,
    })

    if (error) {
      console.error("[email-test] Resend error:", error)
      return NextResponse.json(
        {
          error: error.message,
          details: error,
        },
        { status: 500 },
      )
    }

    console.log("[email-test] Test email sent successfully, ID:", data?.id)

    return NextResponse.json({
      success: true,
      messageId: data?.id,
      sentTo: testEmail,
      sentFrom: process.env.EMAIL_FROM,
    })
  } catch (error: any) {
    console.error("[email-test] Exception:", error)
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
