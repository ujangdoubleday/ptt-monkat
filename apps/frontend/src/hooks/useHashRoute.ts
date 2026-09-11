import { useEffect, useState } from 'react'

/**
 * Hash routing, because two pages do not justify a router dependency.
 * The URL stays bookmarkable and shareable, which is what actually matters
 * for a NOC screen someone wants to leave open.
 */
export function useHashRoute(): string {
  const [route, setRoute] = useState(() => window.location.hash || '#/')

  useEffect(() => {
    const onChange = () => setRoute(window.location.hash || '#/')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}
