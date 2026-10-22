import * as React from "react"

export type Page<T> = { items: T[]; nextCursor: string | null }

/**
 * A list loaded a page at a time: "loading", "ready" with `items` (and
 * `hasMore`), or "failed" with a `reason` from `classify` ("error" if it
 * doesn't recognise the error).
 */
export type PagedListState<T, Failure extends string = never> =
  | { status: "loading" }
  | { status: "ready"; items: T[]; hasMore: boolean }
  | { status: "failed"; reason: Failure | "error" }

export type PagedList<T, Failure extends string = never> = {
  state: PagedListState<T, Failure>
  loadingMore: boolean
  /** Appends the next page (items already shown are skipped). */
  loadMore: () => Promise<void>
  /** Changes the loaded items in place, e.g. to drop one that was handled. */
  updateItems: (change: (items: T[]) => T[]) => void
}

type Loaded<T, Failure extends string> = { key: string } & (
  | { status: "ready"; items: T[]; nextCursor: string | null }
  | { status: "failed"; reason: Failure | "error" }
)

/**
 * Loads the first page from `fetchPage(null)` for each `key` (a new key
 * starts over), and later pages from `fetchPage(nextCursor)`. `getId`
 * identifies items, so a page that overlaps what's shown doesn't repeat
 * them.
 */
export function usePagedList<T, Failure extends string = never>(
  key: string,
  fetchPage: (cursor: string | null) => Promise<Page<T>>,
  {
    getId,
    classify,
  }: {
    getId: (item: T) => string
    classify?: (err: unknown) => Failure | null
  }
): PagedList<T, Failure> {
  const [loaded, setLoaded] = React.useState<Loaded<T, Failure>>()
  const [loadingMore, setLoadingMore] = React.useState(false)
  // The latest functions, without reloading when the caller re-renders.
  const latest = React.useRef({ fetchPage, getId, classify })
  React.useEffect(() => {
    latest.current = { fetchPage, getId, classify }
  })

  React.useEffect(() => {
    let cancelled = false
    const { fetchPage, classify } = latest.current
    fetchPage(null)
      .then(
        (page) => !cancelled && setLoaded({ key, status: "ready", ...page })
      )
      .catch(
        (err) =>
          !cancelled &&
          setLoaded({
            key,
            status: "failed",
            reason: classify?.(err) ?? "error",
          })
      )
    return () => {
      cancelled = true
    }
  }, [key])

  const current = loaded?.key === key ? loaded : undefined

  const loadMore = React.useCallback(async () => {
    if (current?.status !== "ready" || !current.nextCursor) return
    setLoadingMore(true)
    try {
      const page = await latest.current.fetchPage(current.nextCursor)
      setLoaded((prev) => {
        if (prev?.key !== key || prev.status !== "ready") return prev
        const { getId } = latest.current
        const shown = new Set(prev.items.map(getId))
        return {
          ...prev,
          items: [
            ...prev.items,
            ...page.items.filter((item) => !shown.has(getId(item))),
          ],
          nextCursor: page.nextCursor,
        }
      })
    } finally {
      setLoadingMore(false)
    }
  }, [current, key])

  const updateItems = React.useCallback(
    (change: (items: T[]) => T[]) =>
      setLoaded((prev) =>
        prev?.status === "ready" ? { ...prev, items: change(prev.items) } : prev
      ),
    []
  )

  const state: PagedListState<T, Failure> = !current
    ? { status: "loading" }
    : current.status === "ready"
      ? {
          status: "ready",
          items: current.items,
          hasMore: current.nextCursor !== null,
        }
      : { status: "failed", reason: current.reason }

  return { state, loadingMore, loadMore, updateItems }
}
