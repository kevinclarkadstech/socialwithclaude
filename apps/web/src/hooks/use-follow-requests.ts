import * as React from "react"

import { api } from "@/lib/api"
import type { FollowRequest } from "@/hooks/types"
import { usePagedList } from "@/hooks/use-paged-list"
import { usePolledCount } from "@/hooks/use-polled-count"

/**
 * Your pending follow requests, newest first, a page at a time, with
 * `accept` and `deny` (denying is silent: they keep seeing "Requested").
 * Answered requests leave the list; both resolve to whether it worked.
 */
export function useFollowRequests() {
  const list = usePagedList<FollowRequest>(
    "follow-requests",
    (cursor) => api.users.getMyFollowRequests.query({ cursor }),
    { getId: (request) => request.userId }
  )
  const { updateItems } = list

  const answer = React.useCallback(
    async (username: string, accept: boolean) => {
      try {
        if (accept) await api.users.acceptFollowRequest.mutate({ username })
        else await api.users.denyFollowRequest.mutate({ username })
      } catch {
        return false
      }
      updateItems((items) => items.filter((r) => r.username !== username))
      return true
    },
    [updateItems]
  )

  return {
    ...list,
    accept: React.useCallback(
      (username: string) => answer(username, true),
      [answer]
    ),
    deny: React.useCallback(
      (username: string) => answer(username, false),
      [answer]
    ),
  }
}

/** How many follow requests you have, for the Profile tab badge. */
export function useFollowRequestCount() {
  return usePolledCount(api.users.getMyFollowRequestCount.query)
}
