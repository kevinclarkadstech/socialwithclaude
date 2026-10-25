import type { PostDetail } from "@myapp/shared/domains/posts"

import type { api } from "@/lib/api"

/**
 * Shapes of the data the hooks return, for components that render it.
 * Post types come from @myapp/shared (the source of truth for the API's
 * post responses); the rest are derived from the API's responses. Either
 * way, components never touch the API.
 */

export type { Post, PostComment, PostDetail } from "@myapp/shared/domains/posts"

type Page<T extends { items: unknown[] }> = T["items"][number]

/** A listing opened on its own: a post with its listing details. */
export type Listing = PostDetail & {
  listing: NonNullable<PostDetail["listing"]>
}

export type ListingStatus = Listing["listing"]["status"]

/** A user's profile as shown on their page. */
export type Profile = Awaited<ReturnType<typeof api.users.getUserProfile.query>>

/** How your follow of someone looks to you. */
export type FollowStatus = Profile["followStatus"]

/** A pending request to follow you. */
export type FollowRequest = Page<
  Awaited<ReturnType<typeof api.users.getMyFollowRequests.query>>
>

/** A chat in your inbox, with its latest message. */
export type ChatSummary = Page<
  Awaited<ReturnType<typeof api.chats.getMyChats.query>>
>

/** A device or browser you're signed in on. */
export type SignedInSession = Awaited<
  ReturnType<typeof api.auth.getMySessions.query>
>[number]
