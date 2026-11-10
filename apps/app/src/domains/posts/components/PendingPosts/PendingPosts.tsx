import type { PendingPostContent } from '../../pendingPostStore';
import { usePendingPosts } from '../../hooks/usePendingPosts';
import { PendingPostCard } from '../PendingPostCard/PendingPostCard';

interface PendingPostsProps {
  /** Only listings, e.g. on the marketplace. */
  kind?: PendingPostContent['kind'];
}

/** Posts you're sending from this device, at the top of a list until they're posted. */
export function PendingPosts({ kind }: PendingPostsProps) {
  const pending = usePendingPosts(kind);
  return (
    <>
      {pending.map((post) => (
        <PendingPostCard key={post.id} pending={post} />
      ))}
    </>
  );
}
