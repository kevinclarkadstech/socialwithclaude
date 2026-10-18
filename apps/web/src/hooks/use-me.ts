import * as React from "react"

import { api } from "@/lib/api"

export type Me = NonNullable<Awaited<ReturnType<typeof api.users.me.query>>>

type Result = { key: string } & (
  | { status: "error" }
  | { status: "ready"; me: Me | null }
)

/**
 * The signed-in user and their profile (`me.profile` is null until
 * onboarding is done). Reloads when `userId` changes; call `reload` after
 * onboarding.
 */
export function useMe(userId: string) {
  const [version, setVersion] = React.useState(0)
  const [result, setResult] = React.useState<Result | null>(null)
  // Which request the current render wants; a result for another is stale.
  const key = `${userId}:${version}`

  React.useEffect(() => {
    let cancelled = false
    api.users.me
      .query()
      .then((me) => !cancelled && setResult({ key, status: "ready", me }))
      .catch(() => !cancelled && setResult({ key, status: "error" }))
    return () => {
      cancelled = true
    }
  }, [key])

  const reload = React.useCallback(() => setVersion((v) => v + 1), [])
  if (result?.key !== key) return { status: "loading" as const, reload }
  return { ...result, reload }
}
