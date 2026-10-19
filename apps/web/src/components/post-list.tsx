import * as React from "react"

import { PostCard, type Post } from "@/components/post-card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"

type Page = { items: Post[]; nextCursor: string | null }

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; posts: Post[]; nextCursor: string | null }

/**
 * Posts a page at a time, from `loadPage` (called with the previous page's
 * `nextCursor`). Remount it (change its `key`) to reload from the top.
 */
export function PostList({
  loadPage,
  onOpenProfile,
  emptyMessage = "No posts yet.",
  errorMessage = () => "Couldn't load posts.",
}: {
  loadPage: (cursor: string | null) => Promise<Page>
  onOpenProfile?: (username: string) => void
  emptyMessage?: string
  /** What to show when the first page fails, from the error. */
  errorMessage?: (err: unknown) => string
}) {
  const [state, setState] = React.useState<ListState>({ status: "loading" })
  const [loadingMore, setLoadingMore] = React.useState(false)
  // The first load runs once per mount, whatever the caller passes later.
  const firstLoad = React.useRef({ loadPage, errorMessage })

  React.useEffect(() => {
    let cancelled = false
    const { loadPage, errorMessage } = firstLoad.current
    loadPage(null)
      .then(
        (page) =>
          !cancelled &&
          setState({
            status: "ready",
            posts: page.items,
            nextCursor: page.nextCursor,
          })
      )
      .catch(
        (err) =>
          !cancelled &&
          setState({ status: "error", message: errorMessage(err) })
      )
    return () => {
      cancelled = true
    }
  }, [])

  async function loadMore() {
    if (state.status !== "ready" || !state.nextCursor) return
    setLoadingMore(true)
    try {
      const page = await loadPage(state.nextCursor)
      setState({
        status: "ready",
        posts: [...state.posts, ...page.items],
        nextCursor: page.nextCursor,
      })
    } finally {
      setLoadingMore(false)
    }
  }

  if (state.status === "loading") return null
  if (state.status === "error" || state.posts.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        {state.status === "error" ? state.message : emptyMessage}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {state.posts.map((post) => (
        <PostCard key={post.id} post={post} onOpenProfile={onOpenProfile} />
      ))}
      {state.nextCursor && (
        <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  )
}

/** The Feed tab: everyone's posts, newest first. */
export function Feed({
  onOpenProfile,
}: {
  onOpenProfile?: (username: string) => void
}) {
  return (
    <PostList
      loadPage={(cursor) => api.posts.getFeed.query({ cursor })}
      onOpenProfile={onOpenProfile}
      errorMessage={() => "Couldn't load the feed."}
    />
  )
}
