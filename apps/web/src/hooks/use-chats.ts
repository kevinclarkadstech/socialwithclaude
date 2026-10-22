import * as React from "react"

import { api, apiErrorMessage } from "@/lib/api"
import type { PersonSummary } from "@/lib/people"
import type { ChatSummary } from "@/hooks/types"
import { usePolledCount } from "@/hooks/use-polled-count"

/** The inbox is refreshed this often while it's shown. */
const INBOX_POLL_MS = 10_000

/** What opening a chat needs. */
export type OpenChat = { id: string; otherMember: PersonSummary }

export type StartChatResult =
  | { ok: true; chat: OpenChat }
  | { ok: false; error: "self" | "not-found" | "failed" }

/**
 * Your inbox: chats with the newest message first (the first 50 for now),
 * refreshed every 10s while the page is visible. `chats` is null until the
 * first load; `error` is true when the last load failed.
 */
export function useChatInbox() {
  const [chats, setChats] = React.useState<ChatSummary[] | null>(null)
  const [error, setError] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const page = await api.chats.getMyChats.query({ limit: 50 })
        if (!cancelled) {
          setChats(page.items)
          setError(false)
        }
      } catch {
        if (!cancelled) setError(true)
      }
    }
    load()
    const timer = setInterval(() => {
      if (!document.hidden) load()
    }, INBOX_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  return { chats, error }
}

/**
 * Opens your 1:1 chat with `username`, starting it if needed. Pass `person`
 * when you already have their profile; otherwise it's looked up.
 */
export function useStartChat() {
  return React.useCallback(
    async (
      username: string,
      person?: PersonSummary
    ): Promise<StartChatResult> => {
      try {
        const [chat, otherMember] = await Promise.all([
          api.chats.getOrCreateDirectChat.mutate({ username }),
          person ?? api.users.getUserProfile.query({ username }),
        ])
        return { ok: true, chat: { id: chat.id, otherMember } }
      } catch (err) {
        switch (apiErrorMessage(err)) {
          case "CANNOT_CHAT_WITH_SELF":
            return { ok: false, error: "self" }
          case "NOT_FOUND":
            return { ok: false, error: "not-found" }
          default:
            return { ok: false, error: "failed" }
        }
      }
    },
    []
  )
}

/** Unread messages across your chats, for the Messages tab badge. */
export function useUnreadMessageCount() {
  return usePolledCount(api.chats.getMyUnreadCount.query)
}
