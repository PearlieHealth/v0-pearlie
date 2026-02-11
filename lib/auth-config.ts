// Simple admin authentication - username and password from environment variables
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin"
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ""
export const SESSION_COOKIE_NAME = "admin_session"
export const SESSION_TOKEN = "pearlie_admin_session_active"
