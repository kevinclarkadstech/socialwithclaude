import * as React from "react"
import {
  IconArrowBigDown,
  IconArrowBigDownFilled,
  IconArrowBigUp,
  IconArrowBigUpFilled,
} from "@tabler/icons-react"
import { cn } from "cn"

import { CommentComposer } from "@/components/comments/comment-composer"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import type { PostComment, Vote } from "@/hooks/use-post-comments"
import { displayName } from "@/lib/people"
import { fullDateTime, shortTimeAgo } from "@/lib/time"

type Mode = "view" | "editing" | "confirm-delete"

const compact = new Intl.NumberFormat(undefined, { notation: "compact" })

/**
 * One comment: author, age, text, up/down votes with the score, and Edit /
 * Delete when allowed. Edits happen in place; Delete asks first. While
 * sending, actions are hidden; if sending failed, Retry and Discard are
 * offered.
 */
export function CommentItem({
  comment,
  canEdit,
  canDelete,
  onOpenProfile,
  onUpdate,
  onDelete,
  onRetry,
  onVote,
}: {
  comment: PostComment
  canEdit: boolean
  canDelete: boolean
  onOpenProfile?: (username: string) => void
  onUpdate: (comment: PostComment, body: string) => Promise<void>
  onDelete: (comment: PostComment) => Promise<void>
  onRetry: (comment: PostComment) => void
  onVote: (comment: PostComment, value: Vote) => void
}) {
  const [mode, setMode] = React.useState<Mode>("view")
  const [error, setError] = React.useState<string | null>(null)
  const { author } = comment
  const edited = comment.updatedAt !== comment.createdAt

  function save(body: string) {
    setMode("view")
    setError(null)
    onUpdate(comment, body).catch(() =>
      setError("Couldn't save your edit. Please try again.")
    )
  }

  function remove() {
    setMode("view")
    setError(null)
    onDelete(comment).catch(() =>
      setError("Couldn't delete the comment. Please try again.")
    )
  }

  return (
    <li className="flex gap-3">
      <AuthorButton
        username={author.username}
        onOpen={onOpenProfile}
        className="shrink-0 self-start"
      >
        <UserAvatar person={author} size="sm" />
      </AuthorButton>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-baseline gap-1.5 text-sm leading-tight">
          <AuthorButton
            username={author.username}
            onOpen={onOpenProfile}
            className="truncate font-medium"
          >
            {displayName(author)}
          </AuthorButton>
          <span className="shrink-0 text-xs text-muted-foreground">
            <time
              dateTime={comment.createdAt}
              title={fullDateTime(comment.createdAt)}
            >
              {shortTimeAgo(comment.createdAt)}
            </time>
            {edited && (
              <span title={`Edited ${fullDateTime(comment.updatedAt)}`}>
                {" "}
                · edited
              </span>
            )}
          </span>
        </div>

        {mode === "editing" ? (
          <CommentComposer
            initialBody={comment.body}
            submitLabel="Save"
            placeholder="Edit comment"
            onSubmit={save}
            onCancel={() => setMode("view")}
            autoFocus
          />
        ) : (
          <p
            className={cn(
              "text-sm leading-relaxed break-words whitespace-pre-wrap",
              comment.status === "sending" && "text-muted-foreground"
            )}
          >
            {comment.body}
          </p>
        )}

        {comment.status === "failed" ? (
          <p className="flex items-center gap-1 text-xs text-destructive">
            Couldn&apos;t post.
            <Button variant="link" size="xs" onClick={() => onRetry(comment)}>
              Retry
            </Button>
            <Button variant="link" size="xs" onClick={remove}>
              Discard
            </Button>
          </p>
        ) : mode === "confirm-delete" ? (
          <p className="flex items-center gap-1 text-xs">
            Delete this comment?
            <Button variant="destructive" size="xs" onClick={remove}>
              Delete
            </Button>
            <Button variant="ghost" size="xs" onClick={() => setMode("view")}>
              Cancel
            </Button>
          </p>
        ) : (
          mode === "view" &&
          comment.status === "sent" && (
            <div className="-ml-2 flex items-center gap-1">
              <VoteButtons comment={comment} onVote={onVote} />
              {canEdit && (
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground"
                  onClick={() => setMode("editing")}
                >
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground"
                  onClick={() => setMode("confirm-delete")}
                >
                  Delete
                </Button>
              )}
            </div>
          )
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </li>
  )
}

/** Upvote, score, downvote. Pressing your current vote again removes it. */
function VoteButtons({
  comment,
  onVote,
}: {
  comment: PostComment
  onVote: (comment: PostComment, value: Vote) => void
}) {
  const up = comment.myVote === 1
  const down = comment.myVote === -1
  return (
    <div className="mr-1 flex items-center" role="group" aria-label="Vote">
      <Button
        variant="ghost"
        size="icon-xs"
        className={cn(up ? "text-primary" : "text-muted-foreground")}
        aria-label="Upvote"
        aria-pressed={up}
        onClick={() => onVote(comment, up ? 0 : 1)}
      >
        {up ? <IconArrowBigUpFilled /> : <IconArrowBigUp />}
      </Button>
      <span
        className="min-w-5 text-center text-xs font-medium tabular-nums"
        aria-label={`Score ${comment.score}`}
        title={`${comment.numUpvotes} up · ${comment.numDownvotes} down`}
      >
        {compact.format(comment.score)}
      </span>
      <Button
        variant="ghost"
        size="icon-xs"
        className={cn(down ? "text-destructive" : "text-muted-foreground")}
        aria-label="Downvote"
        aria-pressed={down}
        onClick={() => onVote(comment, down ? 0 : -1)}
      >
        {down ? <IconArrowBigDownFilled /> : <IconArrowBigDown />}
      </Button>
    </div>
  )
}

function AuthorButton({
  username,
  onOpen,
  className,
  children,
}: {
  username: string
  onOpen?: (username: string) => void
  className?: string
  children: React.ReactNode
}) {
  if (!onOpen) return <span className={className}>{children}</span>
  return (
    <button
      type="button"
      onClick={() => onOpen(username)}
      className={cn("text-left hover:underline", className)}
    >
      {children}
    </button>
  )
}
