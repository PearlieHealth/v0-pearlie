import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { sendEmailWithRetry } from "@/lib/email-send"
import { EMAIL_FROM } from "@/lib/email-config"

export async function POST(request: Request) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const { email, clinicName } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const testLead = {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@example.com",
      phone: "07700 900123",
      treatment: "Invisalign",
      postcode: "SW1A 1AA",
      priority: "Natural, comfortable smile",
      budget: "£3,000-£5,000",
      timing: "Within 3 months",
      submittedAt: new Date().toISOString(),
    }

    const actionLabel = "Booking"
    const subject = `[TEST] New ${actionLabel} Request - ${testLead.firstName} ${testLead.lastName}`
    const html = generateTestEmailHTML(clinicName || "Your Clinic", "click_book", testLead)

    const result = await sendEmailWithRetry({
      from: EMAIL_FROM.NOTIFICATIONS,
      to: email,
      subject,
      html,
    })

    if (!result.success) {
      console.error("[v0] Test email error:", result.error)
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    })
  } catch (error: any) {
    console.error("[v0] Error sending test email:", error)
    return NextResponse.json({ error: error.message || "Failed to send test email" }, { status: 500 })
  }
}

function generateTestEmailHTML(
  clinicName: string,
  actionType: string,
  lead: {
    firstName: string
    lastName: string
    email: string
    phone: string
    treatment: string
    postcode: string
    priority: string
    budget: string
    timing: string
    submittedAt: string
  },
): string {
  const actionLabel = actionType === "click_book" ? "Book Consultation" : "Call Clinic"
  const date = new Date(lead.submittedAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  })

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1f2937; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .test-banner { background: #fef3c7; border: 2px solid #f59e0b; color: #92400e; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; font-weight: 600; }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 600; margin-bottom: 10px; }
          .field { margin-bottom: 15px; }
          .label { font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
          .value { font-size: 16px; color: #111827; margin-top: 4px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="test-banner">
            🧪 TEST EMAIL - This is a preview of how your lead notifications will look
          </div>
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">🎯 New Patient Lead</h1>
            <p style="margin: 10px 0 0; opacity: 0.9; font-size: 16px;">${clinicName}</p>
          </div>
          <div class="content">
            <div class="badge">${actionLabel}</div>
            <p style="font-size: 16px; color: #374151; margin: 10px 0 20px;">
              A patient from Pearlie has clicked "${actionLabel}" for your clinic. They're ready to take the next step.
            </p>
            
            <div class="field">
              <div class="label">Patient Name</div>
              <div class="value">${lead.firstName} ${lead.lastName}</div>
            </div>
            
            <div class="field">
              <div class="label">Contact</div>
              <div class="value">
                ${lead.email}${lead.phone ? ` • ${lead.phone}` : ""}
              </div>
            </div>
            
            <div class="field">
              <div class="label">Treatment Interest</div>
              <div class="value">${lead.treatment}</div>
            </div>
            
            <div class="field">
              <div class="label">Location</div>
              <div class="value">${lead.postcode}</div>
            </div>
            
            <div class="field">
              <div class="label">Priority</div>
              <div class="value">${lead.priority}</div>
            </div>
            
            <div class="field">
              <div class="label">Budget</div>
              <div class="value">${lead.budget}</div>
            </div>
            
            <div class="field">
              <div class="label">Timing</div>
              <div class="value">${lead.timing}</div>
            </div>
            
            <div class="field">
              <div class="label">Submitted</div>
              <div class="value">${date}</div>
            </div>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
              <strong>Next Steps:</strong> Reach out to this patient within 24 hours for the best conversion rates. 
              They're already interested in your clinic specifically.
            </p>
          </div>
          
          <div class="footer">
            <p>This lead was generated by <strong>Pearlie</strong></p>
            <p style="font-size: 12px;">pearlie.org</p>
          </div>
        </div>
      </body>
    </html>
  `
}
