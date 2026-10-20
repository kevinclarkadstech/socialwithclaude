import * as React from "react"
import { cn } from "cn"

import { CommentComposer } from "@/components/comments/comment-composer"
import { CommentItem } from "@/components/comments/comment-item"
import { Button } from "@/components/ui/button"
import { usePostComments } from "@/hooks/use-post-comments"
import type { PersonSummary } from "@/lib/people"

/**
 * A post's (or listing's) comments, oldest first, with a box to add one.
 * You can edit your own comments; you can delete your own, and any comment
 * on your own post.
 */
export function PostComments({
  postId,
  postAuthorId,
  numComments,
  me,
  onOpenProfile,
  composerRef,
  className,
}: {
  postId: string
  postAuthorId: string
  /** The post's comment count as fetched, to keep counts elsewhere right. */
  numComments: number
  me: PersonSummary & { userId: string }
  onOpenProfile?: (username: string) => void
  /** Lets the page focus the comment box (e.g. from a Comment button). */
  composerRef?: React.Ref<HTMLTextAreaElement>
  className?: string
}) {
  const { state, loadingMore, loadMore, create, retry, update, remove } =
    usePostComments(postId, numComments, me)
  const isMyPost = postAuthorId === me.userId

  return (
    <section
      aria-label="Comments"
      className={cn("flex flex-col gap-4", className)}
    >
      <h2 className="text-sm font-medium">Comments</h2>

      {state.status === "loading" ? null : state.status !== "ready" ? (
        <p className="text-sm text-muted-foreground">
          {state.status === "not-found"
            ? "This post isn't available."
            : "Couldn't load comments."}
        </p>
      ) : (
        <>
          {state.comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No comments yet. Be the first.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {state.comments.map((comment) => {
                const isMine = comment.author.userId === me.userId
                return (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    canEdit={isMine}
                    canDelete={isMine || isMyPost}
                    onOpenProfile={onOpenProfile}
                    onUpdate={update}
                    onDelete={remove}
                    onRetry={retry}
                  />
                )
              })}
            </ul>
          )}
          {state.nextCursor && (
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading…" : "More comments"}
            </Button>
          )}
          <CommentComposer
            submitLabel="Comment"
            onSubmit={create}
            textareaRef={composerRef}
          />
        </>
      )}
    </section>
  )
}
