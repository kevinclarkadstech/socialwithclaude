import * as React from "react"
import { cn } from "cn"
import {
  IconBookmark,
  IconBookmarkFilled,
  IconMessageCircle,
  IconShare3,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { MediaCarousel } from "@/components/media-carousel"
import { UserAvatar } from "@/components/user-avatar"
import { useCommentCount } from "@/hooks/use-comment-count"
import { useSavePost } from "@/hooks/use-save-post"
import { displayName } from "@/lib/people"
import type { api } from "@/lib/api"
import { sharePost } from "@/lib/share"
import { fullDateTime, timeAgo } from "@/lib/time"

export type Post = Awaited<
  ReturnType<typeof api.posts.getFeed.query>
>["items"][number]

const compact = new Intl.NumberFormat(undefined, { notation: "compact" })

/**
 * A post in a feed: author, time, text, photos, and save / comment / share
 * actions. Saving updates immediately and rolls back if the request fails.
 */
export function PostCard({
  post,
  onComment,
  onOpenProfile,
  className,
}: {
  post: Post
  /** Open the post's comments. */
  onComment?: (post: Post) => void
  /** Open the author's profile from their name or avatar. */
  onOpenProfile?: (username: string) => void
  className?: string
}) {
  const {
    saved,
    count: numSaves,
    toggle: toggleSave,
  } = useSavePost(post.id, post.isSaved, post.numSaves)
  const numComments = useCommentCount(post.id, post.numComments)
  const [shareStatus, setShareStatus] = React.useState<"idle" | "copied">(
    "idle"
  )

  async function share() {
    if ((await sharePost(post.id)) === "copied") {
      setShareStatus("copied")
      setTimeout(() => setShareStatus("idle"), 2000)
    }
  }

  const { author } = post

  return (
    <Card size="sm" className={className}>
      <CardHeader className="flex flex-row items-center gap-3">
        <AuthorLink username={author.username} onOpen={onOpenProfile}>
          <UserAvatar person={author} />
        </AuthorLink>
        <div className="flex min-w-0 flex-col text-sm leading-tight">
          <AuthorLink
            username={author.username}
            onOpen={onOpenProfile}
            className="truncate font-medium"
          >
            {displayName(author)}
          </AuthorLink>
          <span className="truncate text-muted-foreground">
            @{author.username} ·{" "}
            <time
              dateTime={post.createdAt}
              title={fullDateTime(post.createdAt)}
            >
              {timeAgo(post.createdAt)}
            </time>
          </span>
        </div>
      </CardHeader>

      {post.body && (
        <CardContent>
          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
            {post.body}
          </p>
        </CardContent>
      )}

      {post.media.length > 0 && <MediaCarousel media={post.media} />}

      <CardFooter className="gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onComment?.(post)}
          aria-label={`Comments (${numComments})`}
        >
          <IconMessageCircle />
          {compact.format(numComments)}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSave}
          aria-pressed={saved}
          aria-label={`${saved ? "Unsave" : "Save"} (${numSaves})`}
        >
          {saved ? <IconBookmarkFilled /> : <IconBookmark />}
          {compact.format(numSaves)}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={share}
          aria-label="Share"
        >
          <IconShare3 />
          {shareStatus === "copied" ? "Link copied" : "Share"}
        </Button>
      </CardFooter>
    </Card>
  )
}

/** The author's avatar or name: a button to their profile when it can open. */
function AuthorLink({
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
