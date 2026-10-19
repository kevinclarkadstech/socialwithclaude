import * as React from "react"
import { monotonicFactory } from "ulid"

import { api, apiErrorMessage } from "@/lib/api"

type ServerMessage = Awaited<
  ReturnType<typeof api.chats.getMessages.query>
>["items"][number]

/** A message as shown: from the server, or one of ours still sending/failed. */
export type ChatMessage = ServerMessage & {
  status: "sent" | "sending" | "failed"
}

/** New messages are checked for this often while the chat is open. */
const POLL_MS = 4000

const ulid = monotonicFactory()

type State =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error" }
  | {
      status: "ready"
      /** Oldest first. */
      messages: ChatMessage[]
      /** Cursor for older messages; null when the start is loaded. */
      olderCursor: string | null
    }

const sent = (m: ServerMessage): ChatMessage => ({ ...m, status: "sent" })

/** Server pages are newest first; the list is oldest first. */
const oldestFirst = (items: ServerMessage[]) => items.map(sent).reverse()

/**
 * Messages in a chat, kept up to date by polling, with optimistic sending.
 * Sends use a client id, so retrying a failed one never doubles it. Marks
 * the chat read when new messages arrive while it's open, then calls `onRead`.
 */
export function useChatMessages(
  chatId: string,
  myUserId: string,
  onRead?: () => void
) {
  // Latest onRead without restarting polling when the caller re-renders.
  const onReadRef = React.useRef(onRead)
  React.useEffect(() => {
    onReadRef.current = onRead
  })

  const [state, setState] = React.useState<State>({ status: "loading" })
  const [loadingOlder, setLoadingOlder] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    // Newest message from someone else that's been marked read.
    let lastReadId: string | null = null

    async function fetchLatest(first: boolean) {
      try {
        const page = await api.chats.getMessages.query({ chatId })
        if (cancelled) return
        setState((prev) => mergeLatest(prev, page.items, page.nextCursor))

        const newestFromOthers =
          page.items.find((m) => m.senderId !== myUserId)?.id ?? null
        if (first || newestFromOthers !== lastReadId) {
          lastReadId = newestFromOthers
          api.chats.markRead
            .mutate({ chatId })
            .then(() => onReadRef.current?.())
            .catch(() => {})
        }
      } catch (err) {
        if (cancelled) return
        if (apiErrorMessage(err) === "CHAT_NOT_FOUND") {
          setState({ status: "not-found" })
        } else if (first) {
          setState({ status: "error" })
        }
        // A failed poll keeps what's shown; the next one tries again.
      }
    }

    fetchLatest(true)
    const timer = setInterval(() => {
      if (!document.hidden) fetchLatest(false)
    }, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [chatId, myUserId])

  const loadOlder = React.useCallback(async () => {
    if (state.status !== "ready" || !state.olderCursor) return
    setLoadingOlder(true)
    try {
      const page = await api.chats.getMessages.query({
        chatId,
        cursor: state.olderCursor,
      })
      setState((prev) =>
        prev.status === "ready"
          ? {
              ...prev,
              messages: [...oldestFirst(page.items), ...prev.messages],
              olderCursor: page.nextCursor,
            }
          : prev
      )
    } finally {
      setLoadingOlder(false)
    }
  }, [chatId, state])

  const deliver = React.useCallback(
    async (message: ChatMessage) => {
      const setStatus = (status: ChatMessage["status"]) =>
        setState((prev) =>
          prev.status === "ready"
            ? {
                ...prev,
                messages: prev.messages.map((m) =>
                  m.id === message.id ? { ...m, status } : m
                ),
              }
            : prev
        )
      setStatus("sending")
      try {
        await api.chats.sendMessage.mutate({
          chatId,
          id: message.id,
          body: message.body,
        })
        setStatus("sent")
      } catch {
        setStatus("failed")
      }
    },
    [chatId]
  )

  const send = React.useCallback(
    (body: string) => {
      const message: ChatMessage = {
        id: ulid(),
        senderId: myUserId,
        body,
        createdAt: new Date().toISOString(),
        status: "sending",
      }
      setState((prev) =>
        prev.status === "ready"
          ? { ...prev, messages: [...prev.messages, message] }
          : prev
      )
      deliver(message)
    },
    [myUserId, deliver]
  )

  return { state, loadingOlder, loadOlder, send, retry: deliver }
}

/**
 * Folds the newest page into what's shown: new server messages are added,
 * ours that the server now has become "sent" (with the server's time), and
 * ones still sending or failed stay at the end. If the page shares nothing
 * with what's shown (a long gap), it replaces it.
 */
function mergeLatest(
  prev: State,
  latest: ServerMessage[],
  nextCursor: string | null
): State {
  const fresh = oldestFirst(latest)
  if (prev.status !== "ready") {
    return { status: "ready", messages: fresh, olderCursor: nextCursor }
  }

  const freshIds = new Set(fresh.map((m) => m.id))
  const shown = prev.messages.filter((m) => !freshIds.has(m.id))
  const confirmed = shown.filter((m) => m.status === "sent")
  const unconfirmed = shown.filter((m) => m.status !== "sent")
  const overlaps = prev.messages.some(
    (m) => m.status === "sent" && freshIds.has(m.id)
  )

  if (!overlaps && confirmed.length > 0 && nextCursor) {
    return {
      status: "ready",
      messages: [...fresh, ...unconfirmed],
      olderCursor: nextCursor,
    }
  }
  return {
    ...prev,
    messages: [...confirmed, ...fresh, ...unconfirmed],
  }
}
