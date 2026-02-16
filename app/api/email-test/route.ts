export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { sendEmailWithRetry } from "@/lib/email-send"
import { EMAIL_FROM } from "@/lib/email-config"

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

    const testEmail = "test@pearlie.org"

    const result = await sendEmailWithRetry({
      from: EMAIL_FROM.NOTIFICATIONS,
      to: testEmail,
      subject: "Pearlie Email Test",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h1>Email system is working!</h1>
          <p>This is a test email from Pearlie's notification system.</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>From:</strong> ${EMAIL_FROM.NOTIFICATIONS}</p>
          <p><strong>Environment:</strong> ${process.env.VERCEL_ENV || "development"}</p>
        </div>
      `,
    })

    if (!result.success) {
      console.error("[email-test] Email send failed:", result.error)
      return NextResponse.json(
        { error: result.error },
        { status: 500 },
      )
    }

    console.log("[email-test] Test email sent successfully, ID:", result.messageId)

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      sentTo: testEmail,
      sentFrom: EMAIL_FROM.NOTIFICATIONS,
    })
  } catch (error: any) {
    console.error("[email-test] Exception:", error)
    return NextResponse.json(
      { error: "An internal error occurred" },
      { status: 500 },
    )
  }
}
