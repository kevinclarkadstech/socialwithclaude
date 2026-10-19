import * as React from "react"
import { cn } from "cn"

/** The fields a photo needs to be shown. */
export type CarouselMedia = {
  id: string
  url: string
  altText: string | null
  width: number | null
  height: number | null
}

/** The photo's own shape, kept between 4:5 (tall) and 1.91:1 (wide). */
function aspectRatio(media: CarouselMedia) {
  if (!media.width || !media.height) return 1
  return Math.min(Math.max(media.width / media.height, 4 / 5), 1.91)
}

/**
 * One photo, or a swipeable row of photos sized by the first one (between
 * 4:5 and 1.91:1), with a "2/5" counter.
 */
export function MediaCarousel({
  media,
  className,
}: {
  media: CarouselMedia[]
  className?: string
}) {
  const [index, setIndex] = React.useState(0)

  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    const el = event.currentTarget
    setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <div className={cn("relative", className)}>
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
