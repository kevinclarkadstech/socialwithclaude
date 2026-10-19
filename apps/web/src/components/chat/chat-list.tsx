import * as React from "react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { UserAvatar } from "@/components/user-avatar"
import { displayName, type PersonSummary } from "@/lib/people"
import { api, apiErrorMessage } from "@/lib/api"
import { shortTimeAgo } from "@/lib/time"

type Chat = Awaited<
  ReturnType<typeof api.chats.getMyChats.query>
>["items"][number]

/** What opening a chat needs. */
export type OpenChat = { id: string; otherMember: PersonSummary }

/** The inbox is refreshed this often while it's shown. */
const POLL_MS = 10_000

/** The inbox: chats with the newest message first, and starting a new one. */
export function ChatList({
  myUserId,
  onOpen,
  className,
}: {
  myUserId: string
  onOpen: (chat: OpenChat) => void
  className?: string
}) {
  const [chats, setChats] = React.useState<Chat[] | null>(null)
  const [error, setError] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // The first page is plenty for now; older chats come with paging.
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
    }, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <NewChat onOpen={onOpen} />
      {error && !chats && (
        <p className="text-center text-sm text-muted-foreground">
          Couldn&apos;t load your messages.
        </p>
      )}
      {chats?.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No messages yet.
        </p>
      )}
      {chats && chats.length > 0 && (
        <Card size="sm" className="gap-0 py-1">
          <ul>
            {chats.map((chat) => (
              <li key={chat.id}>
                <ChatRow
                  chat={chat}
                  mine={chat.lastMessage.senderId === myUserId}
                  onOpen={onOpen}
                />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function ChatRow({
  chat,
  mine,
  onOpen,
}: {
  chat: Chat
  mine: boolean
  onOpen: (chat: OpenChat) => void
}) {
  const unread = chat.unreadCount > 0
  return (
    <button
      type="button"
      onClick={() => onOpen({ id: chat.id, otherMember: chat.otherMember })}
      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
    >
      <UserAvatar person={chat.otherMember} size="lg" />
      <div className="flex min-w-0 flex-1 flex-col text-sm">
        <div className="flex items-baseline gap-2">
          <span className={cn("truncate", unread && "font-semibold")}>
            {displayName(chat.otherMember)}
          </span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {shortTimeAgo(chat.lastMessage.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "truncate",
              unread ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            {mine && "You: "}
            {chat.lastMessage.body}
          </span>
          {unread && (
            <span
              className="ml-auto shrink-0 rounded-full bg-primary px-1.5 text-xs leading-5 font-medium text-primary-foreground"
              aria-label={`${chat.unreadCount} unread`}
            >
              {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

/** Start (or reopen) a chat by username. */
function NewChat({ onOpen }: { onOpen: (chat: OpenChat) => void }) {
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const username = String(new FormData(form).get("username") ?? "")
      .trim()
      .replace(/^@/, "")
    if (!username) return

    setError(null)
    setPending(true)
    try {
      const [chat, profile] = await Promise.all([
        api.chats.getOrCreateDirectChat.mutate({ username }),
        api.users.getUserProfile.query({ username }),
      ])
      form.reset()
      onOpen({ id: chat.id, otherMember: profile })
    } catch (err) {
      const message = apiErrorMessage(err)
      setError(
        message === "CANNOT_CHAT_WITH_SELF"
          ? "That's you."
          : message === "NOT_FOUND"
            ? `No one goes by @${username}.`
            : "Something went wrong. Please try again."
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field data-invalid={error ? true : undefined}>
        <div className="flex gap-2">
          <Input
            name="username"
            placeholder="New message to @username"
            aria-label="Username to message"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
          />
          <Button type="submit" variant="outline" disabled={pending}>
            Start
          </Button>
        </div>
        <FieldError>{error}</FieldError>
      </Field>
    </form>
  )
}
