import * as React from "react"

/**
 * One thing loaded from the API: "loading", "ready" with `data`, or
 * "failed" with a `reason` from `classify` (e.g. "not-found"; anything it
 * doesn't recognise is "error").
 */
export type Resource<T, Failure extends string = never> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "failed"; reason: Failure | "error" }

/**
 * Loads `fetch()` once per `key`, and again when the key changes (until it
 * arrives, the old result isn't shown). `classify` turns a thrown error into
 * a failure reason, or null for a plain "error".
 */
export function useResource<T, Failure extends string = never>(
  key: string,
  fetch: () => Promise<T>,
  classify?: (err: unknown) => Failure | null
): Resource<T, Failure> {
  const [result, setResult] = React.useState<
    { key: string } & Resource<T, Failure>
  >()
  // The latest functions, without reloading when the caller re-renders.
  const fetchRef = React.useRef({ fetch, classify })
  React.useEffect(() => {
    fetchRef.current = { fetch, classify }
  })

  React.useEffect(() => {
    let cancelled = false
    const { fetch, classify } = fetchRef.current
    fetch()
      .then((data) => !cancelled && setResult({ key, status: "ready", data }))
      .catch(
        (err) =>
          !cancelled &&
          setResult({
            key,
            status: "failed",
            reason: classify?.(err) ?? "error",
          })
      )
    return () => {
      cancelled = true
    }
  }, [key])

  if (result?.key !== key) return { status: "loading" }
  return result
}
