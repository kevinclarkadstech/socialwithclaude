import * as React from "react"

import {
  getCommentCountOverride,
  subscribeToCommentCounts,
} from "@/lib/comment-counts"

/** A post's comment count, following comments added or removed this session. */
export function useCommentCount(postId: string, initialCount: number) {
  const override = React.useSyncExternalStore(subscribeToCommentCounts, () =>
    getCommentCountOverride(postId)
  )
  return override ?? initialCount
}
