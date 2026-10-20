import * as React from "react"
import { IconArrowLeft } from "@tabler/icons-react"

import { PostComments } from "@/components/comments/post-comments"
import { PostCard, type Post } from "@/components/post-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { api, apiErrorMessage } from "@/lib/api"
import type { PersonSummary } from "@/lib/people"

type State =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error" }
  | { status: "ready"; post: Post }

/** One post with its comments. The Comment button jumps to the comment box. */
export function PostPage({
  postId,
  me,
  onBack,
  onOpenProfile,
}: {
  postId: string
  me: PersonSummary & { userId: string }
  onBack: () => void
  onOpenProfile: (username: string) => void
}) {
  const [state, setState] = React.useState<State>({ status: "loading" })
  const composerRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    let cancelled = false
    api.posts.getPostById
      .query({ id: postId })
      .then((post) => !cancelled && setState({ status: "ready", post }))
      .catch(
        (err) =>
          !cancelled &&
          setState({
            status:
              apiErrorMessage(err) === "POST_NOT_FOUND" ? "not-found" : "error",
          })
      )
    return () => {
      cancelled = true
    }
  }, [postId])

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" className="self-start" onClick={onBack}>
        <IconArrowLeft />
        Back
      </Button>
      {state.status === "ready" ? (
        <>
          <PostCard
            post={state.post}
            onOpenProfile={onOpenProfile}
            onComment={() => composerRef.current?.focus()}
          />
          <Card size="sm">
            <CardContent>
              <PostComments
                postId={state.post.id}
                postAuthorId={state.post.author.userId}
                numComments={state.post.numComments}
                me={me}
                onOpenProfile={onOpenProfile}
                composerRef={composerRef}
              />
            </CardContent>
          </Card>
        </>
      ) : state.status === "loading" ? null : (
        <p className="text-center text-sm text-muted-foreground">
          {state.status === "not-found"
            ? "This post isn't available."
            : "Couldn't load this post."}
        </p>
      )}
    </div>
  )
}
