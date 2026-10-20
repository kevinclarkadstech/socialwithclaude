import * as React from "react"
import { cn } from "cn"

import { CommentComposer } from "@/components/comments/comment-composer"
import { CommentItem } from "@/components/comments/comment-item"
import { Button } from "@/components/ui/button"
import { usePostComments, type CommentSort } from "@/hooks/use-post-comments"
import type { PersonSummary } from "@/lib/people"

const SORTS: { value: CommentSort; label: string }[] = [
  { value: "top", label: "Best" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
]

/**
 * A post's (or listing's) comments with a box to add one, sorted Best
 * (highest score), Newest or Oldest first. Anyone can vote. You can edit
 * your own comments; you can delete your own, and any comment on your own
 * post.
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
  const [sort, setSort] = React.useState<CommentSort>("top")
  const { state, loadingMore, loadMore, create, retry, update, remove, vote } =
    usePostComments(postId, sort, numComments, me)
  const isMyPost = postAuthorId === me.userId

  return (
    <section
      aria-label="Comments"
      className={cn("flex flex-col gap-4", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Comments</h2>
        <div className="flex gap-1" role="group" aria-label="Sort comments">
          {SORTS.map(({ value, label }) => (
            <Button
              key={value}
              variant={sort === value ? "outline" : "ghost"}
              size="xs"
              aria-pressed={sort === value}
              onClick={() => setSort(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {state.status === "loading" ? null : state.status !== "ready" ? (
        <p className="text-sm text-muted-foreground">
          {state.status === "not-found"
            ? "This post isn't available."
            : "Couldn't load comments."}
        </p>
      ) : (
        <>
          <CommentComposer
            submitLabel="Comment"
            onSubmit={create}
            textareaRef={composerRef}
          />
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
                    onVote={vote}
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
        </>
      )}
    </section>
  )
}
