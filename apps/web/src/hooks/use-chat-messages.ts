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

/** A change to one of our messages that the server may not show yet. */
type PendingChange = Pick<ChatMessage, "body" | "deleted" | "editedAt">

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
  // Edits and deletes in flight, kept over polled pages until they settle so
  // a poll that started earlier can't briefly undo them.
  const pending = React.useRef(new Map<string, PendingChange>())

  React.useEffect(() => {
    let cancelled = false
    // Newest message from someone else that's been marked read.
    let lastReadId: string | null = null

    async function fetchLatest(first: boolean) {
      try {
        const page = await api.chats.getMessages.query({ chatId })
        if (cancelled) return
        setState((prev) =>
          withPending(
            mergeLatest(prev, page.items, page.nextCursor),
            pending.current
          )
        )

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
      // Only unsent messages are delivered, and those always have a body.
      if (message.body === null) return
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
        deleted: false,
        editedAt: null,
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

  /** Shows `change` now; rejects (and undoes it) if `request` fails. */
  const applyChange = React.useCallback(
    async (
      message: ChatMessage,
      change: PendingChange,
      request: () => Promise<unknown>
    ) => {
      const patch = (values: PendingChange) =>
        setState((prev) =>
          prev.status === "ready"
            ? {
                ...prev,
                messages: prev.messages.map((m) =>
                  m.id === message.id ? { ...m, ...values } : m
                ),
              }
            : prev
        )
      pending.current.set(message.id, change)
      patch(change)
      try {
        await request()
      } catch (err) {
        patch({
          body: message.body,
          deleted: message.deleted,
          editedAt: message.editedAt,
        })
        throw err
      } finally {
        if (pending.current.get(message.id) === change) {
          pending.current.delete(message.id)
        }
      }
    },
    []
  )

  /** Changes the text of one of our messages; rejects if it fails. */
  const edit = React.useCallback(
    (message: ChatMessage, body: string) =>
      applyChange(
        message,
        { body, deleted: false, editedAt: new Date().toISOString() },
        () => api.chats.editMessage.mutate({ id: message.id, body })
      ),
    [applyChange]
  )

  /** Deletes one of our messages for everyone; rejects if it fails. */
  const remove = React.useCallback(
    (message: ChatMessage) =>
      applyChange(message, { body: null, deleted: true, editedAt: null }, () =>
        api.chats.deleteMessage.mutate({ id: message.id })
      ),
    [applyChange]
  )

  return { state, loadingOlder, loadOlder, send, retry: deliver, edit, remove }
}

/** Puts changes still in flight over what the server returned. */
function withPending(state: State, changes: Map<string, PendingChange>): State {
  if (state.status !== "ready" || changes.size === 0) return state
  return {
    ...state,
    messages: state.messages.map((m) => {
      const change = changes.get(m.id)
      return change ? { ...m, ...change } : m
    }),
  }
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
