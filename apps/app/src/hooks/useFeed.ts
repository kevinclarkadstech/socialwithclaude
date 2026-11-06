import { useInfiniteQuery } from '@tanstack/react-query';
import { getFeedQuery } from '@myapp/shared/domains';
import { api } from '../api/trpc';
import { fromApi, runOperationOrThrow } from '../api/runOperation';
import { getCallingUser } from './useCallingUser';

export const feedQueryKey = ['feed'] as const;

/** The Feed: every post and listing, newest first, a page at a time. */
export function useFeed() {
  const query = useInfiniteQuery({
    queryKey: feedQueryKey,
    queryFn: ({ pageParam }) =>
      runOperationOrThrow(
        getFeedQuery,
        { cursor: pageParam, limit: 20 },
        {
          getCallingUser,
          // The API works out what the viewer sees, so viewerId isn't sent.
          getPosts: ({ cursor, limit }) => fromApi(api.posts.getFeed.query({ cursor, limit })),
        },
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  return {
    posts: query.data?.pages.flatMap((page) => page.items) ?? [],
    isPending: query.isPending,
    isError: query.isError,
    hasMore: query.hasNextPage,
    loadMore: query.fetchNextPage,
    refresh: query.refetch,
  };
}
