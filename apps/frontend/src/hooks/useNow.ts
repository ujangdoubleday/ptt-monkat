import { useEffect, useState } from 'react'

/**
 * A clock that ticks, so relative ages re-render between refetches.
 *
 * Without it "12s ago" sits frozen on screen for a whole poll interval —
 * worse than showing nothing, because a stale number reads as a current one.
 */
export function useNow(intervalMs = 5_000) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
