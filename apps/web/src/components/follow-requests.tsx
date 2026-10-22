import * as React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { UserAvatar } from "@/components/user-avatar"
import type { FollowRequest } from "@/hooks/types"
import { useFollowRequests } from "@/hooks/use-follow-requests"
import { displayName } from "@/lib/people"
import { shortTimeAgo } from "@/lib/time"

/**
 * Your pending follow requests (only asked for when your profile is
 * followers-only), newest first, with Accept and Deny. Denying is silent:
 * they keep seeing "Requested". Hidden when there are none.
 */
export function FollowRequests({
  onOpenProfile,
  onAccepted,
  onChanged,
}: {
  onOpenProfile: (username: string) => void
  /** Called when a request is accepted (a new follower). */
  onAccepted?: () => void
  /** Called after any accept or deny (to refresh the request badge). */
  onChanged?: () => void
}) {
  const { state, loadingMore, loadMore, accept, deny } = useFollowRequests()
  // Requests being answered, so their buttons are disabled.
  const [busy, setBusy] = React.useState<Set<string>>(new Set())
  const [error, setError] = React.useState<string | null>(null)

  async function answer(request: FollowRequest, accepting: boolean) {
    const { username } = request
    setError(null)
    setBusy((b) => new Set(b).add(username))
    const ok = await (accepting ? accept : deny)(username)
    setBusy((b) => {
      const next = new Set(b)
      next.delete(username)
      return next
    })
    if (!ok) {
      setError(
        `Couldn't ${accepting ? "accept" : "deny"} @${username}'s request. Please try again.`
      )
      return
    }
    if (accepting) onAccepted?.()
    onChanged?.()
  }

  if (state.status !== "ready" || state.items.length === 0) return null

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">
          Follow requests{" "}
          <span className="text-muted-foreground">
            {state.items.length}
            {state.hasMore && "+"}
          </span>
        </h2>
        <ul className="flex flex-col gap-3">
          {state.items.map((request) => (
            <li key={request.userId} className="flex items-center gap-3">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                onClick={() => onOpenProfile(request.username)}
              >
                <UserAvatar person={request} />
                <span className="flex min-w-0 flex-col text-sm leading-tight">
                  <span className="truncate font-medium hover:underline">
                    {displayName(request)}
                  </span>
                  <span className="truncate text-muted-foreground">
                    @{request.username} · {shortTimeAgo(request.requestedAt)}
                  </span>
                </span>
              </button>
              <Button
                size="sm"
                onClick={() => answer(request, true)}
                disabled={busy.has(request.username)}
                aria-label={`Accept @${request.username}`}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => answer(request, false)}
                disabled={busy.has(request.username)}
                aria-label={`Deny @${request.username}`}
              >
                Deny
              </Button>
            </li>
          ))}
        </ul>
        {state.hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading…" : "More requests"}
          </Button>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
