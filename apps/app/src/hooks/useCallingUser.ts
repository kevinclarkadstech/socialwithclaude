import { queryOptions, useQuery } from '@tanstack/react-query';
import { getMeQuery, type CallingUser } from '@myapp/shared/domains';
import { api } from '../api/trpc';
import { fromApi, runOperationOrThrow } from '../api/runOperation';
import { queryClient } from '../api/queryClient';

export const callingUserQueryOptions = queryOptions({
  queryKey: ['callingUser'],
  queryFn: () =>
    runOperationOrThrow(getMeQuery, {}, { getCallingUser: () => fromApi(api.users.me.query()) }),
  staleTime: 5 * 60_000,
});

/**
 * The getCallingUser dependency for shared queries and mutations on the
 * client: the signed-in user from the cache, or null when signed out.
 */
export function getCallingUser(): Promise<CallingUser | null> {
  return queryClient.fetchQuery(callingUserQueryOptions);
}

/**
 * Who's signed in. `callingUser` is null when signed out; its `profile` is
 * null until sign-up is finished.
 */
export function useCallingUser() {
  const { data, isPending } = useQuery(callingUserQueryOptions);
  return { callingUser: data ?? null, isPending };
}
