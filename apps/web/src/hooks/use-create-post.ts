import * as React from "react"
import { monotonicFactory } from "ulid"

import { api, apiErrorMessage } from "@/lib/api"

const ulid = monotonicFactory()

/** Omit for each member of a union (plain Omit merges the members). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never

/** A listing's details, as validated by the shared listingInput schema. */
export type NewListing = DistributiveOmit<
  Parameters<typeof api.listings.createListing.mutate>[0],
  "id"
>

export type NewPost =
  | { kind: "post"; body: string }
  | { kind: "listing"; listing: NewListing }

export type CreatePostResult = "ok" | "posting-disabled" | "failed"

/**
 * Creates a post or a listing. A failed attempt keeps its id, so retrying
 * never creates it twice; the next one after a success (or of the other
 * kind: an id belongs to one kind) gets a new id.
 */
export function useCreatePost() {
  // The id of the post being written, reused if it's retried.
  const retry = React.useRef<{ id: string; kind: NewPost["kind"] } | null>(null)

  return React.useCallback(async (post: NewPost): Promise<CreatePostResult> => {
    if (retry.current?.kind !== post.kind) {
      retry.current = { id: ulid(), kind: post.kind }
    }
    const { id } = retry.current
    try {
      if (post.kind === "listing") {
        await api.listings.createListing.mutate({ id, ...post.listing })
      } else {
        await api.posts.createPost.mutate({ id, body: post.body })
      }
      retry.current = null
      return "ok"
    } catch (err) {
      return apiErrorMessage(err) === "POSTING_DISABLED"
        ? "posting-disabled"
        : "failed"
    }
  }, [])
}
