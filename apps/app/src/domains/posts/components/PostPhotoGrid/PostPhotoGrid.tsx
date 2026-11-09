import type { PostMedia } from '@myapp/shared/domains';
import { openPhotoViewer } from '../../../media/components/PhotoViewer/photoViewerStore';
import { feedAspectRatio, toViewerPhotos } from '../../utils/postPhotoUrl';
import { PostPhoto } from '../PostPhoto/PostPhoto';
import './PostPhotoGrid.css';

/** At most this many tiles; the last says how many more there are. */
const maxTiles = 4;

interface PostPhotoGridProps {
  media: PostMedia[];
}

/**
 * A post's photos as tiles: one photo in its own shape, two side by side,
 * three as one large and two small, four or more as a 2 × 2 grid with "+N"
 * on the last. Tapping one opens them all full screen.
 */
export function PostPhotoGrid({ media }: PostPhotoGridProps) {
  if (media.length === 0) {
    return null;
  }
  const tiles = media.slice(0, maxTiles);
  const hidden = media.length - tiles.length;
  const single = media.length === 1;

  return (
    <div
      className="post-photo-grid"
      data-count={Math.min(media.length, maxTiles)}
      style={{ aspectRatio: single ? String(feedAspectRatio(media[0]!)) : '4 / 3' }}
    >
      {tiles.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className="post-photo-grid__tile"
          aria-label={`Photo ${index + 1} of ${media.length}${item.caption ? `: ${item.caption}` : ''}`}
          onClick={(event) => {
            // The card opens the post when tapped; a photo opens the viewer instead.
            event.stopPropagation();
            openPhotoViewer({ photos: toViewerPhotos(media), index });
          }}
        >
          <PostPhoto media={item} sizes={single ? '(min-width: 700px) 640px, 100vw' : '(min-width: 700px) 320px, 50vw'} />
          {index === tiles.length - 1 && hidden > 0 && (
            <span className="post-photo-grid__more" aria-hidden="true">+{hidden}</span>
          )}
        </button>
      ))}
    </div>
  );
}
