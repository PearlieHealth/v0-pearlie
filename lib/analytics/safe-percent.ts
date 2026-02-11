/**
 * Safe percentage calculation utility
 * Step 7: Prevents impossible conversion rates
 */

export interface SafePercentResult {
  value: number
  display: string
  valid: boolean
}

/**
 * Computes a safe percentage where:
 * - numerator <= denominator (clamped if violated)
 * - denominator > 0 (returns "—" if zero)
 * - result is clamped to 0..100%
 */
export function safePercent(numerator: number, denominator: number): SafePercentResult {
  // If denominator is 0, return invalid state
  if (denominator === 0 || !Number.isFinite(denominator)) {
    return { value: 0, display: "—", valid: false }
  }

  // Ensure numerator is valid
  const safeNumerator = Number.isFinite(numerator) ? Math.max(0, numerator) : 0

  // Ensure numerator <= denominator
  const clampedNumerator = Math.min(safeNumerator, denominator)

  // Calculate percentage
  const pct = (clampedNumerator / denominator) * 100

  // Clamp to 0-100
  const clampedPct = Math.min(100, Math.max(0, pct))

  return {
    value: clampedPct,
    display: `${clampedPct.toFixed(1)}%`,
    valid: true,
  }
}

/**
 * Simple safe percent that returns just the number (0 if invalid)
 */
export function safePercentValue(numerator: number, denominator: number): number {
  return safePercent(numerator, denominator).value
}

/**
 * Get display string for a percentage (returns "—" if invalid)
 */
export function safePercentDisplay(numerator: number, denominator: number): string {
  return safePercent(numerator, denominator).display
}

// Unit tests (can be run with vitest)
export const __tests__ = {
  normalCase: () => {
    const result = safePercent(50, 100)
    console.assert(result.value === 50, "50/100 should be 50%")
    console.assert(result.valid === true, "should be valid")
  },
  zeroDenominator: () => {
    const result = safePercent(10, 0)
    console.assert(result.display === "—", "0 denominator should show —")
    console.assert(result.valid === false, "should be invalid")
  },
  numeratorLargerThanDenominator: () => {
    const result = safePercent(150, 100)
    console.assert(result.value === 100, "should clamp to 100%")
  },
  negativeNumerator: () => {
    const result = safePercent(-10, 100)
    console.assert(result.value === 0, "negative should become 0")
  },
}
