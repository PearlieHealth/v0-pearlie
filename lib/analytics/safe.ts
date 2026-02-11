/**
 * Safe analytics helpers
 * Prevents runtime crashes from undefined/null data
 */

/**
 * Safely convert any value to an array
 * Returns empty array if input is not a valid array
 */
export function safeArray<T>(x: unknown): T[] {
  return Array.isArray(x) ? x : []
}

/**
 * Safely convert any value to a finite number
 * Returns 0 if input is not a valid number
 */
export function safeNumber(x: unknown): number {
  const num = Number(x)
  return Number.isFinite(num) ? num : 0
}

/**
 * Safely convert any value to an object
 * Returns empty object if input is not a valid object
 */
export function safeObject<T extends Record<string, unknown>>(x: unknown): T {
  return (x && typeof x === "object" && !Array.isArray(x) ? x : {}) as T
}

/**
 * Safely get a string value
 * Returns empty string if input is not a valid string
 */
export function safeString(x: unknown): string {
  return typeof x === "string" ? x : ""
}

/**
 * Safely format a number with toLocaleString
 * Returns '0' if input is invalid
 */
export function safeLocaleNumber(x: unknown): string {
  const num = safeNumber(x)
  return num.toLocaleString()
}

/**
 * Safely format a number to fixed decimal places
 * Returns '0' if input is invalid
 */
export function safeToFixed(x: unknown, decimals = 1): string {
  const num = safeNumber(x)
  return num.toFixed(decimals)
}
