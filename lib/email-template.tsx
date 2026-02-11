export function generateInviteEmailHTML({
  clinicName,
  contactName,
  inviteUrl,
  expiresAt,
}: {
  clinicName: string
  contactName?: string
  inviteUrl: string
  expiresAt: Date
}): string {
  const expiryDate = expiresAt.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f9fafb; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
          .header { background: linear-gradient(135deg, #2F7F77 0%, #3d9a91 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
          .header p { margin: 10px 0 0; opacity: 0.9; font-size: 16px; }
          .content { padding: 40px 30px; }
          .greeting { font-size: 18px; color: #111827; margin-bottom: 20px; }
          .message { color: #4b5563; font-size: 16px; margin-bottom: 30px; }
          .cta-button { display: inline-block; background: #2F7F77; color: white !important; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; }
          .cta-button:hover { background: #267069; }
          .cta-container { text-align: center; margin: 30px 0; }
          .link-fallback { margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 8px; font-size: 14px; color: #6b7280; word-break: break-all; }
          .expiry { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #9ca3af; }
          .footer { text-align: center; padding: 30px; color: #9ca3af; font-size: 14px; }
          .footer a { color: #2F7F77; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <h1>Welcome to Pearlie</h1>
              <p>Your clinic portal is ready</p>
            </div>
            <div class="content">
              <p class="greeting">Hi${contactName ? ` ${contactName}` : ""},</p>
              <p class="message">
                You've been invited to manage <strong>${clinicName}</strong> on Pearlie. 
                Our platform connects you with patients who are actively looking for dental care 
                and have already expressed interest in clinics like yours.
              </p>
              <p class="message">
                Click the button below to set up your account and start receiving patient leads.
              </p>
              <div class="cta-container">
                <a href="${inviteUrl}" class="cta-button">Set Up Your Account</a>
              </div>
              <div class="link-fallback">
                <strong>Or copy this link:</strong><br>
                ${inviteUrl}
              </div>
              <p class="expiry">
                This invite link expires on <strong>${expiryDate}</strong>. 
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
          </div>
          <div class="footer">
            <p>Pearlie - Better patients, better outcomes</p>
            <p><a href="https://pearlie.org">pearlie.org</a></p>
          </div>
        </div>
      </body>
    </html>
  `
}

export function generatePasswordResetEmailHTML({
  resetUrl,
  expiresAt,
}: {
  resetUrl: string
  expiresAt: Date
}): string {
  const expiryTime = expiresAt.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f9fafb; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
          .header { background: linear-gradient(135deg, #2F7F77 0%, #3d9a91 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
          .content { padding: 30px; }
          .message { color: #4b5563; font-size: 16px; margin-bottom: 20px; }
          .cta-button { display: inline-block; background: #2F7F77; color: white !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; }
          .cta-container { text-align: center; margin: 25px 0; }
          .expiry { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #9ca3af; }
          .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <h1>Reset Your Password</h1>
            </div>
            <div class="content">
              <p class="message">
                We received a request to reset your password for your Pearlie clinic portal account.
              </p>
              <p class="message">
                Click the button below to create a new password:
              </p>
              <div class="cta-container">
                <a href="${resetUrl}" class="cta-button">Reset Password</a>
              </div>
              <p class="expiry">
                This link expires at <strong>${expiryTime}</strong> today. 
                If you didn't request a password reset, you can safely ignore this email.
              </p>
            </div>
          </div>
          <div class="footer">
            <p>Pearlie - Better patients, better outcomes</p>
          </div>
        </div>
      </body>
    </html>
  `
}
