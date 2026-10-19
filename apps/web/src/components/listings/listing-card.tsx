import { IconPhoto } from "@tabler/icons-react"
import { cn } from "cn"

import { Card } from "@/components/ui/card"
import { formatPrice, type ListingSummary } from "@/lib/listings"
import { fullDateTime, shortTimeAgo } from "@/lib/time"

/** Square photo (or a placeholder), with a badge when pending or sold. */
function ListingPhoto({
  listing,
  className,
}: {
  listing: ListingSummary
  className?: string
}) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {listing.imageUrl ? (
        <img
          src={listing.imageUrl}
          alt=""
          loading="lazy"
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <IconPhoto className="size-8" aria-hidden="true" />
        </div>
      )}
      {listing.status !== "available" && (
        <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white capitalize">
          {listing.status}
        </span>
      )}
    </div>
  )
}

/** "Portland, OR · 3h" (location when there is one, then age). */
function Meta({ listing }: { listing: ListingSummary }) {
  return (
    <span className="truncate text-xs text-muted-foreground">
      {listing.location && `${listing.location} · `}
      <time
        dateTime={listing.createdAt}
        title={fullDateTime(listing.createdAt)}
      >
        {shortTimeAgo(listing.createdAt)}
      </time>
    </span>
  )
}

/** A listing in the grid: photo on top, then price, title and location. */
export function ListingCard({ listing }: { listing: ListingSummary }) {
  return (
    <Card size="sm" className="h-full gap-0 py-0">
      <ListingPhoto listing={listing} className="aspect-square" />
      <div className="flex min-w-0 flex-col gap-0.5 p-3">
        <span className="truncate text-sm font-medium">
          {formatPrice(listing)}
        </span>
        <span className="line-clamp-2 text-sm leading-snug">
          {listing.title}
        </span>
        <Meta listing={listing} />
      </div>
    </Card>
  )
}

/** A listing in the list: photo on the left, details and seller beside it. */
export function ListingRow({
  listing,
  onOpenProfile,
}: {
  listing: ListingSummary
  onOpenProfile?: (username: string) => void
}) {
  return (
    <Card size="sm" className="flex-row gap-0 py-0">
      <ListingPhoto listing={listing} className="size-24 shrink-0 sm:size-28" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-4 py-3">
        <span className="truncate text-sm font-medium">{listing.title}</span>
        <span className="truncate text-sm">{formatPrice(listing)}</span>
        <Meta listing={listing} />
        {onOpenProfile ? (
          <button
            type="button"
            className="self-start truncate text-xs text-muted-foreground hover:underline"
            onClick={() => onOpenProfile(listing.seller.username)}
          >
            @{listing.seller.username}
          </button>
        ) : (
          <span className="truncate text-xs text-muted-foreground">
            @{listing.seller.username}
          </span>
        )}
      </div>
    </Card>
  )
}
