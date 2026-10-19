import * as React from "react"

import { api } from "@/lib/api"
import {
  getSavedOverride,
  setSavedOverride,
  subscribeToSaves,
} from "@/lib/saved-posts"

/**
 * Save / unsave a post (posts and listings alike). Updates right away, rolls
 * back if the request fails, and stays in sync with every other place the
 * post is shown. `count` is the save count adjusted for changes made here.
 */
export function useSavePost(
  postId: string,
  initialSaved: boolean,
  initialCount = 0
) {
  const override = React.useSyncExternalStore(subscribeToSaves, () =>
    getSavedOverride(postId)
  )
  const saved = override ?? initialSaved
  const count = initialCount + (Number(saved) - Number(initialSaved))

  const toggle = React.useCallback(async () => {
    const next = !(getSavedOverride(postId) ?? initialSaved)
    setSavedOverride(postId, next)
    try {
      if (next) await api.posts.savePost.mutate({ id: postId })
      else await api.posts.unsavePost.mutate({ id: postId })
    } catch {
      setSavedOverride(postId, !next)
    }
  }, [postId, initialSaved])

  return { saved, count, toggle }
}
