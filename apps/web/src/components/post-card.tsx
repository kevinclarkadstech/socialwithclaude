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
import { UserAvatar } from "@/components/user-avatar"
import { displayName } from "@/lib/people"
import { api } from "@/lib/api"
import { fullDateTime, timeAgo } from "@/lib/time"

export type Post = Awaited<
  ReturnType<typeof api.posts.getFeed.query>
>["items"][number]
type Media = Post["media"][number]

const compact = new Intl.NumberFormat(undefined, { notation: "compact" })

/** Where a post can be shared from. There's no post page yet. */
function postUrl(postId: string) {
  return `${window.location.origin}/posts/${postId}`
}

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
  /** Open the comments (there's no comments view yet). */
  onComment?: (post: Post) => void
  /** Open the author's profile from their name or avatar. */
  onOpenProfile?: (username: string) => void
  className?: string
}) {
  const [saved, setSaved] = React.useState(post.isSaved)
  const [numSaves, setNumSaves] = React.useState(post.numSaves)
  const [shareStatus, setShareStatus] = React.useState<"idle" | "copied">(
    "idle"
  )

  async function toggleSave() {
    const next = !saved
    setSaved(next)
    setNumSaves((n) => n + (next ? 1 : -1))
    try {
      if (next) await api.posts.savePost.mutate({ id: post.id })
      else await api.posts.unsavePost.mutate({ id: post.id })
    } catch {
      setSaved(!next)
      setNumSaves((n) => n + (next ? -1 : 1))
    }
  }

  async function share() {
    const url = postUrl(post.id)
    if (navigator.share) {
      // Cancelling the share sheet rejects; nothing to do.
      await navigator.share({ url }).catch(() => {})
      return
    }
    await navigator.clipboard.writeText(url)
    setShareStatus("copied")
    setTimeout(() => setShareStatus("idle"), 2000)
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

      {post.media.length > 0 && <PostMedia media={post.media} />}

      <CardFooter className="gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onComment?.(post)}
          aria-label={`Comments (${post.numComments})`}
        >
          <IconMessageCircle />
          {compact.format(post.numComments)}
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

/** The photo's own shape, kept between 4:5 (tall) and 1.91:1 (wide). */
function aspectRatio(media: Media) {
  if (!media.width || !media.height) return 1
  return Math.min(Math.max(media.width / media.height, 4 / 5), 1.91)
}

/** One photo, or a swipeable row of photos sized by the first one. */
function PostMedia({ media }: { media: Media[] }) {
  const [index, setIndex] = React.useState(0)

  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    const el = event.currentTarget
    setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <div className="relative">
      <div
        className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto"
        style={{ aspectRatio: aspectRatio(media[0]!) }}
        onScroll={media.length > 1 ? handleScroll : undefined}
      >
        {media.map((item) => (
          <img
            key={item.id}
            src={item.url}
            alt={item.altText ?? ""}
            loading="lazy"
            className="h-full w-full shrink-0 snap-center bg-muted object-cover"
          />
        ))}
      </div>
      {media.length > 1 && (
        <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
          {index + 1}/{media.length}
        </span>
      )}
    </div>
  )
}
