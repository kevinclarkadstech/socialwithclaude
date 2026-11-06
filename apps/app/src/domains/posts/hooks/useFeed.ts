import { useEffect } from 'react';
import { onPostCreated } from '../postEvents';
import { postStore } from '../postStore';
import { runGetFeedQuery } from '../operations/runGetFeedQuery';
import { usePostList } from './usePostList';

const FEED = 'feed';

/** The Feed: every post and listing, newest first, a page at a time. */
export function useFeed() {
  // A post created on this device goes straight to the top of the feed.
  useEffect(
    () =>
      onPostCreated((post) => {
        postStore.setPosts([post]);
        postStore.updateList(FEED, (list) => ({ ...list, ids: [post.id, ...list.ids.filter((id) => id !== post.id)] }));
      }),
    [],
  );

  return usePostList(FEED, runGetFeedQuery);
}
