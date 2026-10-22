import * as React from "react"
import { IconArrowLeft } from "@tabler/icons-react"

import { PostComments } from "@/components/comments/post-comments"
import { PostCard } from "@/components/post-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { usePost } from "@/hooks/use-posts"
import type { PersonSummary } from "@/lib/people"

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
  const state = usePost(postId)
  const composerRef = React.useRef<HTMLTextAreaElement>(null)

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" className="self-start" onClick={onBack}>
        <IconArrowLeft />
        Back
      </Button>
      {state.status === "ready" ? (
        <>
          <PostCard
            post={state.data}
            onOpenProfile={onOpenProfile}
            onComment={() => composerRef.current?.focus()}
          />
          <Card size="sm">
            <CardContent>
              <PostComments
                postId={state.data.id}
                postAuthorId={state.data.author.userId}
                numComments={state.data.numComments}
                me={me}
                onOpenProfile={onOpenProfile}
                composerRef={composerRef}
              />
            </CardContent>
          </Card>
        </>
      ) : state.status === "loading" ? null : (
        <p className="text-center text-sm text-muted-foreground">
          {state.status === "failed" && state.reason === "not-found"
            ? "This post isn't available."
            : "Couldn't load this post."}
        </p>
      )}
    </div>
  )
}
