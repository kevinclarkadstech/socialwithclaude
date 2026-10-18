import * as React from "react"

import { PostCard, type Post } from "@/components/post-card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"

type FeedState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; posts: Post[]; nextCursor: string | null }

/** The Feed tab: posts newest first, a page at a time. */
export function Feed() {
  const [state, setState] = React.useState<FeedState>({ status: "loading" })
  const [loadingMore, setLoadingMore] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    api.posts.getFeed
      .query({})
      .then(
        (page) =>
          !cancelled &&
          setState({
            status: "ready",
            posts: page.items,
            nextCursor: page.nextCursor,
          })
      )
      .catch(() => !cancelled && setState({ status: "error" }))
    return () => {
      cancelled = true
    }
  }, [])

  async function loadMore() {
    if (state.status !== "ready" || !state.nextCursor) return
    setLoadingMore(true)
    try {
      const page = await api.posts.getFeed.query({ cursor: state.nextCursor })
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
  if (state.status === "error") {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Couldn&apos;t load the feed.
      </p>
    )
  }
  if (state.posts.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">No posts yet.</p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {state.posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {state.nextCursor && (
        <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  )
}
