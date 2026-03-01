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
 * Reads `pearlie_last_match` from localStorage and returns it immediately
 * so the "Return to matches" button appears without delay. Validates in the
 * background and clears the entry only if the API confirms the match no
 * longer exists (non-200 response).
 */
export function useLastMatch() {
  const [lastMatch, setLastMatch] = useState<LastMatch | null>(null)

  useEffect(() => {
    let cancelled = false

    // 1. Immediately read from localStorage and surface the match
    let storedData: LastMatch | null = null
    try {
      const stored = localStorage.getItem("pearlie_last_match")
      if (stored) {
        const data = JSON.parse(stored) as LastMatch
        const age = Date.now() - new Date(data.createdAt).getTime()

        if (age >= MAX_MATCH_AGE_MS || !data.matchId) {
          localStorage.removeItem("pearlie_last_match")
        } else {
          storedData = data
          setLastMatch(data)
        }
      }
    } catch {}

    // 2. Validate in background — only clear if the API says the match is gone
    if (storedData) {
      fetch(`/api/matches/${storedData.matchId}`, {
        method: "GET",
        headers: { "x-validate-only": "1" },
        signal: AbortSignal.timeout(4000),
      })
        .then((res) => {
          if (!cancelled && !res.ok) {
            localStorage.removeItem("pearlie_last_match")
            setLastMatch(null)
          }
        })
        .catch(() => {
          // Network error or timeout — keep showing the button.
          // The match page itself will clear localStorage if it truly fails.
        })
    }

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
