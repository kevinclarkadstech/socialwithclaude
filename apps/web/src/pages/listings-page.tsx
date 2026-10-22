import * as React from "react"
import { IconLayoutGrid, IconList, IconSearch } from "@tabler/icons-react"
import { cn } from "cn"

import { ListingCard, ListingRow } from "@/components/listings/listing-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useListings } from "@/hooks/use-listings"

type View = "grid" | "list"

/** Wait this long after typing stops before searching. */
const SEARCH_DELAY_MS = 300
const VIEW_STORAGE_KEY = "listings-view"

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

/**
 * The Listings tab: the newest listings, a search over titles and
 * descriptions, and a grid (2 across on phones, more on wider screens) or
 * list view.
 */
export function ListingsPage({
  onOpenListing,
  onOpenProfile,
}: {
  onOpenListing: (listingId: string) => void
  onOpenProfile: (username: string) => void
}) {
  const [view, setView] = useStoredView()
  const [input, setInput] = React.useState("")
  const query = useDebounced(input.trim(), SEARCH_DELAY_MS)
  // A new query shows nothing until its results arrive.
  const { state: current, loadingMore, loadMore } = useListings(query)

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

      {current.status === "loading" ? null : current.status === "failed" ? (
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
                  <ListingCard listing={listing} onOpen={onOpenListing} />
                ) : (
                  <ListingRow
                    listing={listing}
                    onOpen={onOpenListing}
                    onOpenProfile={onOpenProfile}
                  />
                )}
              </li>
            ))}
          </ul>
          {current.hasMore && (
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
