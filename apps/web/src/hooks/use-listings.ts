import * as React from "react"

import { api } from "@/lib/api"
import type { ListingSummary } from "@/lib/listings"
import type { Listing, ListingStatus } from "@/hooks/types"
import { usePagedList, type Page } from "@/hooks/use-paged-list"
import { usePost } from "@/hooks/use-posts"
import type { Resource } from "@/hooks/use-resource"

const PAGE_SIZE = 20

type NewestListing = Awaited<
  ReturnType<typeof api.listings.getListings.query>
>["items"][number]
type SearchedListing = Awaited<
  ReturnType<typeof api.search.listings.query>
>["items"][number]

/** From listings.getListings; null for a row without listing details. */
function fromNewestListing(item: NewestListing): ListingSummary | null {
  if (!item.listing) return null
  return {
    id: item.id,
    title: item.listing.title,
    priceType: item.listing.priceType,
    priceCents: item.listing.priceCents,
    status: item.listing.status,
    location: item.listing.location,
    imageUrl: item.thumbnail?.url ?? null,
    createdAt: item.createdAt,
    isSaved: item.isSaved,
    seller: {
      username: item.author.username,
      avatarUrl: item.author.avatarUrl,
    },
  }
}

/** From search.listings. */
function fromSearchedListing(item: SearchedListing): ListingSummary {
  return {
    id: item.id,
    title: item.title,
    priceType: item.priceType,
    priceCents: item.priceCents,
    status: item.status,
    location: item.location,
    imageUrl: item.imageUrl,
    createdAt: item.createdAt,
    isSaved: item.isSaved,
    seller: {
      username: item.author.username,
      avatarUrl: item.author.avatarUrl,
    },
  }
}

/** Newest listings, or listings matching `query` when there is one. */
async function fetchListings(
  query: string,
  cursor: string | null
): Promise<Page<ListingSummary>> {
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

/**
 * Listings you can see, 20 at a time: the newest, or those whose title or
 * description matches `query` (pass "" for the newest). A new query starts
 * over.
 */
export function useListings(query: string) {
  return usePagedList(
    `listings:${query}`,
    (cursor) => fetchListings(query, cursor),
    { getId: (listing) => listing.id }
  )
}

/**
 * One listing with its photos and details. "not-found" if it doesn't
 * exist, you can't see it, or it's a regular post.
 */
export function useListing(id: string): Resource<Listing, "not-found"> {
  const post = usePost(id)
  if (post.status !== "ready") return post
  const { data } = post
  return data.listing
    ? { status: "ready", data: { ...data, listing: data.listing } }
    : { status: "failed", reason: "not-found" }
}

/**
 * The status (available / pending / sold) of your own listing, and
 * `setStatus` to change it: shown right away, put back if the change
 * fails. `setStatus` resolves to whether it was saved.
 */
export function useListingStatus(listingId: string, initial: ListingStatus) {
  const [status, setStatusState] = React.useState(initial)

  const setStatus = React.useCallback(
    async (next: ListingStatus) => {
      const previous = status
      setStatusState(next)
      try {
        await api.listings.setListingStatus.mutate({
          id: listingId,
          status: next,
        })
        return true
      } catch {
        setStatusState(previous)
        return false
      }
    },
    [listingId, status]
  )

  return { status, setStatus }
}
