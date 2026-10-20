import * as React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { UserAvatar } from "@/components/user-avatar"
import { api } from "@/lib/api"
import { displayName } from "@/lib/people"
import { shortTimeAgo } from "@/lib/time"

type Request = Awaited<
  ReturnType<typeof api.users.getMyFollowRequests.query>
>["items"][number]

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; requests: Request[]; nextCursor: string | null }

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
  const [state, setState] = React.useState<State>({ status: "loading" })
  const [loadingMore, setLoadingMore] = React.useState(false)
  // Requests being answered, so their buttons are disabled.
  const [busy, setBusy] = React.useState<Set<string>>(new Set())
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    api.users.getMyFollowRequests
      .query({})
      .then(
        (page) =>
          !cancelled &&
          setState({
            status: "ready",
            requests: page.items,
            nextCursor: page.nextCursor,
          })
      )
      .catch(() => !cancelled && setState({ status: "error" }))
    return () => {
      cancelled = true
    }
  }, [])

  async function loadMore() {
    if (state.status !== "ready" || !state.nextCursor) return
    setLoadingMore(true)
    try {
      const page = await api.users.getMyFollowRequests.query({
        cursor: state.nextCursor,
      })
      setState((prev) =>
        prev.status === "ready"
          ? {
              ...prev,
              requests: [...prev.requests, ...page.items],
              nextCursor: page.nextCursor,
            }
          : prev
      )
    } finally {
      setLoadingMore(false)
    }
  }

  async function answer(request: Request, accept: boolean) {
    const { username } = request
    setError(null)
    setBusy((b) => new Set(b).add(username))
    try {
      if (accept) await api.users.acceptFollowRequest.mutate({ username })
      else await api.users.denyFollowRequest.mutate({ username })
      setState((prev) =>
        prev.status === "ready"
          ? {
              ...prev,
              requests: prev.requests.filter((r) => r.username !== username),
            }
          : prev
      )
      if (accept) onAccepted?.()
      onChanged?.()
    } catch {
      setError(
        `Couldn't ${accept ? "accept" : "deny"} @${username}'s request. Please try again.`
      )
    } finally {
      setBusy((b) => {
        const next = new Set(b)
        next.delete(username)
        return next
      })
    }
  }

  if (state.status !== "ready" || state.requests.length === 0) return null

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">
          Follow requests{" "}
          <span className="text-muted-foreground">
            {state.requests.length}
            {state.nextCursor && "+"}
          </span>
        </h2>
        <ul className="flex flex-col gap-3">
          {state.requests.map((request) => (
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
        {state.nextCursor && (
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
