import type { GetUserProfileQueryOutput, UserPostsType } from '@myapp/shared/domains';
import { useCallback, useEffect } from 'react';
import { useEntityList } from '../../../lib/stores/useEntityList';
import { onPostCreated } from '../postEvents';
import { postStore } from '../postStore';
import { runGetUserPostsQuery } from '../operations/runGetUserPostsQuery';

/** The postStore list of a user's posts (that aren't listings) or listings. */
export const userPostsListKey = (username: string, type: UserPostsType) => `user:${username}:${type}`;

/**
 * A profile's posts or listings, newest first, a page at a time. Only loads
 * when the viewer may see them (profile.viewer.canSeePosts).
 */
export function useUserPosts({ profile, type }: { profile: GetUserProfileQueryOutput | null; type: UserPostsType }) {
  const key = profile ? userPostsListKey(profile.username, type) : 'user:none';

  // Something you post goes straight to the top of your own profile.
  useEffect(
    () =>
      onPostCreated((post) => {
        if (!profile || post.createdBy !== profile.userId || Boolean(post.listing) !== (type === 'listings')) {
          return;
        }
        postStore.updateList(key, (list) => ({ ...list, ids: [post.id, ...list.ids.filter((id) => id !== post.id)] }));
      }),
    [profile, type, key],
  );

  const fetchPage = useCallback(
    ({ cursor }: { cursor: string | null }) => runGetUserPostsQuery({ profile: profile!, type, cursor }),
    [profile, type],
  );
  return useEntityList(postStore, key, fetchPage, { enabled: Boolean(profile?.viewer.canSeePosts) });
}
