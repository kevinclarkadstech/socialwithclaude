import { api, apiErrorMessage } from "@/lib/api"
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
    (cursor) => api.posts.getFeed.query({ cursor }),
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
    (cursor) => api.posts.getUserPosts.query({ username, cursor }),
    {
      getId: postId,
      classify: (err) =>
        apiErrorMessage(err) === "POSTS_FOLLOWERS_ONLY"
          ? "followers-only"
          : null,
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
    () => api.posts.getPostById.query({ id }),
    (err) => (apiErrorMessage(err) === "POST_NOT_FOUND" ? "not-found" : null)
  )
}
