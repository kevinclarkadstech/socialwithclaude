import * as React from "react"
import {
  IconArrowLeft,
  IconBookmark,
  IconBookmarkFilled,
  IconMessageCircle,
  IconPhoto,
  IconShare3,
} from "@tabler/icons-react"

import { PostComments } from "@/components/comments/post-comments"
import { MediaCarousel } from "@/components/media-carousel"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { UserAvatar } from "@/components/user-avatar"
import { useSavePost } from "@/hooks/use-save-post"
import { api, apiErrorMessage } from "@/lib/api"
import { formatPrice } from "@/lib/listings"
import { displayName, type PersonSummary } from "@/lib/people"
import { sharePost } from "@/lib/share"
import { fullDateTime, timeAgo } from "@/lib/time"

type Post = NonNullable<Awaited<ReturnType<typeof api.posts.getPostById.query>>>
type Listing = Post & { listing: NonNullable<Post["listing"]> }
type ListingStatus = Listing["listing"]["status"]

type State =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error" }
  | { status: "ready"; listing: Listing }

const compact = new Intl.NumberFormat(undefined, { notation: "compact" })

const STATUS_LABELS: Record<ListingStatus, string> = {
  available: "Available",
  pending: "Pending",
  sold: "Sold",
}

/**
 * One listing: all its photos, price, details and description, the seller,
 * Save / Share / Message seller, and comments. On your own listing, Message
 * is replaced by a status picker (available, pending, sold).
 */
export function ListingDetailPage({
  listingId,
  me,
  onBack,
  onOpenProfile,
  onMessage,
}: {
  listingId: string
  me: PersonSummary & { userId: string }
  onBack: () => void
  onOpenProfile: (username: string) => void
  /** Open (or start) a chat with the seller; rejects if that fails. */
  onMessage: (seller: PersonSummary) => Promise<void>
}) {
  const [state, setState] = React.useState<State>({ status: "loading" })

  React.useEffect(() => {
    let cancelled = false
    api.posts.getPostById
      .query({ id: listingId })
      .then((post) => {
        if (cancelled) return
        setState(
          post.listing
            ? { status: "ready", listing: post as Listing }
            : { status: "not-found" }
        )
      })
      .catch((err) => {
        if (cancelled) return
        setState({
          status:
            apiErrorMessage(err) === "POST_NOT_FOUND" ? "not-found" : "error",
        })
      })
    return () => {
      cancelled = true
    }
  }, [listingId])

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" className="self-start" onClick={onBack}>
        <IconArrowLeft />
        Back
      </Button>
      {state.status === "ready" ? (
        <>
          <ListingDetail
            listing={state.listing}
            isMine={state.listing.author.userId === me.userId}
            onOpenProfile={onOpenProfile}
            onMessage={onMessage}
          />
          <Card size="sm">
            <CardContent>
              <PostComments
                postId={state.listing.id}
                postAuthorId={state.listing.author.userId}
                numComments={state.listing.numComments}
                me={me}
                onOpenProfile={onOpenProfile}
              />
            </CardContent>
          </Card>
        </>
      ) : state.status === "loading" ? null : (
        <p className="text-center text-sm text-muted-foreground">
          {state.status === "not-found"
            ? "This listing isn't available."
            : "Couldn't load this listing."}
        </p>
      )}
    </div>
  )
}

function ListingDetail({
  listing,
  isMine,
  onOpenProfile,
  onMessage,
}: {
  listing: Listing
  isMine: boolean
  onOpenProfile: (username: string) => void
  onMessage: (seller: PersonSummary) => Promise<void>
}) {
  const details = listing.listing
  const [status, setStatus] = React.useState<ListingStatus>(details.status)
  const { saved, count, toggle } = useSavePost(
    listing.id,
    listing.isSaved,
    listing.numSaves
  )
  const [shareStatus, setShareStatus] = React.useState<"idle" | "copied">(
    "idle"
  )
  const [messaging, setMessaging] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function share() {
    if ((await sharePost(listing.id, details.title)) === "copied") {
      setShareStatus("copied")
      setTimeout(() => setShareStatus("idle"), 2000)
    }
  }

  async function message() {
    setMessaging(true)
    setError(null)
    try {
      await onMessage(listing.author)
    } catch {
      setError("Couldn't open the chat. Please try again.")
      setMessaging(false)
    }
  }

  async function changeStatus(next: ListingStatus) {
    const previous = status
    setStatus(next)
    setError(null)
    try {
      await api.listings.setListingStatus.mutate({
        id: listing.id,
        status: next,
      })
    } catch {
      setStatus(previous)
      setError("Couldn't update the status. Please try again.")
    }
  }

  const facts = [
    details.condition && (details.condition === "new" ? "New" : "Used"),
    details.location,
  ].filter(Boolean)

  return (
    <Card className="gap-0 py-0 md:grid md:grid-cols-2 md:items-start">
      {listing.media.length > 0 ? (
        <MediaCarousel media={listing.media} className="bg-muted" />
      ) : (
        <div className="flex aspect-square items-center justify-center bg-muted text-muted-foreground">
          <IconPhoto className="size-10" aria-hidden="true" />
        </div>
      )}

      <CardContent className="flex flex-col gap-4 py-6">
        <div className="flex flex-col gap-1">
          {status !== "available" && (
            <span className="self-start rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-background">
              {STATUS_LABELS[status]}
            </span>
          )}
          <h1 className="text-xl font-medium">{details.title}</h1>
          <p className="text-lg">{formatPrice(details)}</p>
          <p className="text-sm text-muted-foreground">
            {facts.length > 0 && `${facts.join(" · ")} · `}
            Listed{" "}
            <time
              dateTime={listing.createdAt}
              title={fullDateTime(listing.createdAt)}
            >
              {timeAgo(listing.createdAt)}
            </time>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isMine ? (
            <Field className="w-auto min-w-40">
              <FieldLabel htmlFor="listing-status" className="sr-only">
                Status
              </FieldLabel>
              <NativeSelect
                id="listing-status"
                value={status}
                onChange={(event) =>
                  changeStatus(event.target.value as ListingStatus)
                }
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <NativeSelectOption key={value} value={value}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          ) : (
            <Button onClick={message} disabled={messaging}>
              <IconMessageCircle />
              Message seller
            </Button>
          )}
          <Button
            variant="outline"
            onClick={toggle}
            aria-pressed={saved}
            aria-label={`${saved ? "Unsave" : "Save"} (${count})`}
          >
            {saved ? <IconBookmarkFilled /> : <IconBookmark />}
            {saved ? "Saved" : "Save"}
            {count > 0 && (
              <span className="text-muted-foreground">
                {compact.format(count)}
              </span>
            )}
          </Button>
          <Button variant="outline" onClick={share}>
            <IconShare3 />
            {shareStatus === "copied" ? "Link copied" : "Share"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}

        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
          {listing.body}
        </p>

        <button
          type="button"
          onClick={() => onOpenProfile(listing.author.username)}
          className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3 text-left hover:bg-muted"
        >
          <UserAvatar person={listing.author} />
          <span className="flex min-w-0 flex-col text-sm leading-tight">
            <span className="truncate font-medium">
              {displayName(listing.author)}
            </span>
            <span className="truncate text-muted-foreground">
              @{listing.author.username} · Seller
            </span>
          </span>
        </button>
      </CardContent>
    </Card>
  )
}
