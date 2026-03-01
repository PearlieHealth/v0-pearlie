"use client"

import { useState, useEffect } from "react"

interface LastMatch {
  matchId: string
  clinicCount: number
  treatment: string
  createdAt: string
}

const MAX_MATCH_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

/**
 * Reads `pearlie_last_match` from localStorage, validates the match still
 * exists via a lightweight HEAD request, and clears stale entries.
 *
 * Returns `null` while validating or if the match is invalid/expired.
 */
export function useLastMatch() {
  const [lastMatch, setLastMatch] = useState<LastMatch | null>(null)

  useEffect(() => {
    let cancelled = false

    async function validate() {
      try {
        const stored = localStorage.getItem("pearlie_last_match")
        if (!stored) return

        const data = JSON.parse(stored) as LastMatch
        const age = Date.now() - new Date(data.createdAt).getTime()

        if (age >= MAX_MATCH_AGE_MS || !data.matchId) {
          localStorage.removeItem("pearlie_last_match")
          return
        }

        // Lightweight check — just see if the API returns OK
        const res = await fetch(`/api/matches/${data.matchId}`, {
          method: "GET",
          headers: { "x-validate-only": "1" },
          signal: AbortSignal.timeout(4000),
        })

        if (cancelled) return

        if (res.ok) {
          setLastMatch(data)
        } else {
          // Match no longer exists — clear localStorage
          localStorage.removeItem("pearlie_last_match")
        }
      } catch {
        // Network error or timeout — show the button anyway to avoid blocking
        // The match page will clear localStorage if it truly fails
        try {
          const stored = localStorage.getItem("pearlie_last_match")
          if (stored) {
            const data = JSON.parse(stored) as LastMatch
            if (!cancelled && data.matchId) setLastMatch(data)
          }
        } catch {}
      }
    }

    validate()
    return () => { cancelled = true }
  }, [])

  return lastMatch
}

/**
 * Simpler version that only reads matchId (for nav/sticky components that
 * only need the ID, not the full match data).
 */
export function useLastMatchId() {
  const match = useLastMatch()
  return match?.matchId ?? null
}
