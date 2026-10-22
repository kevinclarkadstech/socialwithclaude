import * as React from "react"

/** Badge counts are refreshed this often. */
const POLL_MS = 15_000

/**
 * A count for a badge, from `query`: loaded now, then every 15s while the
 * page is visible, and right away when `refresh` is called (after something
 * here changed it). 0 until the first load; failed loads keep the last count.
 */
export function usePolledCount(query: () => Promise<number>) {
  const [count, setCount] = React.useState(0)
  const [version, setVersion] = React.useState(0)
  // The first query is kept; callers pass a stable API method anyway.
  const queryRef = React.useRef(query)

  React.useEffect(() => {
    let cancelled = false
    const load = () =>
      queryRef
        .current()
        .then((n) => !cancelled && setCount(n))
        .catch(() => {})
    load()
    const timer = setInterval(() => {
      if (!document.hidden) load()
    }, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [version])

  const refresh = React.useCallback(() => setVersion((v) => v + 1), [])
  return { count, refresh }
}
