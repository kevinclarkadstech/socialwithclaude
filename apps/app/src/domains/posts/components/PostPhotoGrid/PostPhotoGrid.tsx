import { Photo } from '../../../../common/components/Photo/Photo';
import { openPhotoViewer } from '../../../../common/components/PhotoViewer/photoViewerStore';
import type { DisplayPhoto } from '../../../../lib/photos/displayPhoto';
import { feedAspectRatio } from '../../utils/postPhotoUrl/postPhotoUrl';
import './PostPhotoGrid.css';

/** At most this many tiles; the last says how many more there are. */
const maxTiles = 4;

interface PostPhotoGridProps {
  /** Published, or still on this device while the post is being sent. */
  photos: DisplayPhoto[];
}

/**
 * A post's photos as tiles: one photo in its own shape, two side by side,
 * three as one large and two small, four or more as a 2 × 2 grid with "+N"
 * on the last. Tapping one opens them all full screen.
 */
export function PostPhotoGrid({ photos }: PostPhotoGridProps) {
  if (photos.length === 0) {
    return null;
  }
  const tiles = photos.slice(0, maxTiles);
  const hidden = photos.length - tiles.length;
  const single = photos.length === 1;

  return (
    <div
      className="post-photo-grid"
      data-count={Math.min(photos.length, maxTiles)}
      style={{ aspectRatio: single ? String(feedAspectRatio(photos[0]!)) : '4 / 3' }}
    >
      {tiles.map((photo, index) => (
        <button
          key={photo.key}
          type="button"
          className="post-photo-grid__tile"
          aria-label={`Photo ${index + 1} of ${photos.length}${photo.caption ? `: ${photo.caption}` : ''}`}
          onClick={(event) => {
            // The card opens the post when tapped; a photo opens the viewer instead.
            event.stopPropagation();
            openPhotoViewer({ photos, index });
          }}
        >
          <Photo photo={photo} sizes={single ? '(min-width: 700px) 640px, 100vw' : '(min-width: 700px) 320px, 50vw'} />
          {index === tiles.length - 1 && hidden > 0 && (
            <span className="post-photo-grid__more" aria-hidden="true">+{hidden}</span>
          )}
        </button>
      ))}
    </div>
  );
}
