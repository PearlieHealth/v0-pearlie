import { createHmac } from "crypto"

// Admin credentials from environment variables
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin"
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ""
// __Host- prefix enforces Secure + Path=/ and prevents subdomain cookie attacks
export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-admin_session" : "admin_session"

// Derive session token from ADMIN_SESSION_SECRET.
// Do NOT fall back to ADMIN_PASSWORD — if no secret is set, sessions are disabled (safe default).
const secret = process.env.ADMIN_SESSION_SECRET || ""
const sessionEpoch = process.env.ADMIN_SESSION_EPOCH || "1"
export const SESSION_TOKEN = secret
  ? createHmac("sha256", secret).update(`pearlie_admin_session_v${sessionEpoch}`).digest("hex")
  : ""

// Whether the admin system is properly configured with a password
export const ADMIN_IS_CONFIGURED = ADMIN_PASSWORD.length > 0
