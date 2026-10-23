import * as React from "react"

import { api, apiErrorMessage } from "@/lib/api"
import type { SignedInSession } from "@/hooks/types"
import { useResource, type Resource } from "@/hooks/use-resource"

/**
 * Where you're signed in: your devices and browsers, most recently active
 * first (`current` is this one), with `signOutDevice` for one of the others
 * and `signOutOtherDevices` for all of them. Signed-out devices leave the
 * list; both resolve to whether it worked.
 */
export function useSessions() {
  const sessions = useResource<SignedInSession[]>("sessions", () =>
    api.auth.getMySessions.query()
  )
  // Signed out from here: hidden without reloading the list.
  const [removed, setRemoved] = React.useState<{
    ids: Set<string>
    allOthers: boolean
  }>({ ids: new Set(), allOthers: false })

  const signOutDevice = React.useCallback(async (id: string) => {
    try {
      await api.auth.revokeSession.mutate({ id })
    } catch (err) {
      // Already signed out (or expired): it's gone either way.
      if (apiErrorMessage(err) !== "SESSION_NOT_FOUND") return false
    }
    setRemoved((r) => ({ ...r, ids: new Set(r.ids).add(id) }))
    return true
  }, [])

  const signOutOtherDevices = React.useCallback(async () => {
    try {
      await api.auth.revokeOtherSessions.mutate()
    } catch {
      return false
    }
    setRemoved((r) => ({ ...r, allOthers: true }))
    return true
  }, [])

  const state: Resource<SignedInSession[]> =
    sessions.status === "ready"
      ? {
          status: "ready",
          data: sessions.data.filter(
            (s) => s.current || (!removed.allOthers && !removed.ids.has(s.id))
          ),
        }
      : sessions

  return { state, signOutDevice, signOutOtherDevices }
}
