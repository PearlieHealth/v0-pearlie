/**
 * Email Templates for Pearlie
 * Using Resend for email delivery
 */

interface InviteEmailParams {
  clinicName: string
  contactName?: string
  inviteUrl: string
  expiresAt: Date
}

export function generateInviteEmailHTML({
  clinicName,
  contactName,
  inviteUrl,
  expiresAt,
}: InviteEmailParams): string {
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
      </head>
      <body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background: linear-gradient(135deg, #2F7F77 0%, #3d9a91 100%); color: white; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600;">Welcome to Pearlie</h1>
              <p style="margin: 10px 0 0; opacity: 0.9; font-size: 16px;">Your clinic portal is ready</p>
            </div>
            <div style="padding: 40px 30px;">
              <p style="font-size: 18px; color: #111827; margin-bottom: 20px;">Hi${contactName ? ` ${contactName}` : ""},</p>
              <p style="color: #4b5563; font-size: 16px; margin-bottom: 20px;">
                You've been invited to manage <strong>${clinicName}</strong> on Pearlie. 
                Our platform connects you with patients who are actively looking for dental care 
                and have already expressed interest in clinics like yours.
              </p>
              <p style="color: #4b5563; font-size: 16px; margin-bottom: 30px;">
                Click the button below to set up your account and start receiving patient leads.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="display: inline-block; background: #2F7F77; color: white !important; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Set Up Your Account</a>
              </div>
              <div style="margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 8px; font-size: 14px; color: #6b7280; word-break: break-all;">
                <strong>Or copy this link:</strong><br>
                ${inviteUrl}
              </div>
              <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #9ca3af;">
                This invite link expires on <strong>${expiryDate}</strong>. 
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
          </div>
          <div style="text-align: center; padding: 30px; color: #9ca3af; font-size: 14px;">
            <p>Pearlie - Better patients, better outcomes</p>
            <p><a href="https://pearlie.org" style="color: #2F7F77; text-decoration: none;">pearlie.org</a></p>
          </div>
        </div>
      </body>
    </html>
  `
}

interface PasswordResetEmailParams {
  resetUrl: string
  expiresAt: Date
}

export function generatePasswordResetEmailHTML({
  resetUrl,
  expiresAt,
}: PasswordResetEmailParams): string {
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
      </head>
      <body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background: linear-gradient(135deg, #2F7F77 0%, #3d9a91 100%); color: white; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600;">Reset Your Password</h1>
              <p style="margin: 10px 0 0; opacity: 0.9; font-size: 16px;">Pearlie Clinic Portal</p>
            </div>
            <div style="padding: 40px 30px;">
              <p style="font-size: 18px; color: #111827; margin-bottom: 20px;">Hi,</p>
              <p style="color: #4b5563; font-size: 16px; margin-bottom: 20px;">
                We received a request to reset your password for your Pearlie clinic portal account.
              </p>
              <p style="color: #4b5563; font-size: 16px; margin-bottom: 30px;">
                Click the button below to create a new password.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: #2F7F77; color: white !important; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Reset Password</a>
              </div>
              <div style="margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 8px; font-size: 14px; color: #6b7280; word-break: break-all;">
                <strong>Or copy this link:</strong><br>
                ${resetUrl}
              </div>
              <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #9ca3af;">
                This link expires at <strong>${expiryTime}</strong> (in 1 hour). 
                If you didn't request this password reset, you can safely ignore this email.
              </p>
            </div>
          </div>
          <div style="text-align: center; padding: 30px; color: #9ca3af; font-size: 14px;">
            <p>Pearlie - Better patients, better outcomes</p>
            <p><a href="https://pearlie.org" style="color: #2F7F77; text-decoration: none;">pearlie.org</a></p>
          </div>
        </div>
      </body>
    </html>
  `
}
