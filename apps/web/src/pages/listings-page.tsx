import * as React from "react"
import {
  IconLayoutGrid,
  IconList,
  IconMapPin,
  IconPhoto,
  IconSearch,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { UserAvatar } from "@/components/user-avatar"
import { api } from "@/lib/api"
import { displayName } from "@/lib/people"
import { fullDateTime, timeAgo } from "@/lib/time"

const PAGE_SIZE = 20
const currency = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
})

type Listing = Awaited<
  ReturnType<typeof api.listings.getListings.query>
>["items"][number]
type SearchResult = Awaited<
  ReturnType<typeof api.search.posts.query>
>["items"][number]
type SearchListing = Extract<SearchResult, { type: "listing" }>

type ListingItem = {
  id: string
  title: string
  body: string
  condition: "new" | "used" | null
  priceType: "fixed" | "negotiable" | "free" | "multiple"
  priceCents: number | null
  status: "available" | "pending" | "sold"
  location: string | null
  createdAt: Date | string
  imageUrl: string | null
  author: {
    userId: string
    username: string
    firstName: string | null
    lastName: string | null
    avatarUrl: string | null
  }
}

type Page = { items: ListingItem[]; nextCursor: string | null }
type ResultsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; items: ListingItem[]; nextCursor: string | null }

function fromListing(listing: Listing): ListingItem {
  return {
    id: listing.id,
    title: listing.listing.title,
    body: listing.body,
    condition: listing.listing.condition,
    priceType: listing.listing.priceType,
    priceCents: listing.listing.priceCents,
    status: listing.listing.status,
    location: listing.listing.location,
    createdAt: listing.createdAt,
    imageUrl: listing.thumbnail?.url ?? null,
    author: listing.author,
  }
}

function fromSearchResult(listing: SearchListing): ListingItem {
  return {
    id: listing.id,
    title: listing.title,
    body: "",
    condition: null,
    priceType: listing.priceType,
    priceCents: listing.priceCents,
    status: listing.status,
    location: listing.location,
    createdAt: listing.createdAt,
    imageUrl: listing.imageUrl,
    author: { ...listing.author, firstName: null, lastName: null },
  }
}

async function loadPage(query: string, cursor: string | null): Promise<Page> {
  if (query) {
    const page = await api.search.posts.query({
      query,
      kind: "listing",
      cursor,
      limit: PAGE_SIZE,
    })
    return {
      items: page.items.map((item) =>
        item.type === "listing" ? fromSearchResult(item) : null
      ).filter((item): item is ListingItem => item !== null),
      nextCursor: page.nextCursor,
    }
  }

  const page = await api.listings.getListings.query({
    cursor,
    limit: PAGE_SIZE,
  })
  return { items: page.items.map(fromListing), nextCursor: page.nextCursor }
}

export function ListingsPage({
  onOpenProfile,
}: {
  onOpenProfile: (username: string) => void
}) {
  const [search, setSearch] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [searchVersion, setSearchVersion] = React.useState(0)
  const [view, setView] = React.useState<"grid" | "list">("grid")

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery(search.trim())
    setSearchVersion((version) => version + 1)
  }

  function clearSearch() {
    setSearch("")
    setQuery("")
    setSearchVersion((version) => version + 1)
  }

  return (
    <section className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Marketplace</h1>
        <p className="text-sm text-muted-foreground">
          Find something new from the community.
        </p>
      </div>

      <form className="flex gap-2" onSubmit={submitSearch}>
        <label htmlFor="listing-search" className="sr-only">
          Search listings
        </label>
        <div className="relative min-w-0 flex-1">
          <IconSearch
            aria-hidden="true"
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="listing-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search listings"
            className="pl-9"
            maxLength={100}
          />
        </div>
        <Button type="submit">Search</Button>
        {query && (
          <Button type="button" variant="outline" onClick={clearSearch}>
            Clear
          </Button>
        )}
      </form>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {query ? `Results for “${query}”` : "Newest listings"}
        </p>
        <div className="flex gap-1" aria-label="Listing layout">
          <Button
            type="button"
            variant={view === "grid" ? "outline" : "ghost"}
            size="icon-sm"
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
          >
            <IconLayoutGrid />
          </Button>
          <Button
            type="button"
            variant={view === "list" ? "outline" : "ghost"}
            size="icon-sm"
            aria-label="List view"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <IconList />
          </Button>
        </div>
      </div>

      <ListingResults
        key={`${query}:${searchVersion}`}
        query={query}
        view={view}
        onOpenProfile={onOpenProfile}
      />
    </section>
  )
}

function ListingResults({
  query,
  view,
  onOpenProfile,
}: {
  query: string
  view: "grid" | "list"
  onOpenProfile: (username: string) => void
}) {
  const [state, setState] = React.useState<ResultsState>({ status: "loading" })
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [loadMoreFailed, setLoadMoreFailed] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    loadPage(query, null)
      .then(
        (page) =>
          !cancelled &&
          setState({
            status: "ready",
            items: page.items,
            nextCursor: page.nextCursor,
          })
      )
      .catch(() => !cancelled && setState({ status: "error" }))
    return () => {
      cancelled = true
    }
  }, [query])

  async function loadMore() {
    if (state.status !== "ready" || !state.nextCursor) return
    setLoadingMore(true)
    setLoadMoreFailed(false)
    try {
      const page = await loadPage(query, state.nextCursor)
      setState({
        status: "ready",
        items: [...state.items, ...page.items],
        nextCursor: page.nextCursor,
      })
    } catch {
      setLoadMoreFailed(true)
    } finally {
      setLoadingMore(false)
    }
  }

  if (state.status === "loading") return null
  if (state.status === "error") {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Couldn&apos;t load listings.
      </p>
    )
  }
  if (state.items.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        {query ? "No listings match your search." : "No listings yet."}
      </p>
    )
  }

  return (
    <>
      <div
        className={
          view === "grid"
            ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            : "flex flex-col gap-3"
        }
      >
        {state.items.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            view={view}
            onOpenProfile={onOpenProfile}
          />
        ))}
      </div>
      {loadMoreFailed && (
        <p className="text-center text-sm text-destructive">
          Couldn&apos;t load more listings. Please try again.
        </p>
      )}
      {state.nextCursor && (
        <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      )}
    </>
  )
}

function ListingCard({
  listing,
  view,
  onOpenProfile,
}: {
  listing: ListingItem
  view: "grid" | "list"
  onOpenProfile: (username: string) => void
}) {
  const listView = view === "list"
  const price =
    listing.priceType === "free"
      ? "Free"
      : listing.priceType === "multiple"
        ? "Multiple items"
        : listing.priceCents === null
          ? listing.priceType === "negotiable"
            ? "Negotiable"
            : "Price unavailable"
          : `${currency.format(listing.priceCents / 100)}${
              listing.priceType === "negotiable" ? " · negotiable" : ""
            }`

  return (
    <Card
      className={
        listView
          ? "flex-row items-stretch gap-0 py-0"
          : "min-w-0"
      }
    >
      {listing.imageUrl ? (
        <img
          src={listing.imageUrl}
          alt=""
          loading="lazy"
          className={
            listView
              ? "aspect-square w-28 shrink-0 self-start bg-muted object-cover sm:w-40"
              : "aspect-square w-full bg-muted object-cover"
          }
        />
      ) : (
        <div
          aria-hidden="true"
          className={
            listView
              ? "flex aspect-square w-28 shrink-0 items-center justify-center bg-muted text-muted-foreground sm:w-40"
              : "flex aspect-square w-full items-center justify-center bg-muted text-muted-foreground"
          }
        >
          <IconPhoto className="size-8" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="line-clamp-2 min-w-0 font-medium">{listing.title}</h2>
          <span className="shrink-0 font-semibold">{price}</span>
        </div>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {listing.body || "No description provided."}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="capitalize">{listing.status}</span>
          {listing.condition && <span className="capitalize">{listing.condition}</span>}
          {listing.location && (
            <span className="inline-flex items-center gap-1">
              <IconMapPin className="size-3.5" aria-hidden="true" />
              {listing.location}
            </span>
          )}
        </div>
        <div className="mt-auto flex min-w-0 items-center gap-2 border-t border-border/60 pt-2 text-xs">
          <button
            type="button"
            className="flex min-w-0 items-center gap-2 text-left hover:underline"
            onClick={() => onOpenProfile(listing.author.username)}
          >
            <UserAvatar person={listing.author} className="size-7" />
            <span className="truncate">{displayName(listing.author)}</span>
          </button>
          <time
            className="ml-auto shrink-0 text-muted-foreground"
            dateTime={
              typeof listing.createdAt === "string"
                ? listing.createdAt
                : listing.createdAt.toISOString()
            }
            title={fullDateTime(listing.createdAt)}
          >
            {timeAgo(listing.createdAt)}
          </time>
        </div>
      </div>
    </Card>
  )
}
