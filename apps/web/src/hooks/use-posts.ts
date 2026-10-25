import { api, appErrorType, unwrap } from "@/lib/api"
import type { Post, PostDetail } from "@/hooks/types"
import { usePagedList } from "@/hooks/use-paged-list"
import { useResource } from "@/hooks/use-resource"

const postId = (post: Post) => post.id

/**
 * The Feed: everyone's posts you can see, newest first, a page at a time.
 * Bump `version` to reload from the top (e.g. after posting).
 */
export function useFeed(version = 0) {
  return usePagedList(
    `feed:${version}`,
    async (cursor) => unwrap(await api.posts.getFeed.query({ cursor })),
    { getId: postId }
  )
}

/**
 * A user's posts, newest first, a page at a time. "followers-only" when
 * their profile is followers-only and you don't follow them.
 */
export function useUserPosts(username: string) {
  return usePagedList(
    `user-posts:${username}`,
    async (cursor) =>
      unwrap(await api.posts.getUserPosts.query({ username, cursor })),
    {
      getId: postId,
      // "authorization": their profile is followers-only and you don't follow them.
      classify: (err) =>
        appErrorType(err) === "authorization" ? "followers-only" : null,
    }
  )
}

/**
 * One post (or listing), with its photos and listing details. "not-found"
 * if it doesn't exist or you can't see it.
 */
export function usePost(id: string) {
  return useResource<PostDetail, "not-found">(
    `post:${id}`,
    async () => unwrap(await api.posts.getPostById.query({ id })),
    (err) => (appErrorType(err) === "entity-not-found" ? "not-found" : null)
  )
}
