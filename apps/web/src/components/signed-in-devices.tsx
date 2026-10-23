import * as React from "react"
import {
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDeviceTablet,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { SignedInSession } from "@/hooks/types"
import { useSessions } from "@/hooks/use-sessions"
import { fullDateTime, timeAgo } from "@/lib/time"
import { describeUserAgent } from "@/lib/user-agent"

function DeviceIcon({ description }: { description: string }) {
  const Icon = /iPhone|Android/.test(description)
    ? IconDeviceMobile
    : /iPad/.test(description)
      ? IconDeviceTablet
      : IconDeviceDesktop
  return (
    <Icon
      className="size-5 shrink-0 text-muted-foreground"
      aria-hidden="true"
    />
  )
}

/**
 * Where you're signed in: this device first, then your others with a Sign
 * out button each, and "Sign out of all other devices" (which asks first).
 */
export function SignedInDevices() {
  const { state, signOutDevice, signOutOtherDevices } = useSessions()
  // Sessions being signed out, so their buttons are disabled.
  const [busy, setBusy] = React.useState<Set<string>>(new Set())
  const [confirmingAll, setConfirmingAll] = React.useState(false)
  const [signingOutAll, setSigningOutAll] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  if (state.status !== "ready") {
    return state.status === "failed" ? (
      <p className="text-center text-sm text-muted-foreground">
        Couldn&apos;t load where you&apos;re signed in.
      </p>
    ) : null
  }

  const current = state.data.filter((s) => s.current)
  const others = state.data.filter((s) => !s.current)

  async function signOut(session: SignedInSession) {
    setError(null)
    setBusy((b) => new Set(b).add(session.id))
    const ok = await signOutDevice(session.id)
    setBusy((b) => {
      const next = new Set(b)
      next.delete(session.id)
      return next
    })
    if (!ok) setError("Couldn't sign that device out. Please try again.")
  }

  async function signOutAll() {
    setError(null)
    setSigningOutAll(true)
    const ok = await signOutOtherDevices()
    setSigningOutAll(false)
    setConfirmingAll(false)
    if (!ok) setError("Couldn't sign your other devices out. Please try again.")
  }

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Where you&apos;re signed in</h2>
        <ul className="flex flex-col gap-3">
          {[...current, ...others].map((session) => {
            const description = describeUserAgent(session.userAgent)
            return (
              <li key={session.id} className="flex items-center gap-3">
                <DeviceIcon description={description} />
                <span className="flex min-w-0 flex-1 flex-col text-sm leading-tight">
                  <span className="truncate font-medium">{description}</span>
                  <span className="truncate text-muted-foreground">
                    {session.current ? (
                      "This device"
                    ) : (
                      <>
                        Signed in{" "}
                        <time
                          dateTime={session.createdAt}
                          title={fullDateTime(session.createdAt)}
                        >
                          {timeAgo(session.createdAt)}
                        </time>
                      </>
                    )}
                  </span>
                </span>
                {!session.current && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => signOut(session)}
                    disabled={busy.has(session.id) || signingOutAll}
                    aria-label={`Sign out ${description}, signed in ${timeAgo(session.createdAt)}`}
                  >
                    Sign out
                  </Button>
                )}
              </li>
            )
          })}
        </ul>

        {others.length > 1 &&
          (confirmingAll ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              Sign out of all {others.length} other devices?
              <Button
                size="sm"
                variant="destructive"
                onClick={signOutAll}
                disabled={signingOutAll}
              >
                Sign out all
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmingAll(false)}
                disabled={signingOutAll}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => setConfirmingAll(true)}
            >
              Sign out of all other devices
            </Button>
          ))}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
