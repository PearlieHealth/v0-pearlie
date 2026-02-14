import { createHmac } from "crypto"

// Admin credentials from environment variables
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin"
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ""
export const SESSION_COOKIE_NAME = "admin_session"

// Derive session token from ADMIN_SESSION_SECRET (preferred) or ADMIN_PASSWORD.
// This ensures the token is never a guessable hardcoded string in source code.
const secret = process.env.ADMIN_SESSION_SECRET || ADMIN_PASSWORD
export const SESSION_TOKEN = secret
  ? createHmac("sha256", secret).update("pearlie_admin_session").digest("hex")
  : ""

// Whether the admin system is properly configured with a password
export const ADMIN_IS_CONFIGURED = ADMIN_PASSWORD.length > 0
