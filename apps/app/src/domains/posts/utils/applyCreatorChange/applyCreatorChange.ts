import type { UserProfileSummary } from '@myapp/shared/domains';
import { postCommentStore } from '../../postCommentStore';
import { postStore } from '../../postStore';

/**
 * After someone changes their profile (name, username, avatar), shows the
 * change on their posts and comments already on screen, without reloading
 * them. updatedAt is what versions their avatar's URL.
 */
export function applyCreatorChange(profile: UserProfileSummary) {
  const changes = {
    username: profile.username,
    firstName: profile.firstName,
    lastName: profile.lastName,
    updatedAt: profile.updatedAt,
  };
  postStore.updateAll((post) => (post.createdBy === profile.userId ? { ...post, creator: { ...post.creator, ...changes } } : post));
  postCommentStore.updateAll((comment) =>
    comment.createdBy === profile.userId ? { ...comment, creator: { ...comment.creator, ...changes } } : comment,
  );
}
