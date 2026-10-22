import { PostCard } from "@/components/post-card"
import { Button } from "@/components/ui/button"
import type { Post } from "@/hooks/types"
import type { PagedList } from "@/hooks/use-paged-list"
import { useFeed } from "@/hooks/use-posts"

/**
 * Posts from a paged list (useFeed, useUserPosts), with "Load more".
 * `errorMessage` says what to show when the first page fails, from its
 * failure reason.
 */
export function PostList<Failure extends string>({
  list,
  onOpenProfile,
  onOpenPost,
  emptyMessage = "No posts yet.",
  errorMessage = () => "Couldn't load posts.",
}: {
  list: PagedList<Post, Failure>
  onOpenProfile?: (username: string) => void
  /** Open a post and its comments. */
  onOpenPost?: (postId: string) => void
  emptyMessage?: string
  errorMessage?: (failure: Failure | "error") => string
}) {
  const { state, loadingMore, loadMore } = list

  if (state.status === "loading") return null
  if (state.status !== "ready" || state.items.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        {state.status === "ready" ? emptyMessage : errorMessage(state.reason)}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {state.items.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onOpenProfile={onOpenProfile}
          onComment={onOpenPost && ((p) => onOpenPost(p.id))}
        />
      ))}
      {state.hasMore && (
        <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  )
}

/** The Feed tab: everyone's posts, newest first. Remount it to reload. */
export function Feed({
  onOpenProfile,
  onOpenPost,
}: {
  onOpenProfile?: (username: string) => void
  onOpenPost?: (postId: string) => void
}) {
  const list = useFeed()
  return (
    <PostList
      list={list}
      onOpenProfile={onOpenProfile}
      onOpenPost={onOpenPost}
      errorMessage={() => "Couldn't load the feed."}
    />
  )
}
