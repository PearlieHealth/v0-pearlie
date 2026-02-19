/**
 * Clinic Portal URL utility
 *
 * Supports the portal.pearlie.org subdomain by translating internal
 * /clinic/* paths to clean paths (e.g. /leads) when the user is on
 * the portal subdomain, and keeping them as-is on the main domain.
 *
 * Set NEXT_PUBLIC_PORTAL_DOMAIN in Vercel env vars to enable
 * (e.g. "portal.pearlie.org"). When unset, everything falls back
 * to the existing /clinic/* path behaviour.
 */

const PORTAL_HOSTNAME = process.env.NEXT_PUBLIC_PORTAL_DOMAIN || ""

/**
 * Check if the current page is being served from the portal subdomain.
 * Client-side only — returns false during SSR / in middleware.
 */
export function isPortalDomain(): boolean {
  if (!PORTAL_HOSTNAME) return false
  if (typeof window === "undefined") return false
  return window.location.hostname === PORTAL_HOSTNAME
}

/**
 * Check if a given hostname matches the portal domain.
 * Works in middleware / server context where window is unavailable.
 */
export function isPortalHost(hostname: string): boolean {
  if (!PORTAL_HOSTNAME) return false
  return hostname === PORTAL_HOSTNAME || hostname.startsWith(`${PORTAL_HOSTNAME}:`)
}

/**
 * Convert an internal /clinic/* path to the correct href for the current domain.
 *
 *   On portal.pearlie.org:  /clinic       → /
 *   On portal.pearlie.org:  /clinic/leads → /leads
 *   On pearlie.org:         /clinic/leads → /clinic/leads (unchanged)
 */
export function clinicHref(path: string): string {
  if (!isPortalDomain()) return path

  if (path === "/clinic") return "/"
  if (path.startsWith("/clinic/")) return path.slice(7) // strip "/clinic"
  return path
}

/**
 * Build a full absolute URL to the portal for use on the main site
 * (e.g. the "Log in to Clinic Portal" button on /for-clinics).
 *
 * Falls back to /clinic/* path when PORTAL_DOMAIN is not configured.
 */
export function portalUrl(internalPath: string): string {
  if (!PORTAL_HOSTNAME) return internalPath

  const clean = internalPath === "/clinic"
    ? "/"
    : internalPath.startsWith("/clinic/")
      ? internalPath.slice(7)
      : internalPath
  return `https://${PORTAL_HOSTNAME}${clean}`
}
