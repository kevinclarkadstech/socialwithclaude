import * as React from "react"

import { api, apiErrorMessage } from "@/lib/api"
import type { FollowStatus, Profile } from "@/hooks/types"
import { useResource } from "@/hooks/use-resource"

/**
 * A user's profile by username. "not-found" if there's no such user or
 * either of you blocked the other.
 */
export function useProfile(username: string) {
  return useResource<Profile, "not-found">(
    `profile:${username}`,
    () => api.users.getUserProfile.query({ username }),
    (err) => (apiErrorMessage(err) === "NOT_FOUND" ? "not-found" : null)
  )
}

/**
 * Your follow of `profile`, and `toggle` to follow (instant on a public
 * profile, a request on a followers-only one) or undo it (unfollow, or
 * cancel the request). Shown right away and put back if it fails.
 * `followerDelta` is how much their follower count changed here.
 */
export function useFollow(profile: Profile) {
  const [followStatus, setFollowStatus] = React.useState<FollowStatus>(
    profile.followStatus
  )
  const [pending, setPending] = React.useState(false)
  const { username, requiresApproval } = profile

  const toggle = React.useCallback(async () => {
    const previous = followStatus
    const follow = previous === "none"
    setFollowStatus(
      follow ? (requiresApproval ? "requested" : "following") : "none"
    )
    setPending(true)
    try {
      if (follow) {
        const result = await api.users.follow.mutate({ username })
        setFollowStatus(result.followStatus)
      } else {
        await api.users.unfollow.mutate({ username })
      }
    } catch {
      setFollowStatus(previous)
    } finally {
      setPending(false)
    }
  }, [followStatus, requiresApproval, username])

  // Only an accepted follow counts as a follower.
  const followerDelta =
    Number(followStatus === "following") -
    Number(profile.followStatus === "following")

  return { followStatus, pending, toggle, followerDelta }
}
