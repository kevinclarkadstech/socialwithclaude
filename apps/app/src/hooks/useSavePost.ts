import { useMutation, type InfiniteData } from '@tanstack/react-query';
import {
  createUserSaveMutation,
  deleteUserSaveMutation,
  type Post,
} from '@myapp/shared/domains';
import type { Page } from '@myapp/shared/common';
import { api } from '../api/trpc';
import { fromApi, runOperationOrThrow } from '../api/runOperation';
import { queryClient } from '../api/queryClient';
import { getCallingUser } from './useCallingUser';
import { feedQueryKey } from './useFeed';

/** Sets a post's saved state in the cached feed. Returns the previous feed, to undo it. */
function setSavedInFeed(postId: string, hasSaved: boolean) {
  const previous = queryClient.getQueryData<InfiniteData<Page<Post>>>(feedQueryKey);
  queryClient.setQueryData<InfiniteData<Page<Post>>>(feedQueryKey, (feed) =>
    feed && {
      ...feed,
      pages: feed.pages.map((page) => ({
        ...page,
        items: page.items.map((post) =>
          post.id === postId && post.viewer.hasSaved !== hasSaved
            ? { ...post, numSaves: post.numSaves + (hasSaved ? 1 : -1), viewer: { ...post.viewer, hasSaved } }
            : post,
        ),
      })),
    },
  );
  return previous;
}

/** Saves or unsaves a post. The feed updates right away and rolls back if it fails. */
export function useSavePost() {
  const mutation = useMutation({
    mutationFn: ({ postId, save }: { postId: string; save: boolean }) => {
      const input = { type: 'post' as const, id: postId };
      return save
        ? runOperationOrThrow(createUserSaveMutation, input, {
            getCallingUser,
            createUserSave: async ({ type, id }) => {
              await fromApi(api.users.save.mutate({ type, id }));
              return true;
            },
          })
        : runOperationOrThrow(deleteUserSaveMutation, input, {
            getCallingUser,
            deleteUserSave: async ({ type, id }) => {
              await fromApi(api.users.unsave.mutate({ type, id }));
              return true;
            },
          });
    },
    onMutate: ({ postId, save }) => ({ previousFeed: setSavedInFeed(postId, save) }),
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(feedQueryKey, context?.previousFeed);
    },
  });

  return {
    setSaved: (post: Post, save: boolean) => mutation.mutate({ postId: post.id, save }),
  };
}
