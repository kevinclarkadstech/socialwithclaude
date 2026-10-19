import * as React from "react"
import { IconLayoutGrid, IconList, IconSearch } from "@tabler/icons-react"
import { cn } from "cn"

import { ListingCard, ListingRow } from "@/components/listings/listing-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import {
  fromNewestListing,
  fromSearchedListing,
  type ListingSummary,
} from "@/lib/listings"

type View = "grid" | "list"
type Page = { items: ListingSummary[]; nextCursor: string | null }

const PAGE_SIZE = 20
/** Wait this long after typing stops before searching. */
const SEARCH_DELAY_MS = 300
const VIEW_STORAGE_KEY = "listings-view"

/** Newest listings, or listings matching `query` when there is one. */
async function loadListings(
  query: string,
  cursor: string | null
): Promise<Page> {
  if (query) {
    const page = await api.search.listings.query({
      query,
      cursor,
      limit: PAGE_SIZE,
    })
    return {
      items: page.items.map(fromSearchedListing),
      nextCursor: page.nextCursor,
    }
  }
  const page = await api.listings.getListings.query({
    cursor,
    limit: PAGE_SIZE,
  })
  return {
    items: page.items.flatMap((item) => fromNewestListing(item) ?? []),
    nextCursor: page.nextCursor,
  }
}

function useStoredView(): [View, (view: View) => void] {
  const [view, setView] = React.useState<View>(() => {
    try {
      return localStorage.getItem(VIEW_STORAGE_KEY) === "list" ? "list" : "grid"
    } catch {
      return "grid"
    }
  })
  const save = React.useCallback((next: View) => {
    setView(next)
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next)
    } catch {
      // Storage can be unavailable (private mode); the choice just isn't kept.
    }
  }, [])
  return [view, save]
}

/** Lags `value` by `delayMs`, so it only changes once typing pauses. */
function useDebounced<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

type Results =
  | { query: string; status: "error" }
  | ({ query: string; status: "ready" } & Page)

/**
 * The Listings tab: the newest listings, a search over titles and
 * descriptions, and a grid (2 across on phones, more on wider screens) or
 * list view.
 */
export function ListingsPage({
  onOpenProfile,
}: {
  onOpenProfile: (username: string) => void
}) {
  const [view, setView] = useStoredView()
  const [input, setInput] = React.useState("")
  const query = useDebounced(input.trim(), SEARCH_DELAY_MS)
  const [results, setResults] = React.useState<Results | null>(null)
  const [loadingMore, setLoadingMore] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    loadListings(query, null)
      .then((page) => {
        if (!cancelled) setResults({ query, status: "ready", ...page })
      })
      .catch(() => {
        if (!cancelled) setResults({ query, status: "error" })
      })
    return () => {
      cancelled = true
    }
  }, [query])

  async function loadMore() {
    if (results?.status !== "ready" || !results.nextCursor) return
    setLoadingMore(true)
    try {
      const page = await loadListings(results.query, results.nextCursor)
      setResults((prev) =>
        prev?.status === "ready" && prev.query === results.query
          ? {
              ...prev,
              items: [...prev.items, ...page.items],
              nextCursor: page.nextCursor,
            }
          : prev
      )
    } finally {
      setLoadingMore(false)
    }
  }

  // Results for an older query are stale until the new ones arrive.
  const current = results?.query === query ? results : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <IconSearch
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Search listings"
            aria-label="Search listings"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1" role="group" aria-label="View">
          <Button
            variant={view === "grid" ? "outline" : "ghost"}
            size="icon"
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
          >
            <IconLayoutGrid />
          </Button>
          <Button
            variant={view === "list" ? "outline" : "ghost"}
            size="icon"
            aria-label="List view"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <IconList />
          </Button>
        </div>
      </div>

      {!current ? null : current.status === "error" ? (
        <p className="text-center text-sm text-muted-foreground">
          Couldn&apos;t load listings.
        </p>
      ) : current.items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          {query ? `No listings match "${query}".` : "No listings yet."}
        </p>
      ) : (
        <>
          <ul
            className={cn(
              view === "grid"
                ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
                : "flex flex-col gap-3"
            )}
          >
            {current.items.map((listing) => (
              <li key={listing.id} className="min-w-0">
                {view === "grid" ? (
                  <ListingCard listing={listing} />
                ) : (
                  <ListingRow listing={listing} onOpenProfile={onOpenProfile} />
                )}
              </li>
            ))}
          </ul>
          {current.nextCursor && (
            <Button
              variant="outline"
              className="self-center"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          )}
        </>
      )}
    </div>
  )
}
